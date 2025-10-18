/**
 * Schema Validator
 * Validates database schema consistency and structure
 */

const BaseAnalyzer = require('../base-analyzer');
const fs = require('fs').promises;
const path = require('path');

class SchemaValidator extends BaseAnalyzer {
    constructor(infrastructure) {
        super(infrastructure);
        this.expectedSchema = {
            tables: {
                // Core tables that should exist
                'case_studies': {
                    required: true,
                    columns: {
                        'id': { type: 'UUID', nullable: false, primary: true },
                        'project_title': { type: 'TEXT', nullable: false },
                        'project_description': { type: 'TEXT', nullable: true },
                        'project_image_url': { type: 'TEXT', nullable: true },
                        'sections': { type: 'JSONB', nullable: true },
                        'status': { type: 'TEXT', nullable: true, default: 'draft' },
                        'featured': { type: 'BOOLEAN', nullable: true, default: false },
                        'created_at': { type: 'TIMESTAMPTZ', nullable: true },
                        'updated_at': { type: 'TIMESTAMPTZ', nullable: true }
                    },
                    indexes: ['idx_case_studies_status', 'idx_case_studies_featured'],
                    constraints: ['case_studies_status_check']
                },
                'carousel_images': {
                    required: true,
                    columns: {
                        'id': { type: 'UUID', nullable: false, primary: true },
                        'title': { type: 'TEXT', nullable: true },
                        'description': { type: 'TEXT', nullable: true },
                        'url': { type: 'TEXT', nullable: false },
                        'order_index': { type: 'INTEGER', nullable: true, default: 0 },
                        'status': { type: 'TEXT', nullable: true, default: 'active' },
                        'created_at': { type: 'TIMESTAMPTZ', nullable: true },
                        'updated_at': { type: 'TIMESTAMPTZ', nullable: true }
                    },
                    indexes: ['idx_carousel_images_status', 'idx_carousel_images_order'],
                    constraints: ['carousel_images_status_check']
                },
                'user_profiles': {
                    required: true,
                    columns: {
                        'id': { type: 'UUID', nullable: false, primary: true },
                        'email': { type: 'TEXT', nullable: false, unique: true },
                        'name': { type: 'TEXT', nullable: true },
                        'role': { type: 'TEXT', nullable: true, default: 'viewer' },
                        'created_at': { type: 'TIMESTAMPTZ', nullable: true },
                        'updated_at': { type: 'TIMESTAMPTZ', nullable: true }
                    },
                    indexes: ['idx_user_profiles_email', 'idx_user_profiles_role'],
                    constraints: ['user_profiles_role_check']
                }
            },
            foreignKeys: {
                'case_studies_created_by_fkey': {
                    table: 'case_studies',
                    column: 'created_by',
                    referencedTable: 'auth.users',
                    referencedColumn: 'id'
                },
                'carousel_images_created_by_fkey': {
                    table: 'carousel_images',
                    column: 'created_by',
                    referencedTable: 'auth.users',
                    referencedColumn: 'id'
                }
            },
            rlsPolicies: {
                'case_studies': [
                    'Anyone can view published case studies',
                    'Admins can manage case studies'
                ],
                'carousel_images': [
                    'Anyone can view active carousel images',
                    'Admins can manage carousel images'
                ],
                'user_profiles': [
                    'Users can view their own profile',
                    'Admins can view all profiles'
                ]
            }
        };
        
        this.schemaFiles = [
            'supabase-schema.sql',
            'supabase-schema-complete.sql',
            'supabase-schema-fixed.sql'
        ];
    }

    async analyze() {
        await this.logProgress('Starting schema validation...');

        try {
            // Analyze schema files
            await this.analyzeSchemaFiles();
            
            // Validate table structures
            await this.validateTableStructures();
            
            // Validate relationships and constraints
            await this.validateRelationshipsAndConstraints();
            
            // Validate RLS policies
            await this.validateRLSPolicies();
            
            // Check for schema inconsistencies
            await this.checkSchemaInconsistencies();

            await this.logProgress('Schema validation completed');
            return this.categorizeFindings();

        } catch (error) {
            await this.logError('Error during schema validation', error);
            throw error;
        }
    }

    async analyzeSchemaFiles() {
        await this.logProgress('Analyzing schema files...');

        const foundSchemas = [];
        
        for (const schemaFile of this.schemaFiles) {
            try {
                const content = await fs.readFile(schemaFile, 'utf8');
                foundSchemas.push({
                    file: schemaFile,
                    content,
                    size: content.length,
                    tables: this.extractTablesFromSQL(content),
                    indexes: this.extractIndexesFromSQL(content),
                    policies: this.extractPoliciesFromSQL(content),
                    functions: this.extractFunctionsFromSQL(content)
                });

                await this.addFinding(
                    'LOW',
                    'SCHEMA_FILE',
                    `Found schema file: ${schemaFile}`,
                    {
                        file: schemaFile,
                        size: content.length,
                        tables: this.extractTablesFromSQL(content).length,
                        indexes: this.extractIndexesFromSQL(content).length
                    }
                );

            } catch (error) {
                if (error.code === 'ENOENT') {
                    await this.addFinding(
                        'MEDIUM',
                        'SCHEMA_FILE',
                        `Schema file not found: ${schemaFile}`,
                        { file: schemaFile, error: 'File not found' }
                    );
                } else {
                    await this.addFinding(
                        'HIGH',
                        'SCHEMA_FILE',
                        `Error reading schema file: ${schemaFile}`,
                        { file: schemaFile, error: error.message }
                    );
                }
            }
        }

        if (foundSchemas.length === 0) {
            await this.addFinding(
                'CRITICAL',
                'SCHEMA_FILE',
                'No schema files found',
                { 
                    issue: 'No database schema files detected',
                    impact: 'Cannot validate database structure',
                    recommendation: 'Create or locate database schema files'
                }
            );
        } else {
            // Compare schemas for consistency
            await this.compareSchemas(foundSchemas);
        }

        return foundSchemas;
    }

    extractTablesFromSQL(content) {
        const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(/gi;
        const matches = [];
        let match;
        
        while ((match = tableRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        
        return matches;
    }

    extractIndexesFromSQL(content) {
        const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(\w+)/gi;
        const matches = [];
        let match;
        
        while ((match = indexRegex.exec(content)) !== null) {
            matches.push({
                name: match[1],
                table: match[2]
            });
        }
        
        return matches;
    }

    extractPoliciesFromSQL(content) {
        const policyRegex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(\w+)/gi;
        const matches = [];
        let match;
        
        while ((match = policyRegex.exec(content)) !== null) {
            matches.push({
                name: match[1],
                table: match[2]
            });
        }
        
        return matches;
    }

    extractFunctionsFromSQL(content) {
        const functionRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:\w+\.)?(\w+)\s*\(/gi;
        const matches = [];
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        
        return matches;
    }

    async compareSchemas(schemas) {
        await this.logProgress('Comparing schema files for consistency...');

        if (schemas.length < 2) return;

        const baseSchema = schemas[0];
        
        for (let i = 1; i < schemas.length; i++) {
            const compareSchema = schemas[i];
            
            // Compare tables
            const baseTables = new Set(baseSchema.tables);
            const compareTables = new Set(compareSchema.tables);
            
            const missingInBase = [...compareTables].filter(t => !baseTables.has(t));
            const missingInCompare = [...baseTables].filter(t => !compareTables.has(t));
            
            if (missingInBase.length > 0) {
                await this.addFinding(
                    'MEDIUM',
                    'SCHEMA_INCONSISTENCY',
                    `Tables in ${compareSchema.file} but not in ${baseSchema.file}`,
                    {
                        baseFile: baseSchema.file,
                        compareFile: compareSchema.file,
                        missingTables: missingInBase,
                        impact: 'Schema files are inconsistent'
                    }
                );
            }
            
            if (missingInCompare.length > 0) {
                await this.addFinding(
                    'MEDIUM',
                    'SCHEMA_INCONSISTENCY',
                    `Tables in ${baseSchema.file} but not in ${compareSchema.file}`,
                    {
                        baseFile: baseSchema.file,
                        compareFile: compareSchema.file,
                        missingTables: missingInCompare,
                        impact: 'Schema files are inconsistent'
                    }
                );
            }
        }
    }

    async validateTableStructures() {
        await this.logProgress('Validating table structures...');

        // Check if expected tables exist in schema files
        for (const [tableName, tableSpec] of Object.entries(this.expectedSchema.tables)) {
            let foundInAnySchema = false;
            
            for (const schemaFile of this.schemaFiles) {
                try {
                    const content = await fs.readFile(schemaFile, 'utf8');
                    const tables = this.extractTablesFromSQL(content);
                    
                    if (tables.includes(tableName)) {
                        foundInAnySchema = true;
                        
                        // Validate table structure
                        await this.validateTableColumns(schemaFile, tableName, tableSpec, content);
                        await this.validateTableIndexes(schemaFile, tableName, tableSpec, content);
                        break;
                    }
                } catch (error) {
                    // Skip if file doesn't exist
                }
            }
            
            if (!foundInAnySchema && tableSpec.required) {
                await this.addFinding(
                    'HIGH',
                    'MISSING_TABLE',
                    `Required table '${tableName}' not found in any schema`,
                    {
                        table: tableName,
                        required: tableSpec.required,
                        impact: 'Core functionality may not work',
                        recommendation: `Create ${tableName} table with required columns`
                    }
                );
            }
        }
    }

    async validateTableColumns(schemaFile, tableName, tableSpec, content) {
        // Extract column definitions from CREATE TABLE statement
        const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${tableName}\\s*\\(([^;]+)\\)`, 'is');
        const match = content.match(tableRegex);
        
        if (!match) return;
        
        const tableDefinition = match[1];
        const foundColumns = this.parseColumnDefinitions(tableDefinition);
        
        // Check for missing required columns
        for (const [columnName, columnSpec] of Object.entries(tableSpec.columns)) {
            const foundColumn = foundColumns.find(col => col.name.toLowerCase() === columnName.toLowerCase());
            
            if (!foundColumn) {
                await this.addFinding(
                    'HIGH',
                    'MISSING_COLUMN',
                    `Missing column '${columnName}' in table '${tableName}'`,
                    {
                        table: tableName,
                        column: columnName,
                        file: schemaFile,
                        expectedType: columnSpec.type,
                        impact: 'Data operations may fail'
                    }
                );
            } else {
                // Validate column type (basic validation)
                if (!this.isCompatibleType(foundColumn.type, columnSpec.type)) {
                    await this.addFinding(
                        'MEDIUM',
                        'COLUMN_TYPE_MISMATCH',
                        `Column '${columnName}' in table '${tableName}' has unexpected type`,
                        {
                            table: tableName,
                            column: columnName,
                            file: schemaFile,
                            foundType: foundColumn.type,
                            expectedType: columnSpec.type,
                            impact: 'Type mismatch may cause data issues'
                        }
                    );
                }
            }
        }
    }

    parseColumnDefinitions(tableDefinition) {
        const columns = [];
        const lines = tableDefinition.split(',');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('CONSTRAINT') && !trimmed.startsWith('PRIMARY KEY') && !trimmed.startsWith('FOREIGN KEY')) {
                const parts = trimmed.split(/\s+/);
                if (parts.length >= 2) {
                    columns.push({
                        name: parts[0],
                        type: parts[1],
                        definition: trimmed
                    });
                }
            }
        }
        
        return columns;
    }

    isCompatibleType(foundType, expectedType) {
        const typeMap = {
            'UUID': ['UUID'],
            'TEXT': ['TEXT', 'VARCHAR', 'CHARACTER VARYING'],
            'INTEGER': ['INTEGER', 'INT', 'INT4'],
            'BOOLEAN': ['BOOLEAN', 'BOOL'],
            'TIMESTAMPTZ': ['TIMESTAMP WITH TIME ZONE', 'TIMESTAMPTZ'],
            'JSONB': ['JSONB', 'JSON']
        };
        
        const compatibleTypes = typeMap[expectedType] || [expectedType];
        return compatibleTypes.some(type => 
            foundType.toUpperCase().includes(type.toUpperCase())
        );
    }

    async validateTableIndexes(schemaFile, tableName, tableSpec, content) {
        const indexes = this.extractIndexesFromSQL(content);
        const tableIndexes = indexes.filter(idx => idx.table.toLowerCase() === tableName.toLowerCase());
        
        if (tableSpec.indexes) {
            for (const expectedIndex of tableSpec.indexes) {
                const found = tableIndexes.find(idx => 
                    idx.name.toLowerCase().includes(expectedIndex.toLowerCase())
                );
                
                if (!found) {
                    await this.addFinding(
                        'MEDIUM',
                        'MISSING_INDEX',
                        `Missing index '${expectedIndex}' on table '${tableName}'`,
                        {
                            table: tableName,
                            index: expectedIndex,
                            file: schemaFile,
                            impact: 'Query performance may be degraded',
                            recommendation: `Create index ${expectedIndex} on table ${tableName}`
                        }
                    );
                }
            }
        }
    }

    async validateRelationshipsAndConstraints() {
        await this.logProgress('Validating relationships and constraints...');

        for (const schemaFile of this.schemaFiles) {
            try {
                const content = await fs.readFile(schemaFile, 'utf8');
                
                // Check for foreign key constraints
                await this.validateForeignKeys(schemaFile, content);
                
                // Check for check constraints
                await this.validateCheckConstraints(schemaFile, content);
                
                // Check for unique constraints
                await this.validateUniqueConstraints(schemaFile, content);
                
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    await this.addFinding(
                        'MEDIUM',
                        'SCHEMA_VALIDATION_ERROR',
                        `Error validating relationships in ${schemaFile}`,
                        { file: schemaFile, error: error.message }
                    );
                }
            }
        }
    }

    async validateForeignKeys(schemaFile, content) {
        const foreignKeyRegex = /REFERENCES\s+(\w+(?:\.\w+)?)\s*\(\s*(\w+)\s*\)/gi;
        const matches = [];
        let match;
        
        while ((match = foreignKeyRegex.exec(content)) !== null) {
            matches.push({
                referencedTable: match[1],
                referencedColumn: match[2]
            });
        }
        
        // Check if referenced tables exist
        const tables = this.extractTablesFromSQL(content);
        
        for (const fk of matches) {
            const tableName = fk.referencedTable.split('.').pop(); // Remove schema prefix if present
            
            if (!tables.includes(tableName) && !fk.referencedTable.includes('auth.')) {
                await this.addFinding(
                    'HIGH',
                    'BROKEN_FOREIGN_KEY',
                    `Foreign key references non-existent table '${fk.referencedTable}'`,
                    {
                        file: schemaFile,
                        referencedTable: fk.referencedTable,
                        referencedColumn: fk.referencedColumn,
                        impact: 'Referential integrity may be compromised',
                        recommendation: `Ensure table ${fk.referencedTable} exists or fix the reference`
                    }
                );
            }
        }
    }

    async validateCheckConstraints(schemaFile, content) {
        const checkConstraintRegex = /CHECK\s*\([^)]+\)/gi;
        const matches = content.match(checkConstraintRegex) || [];
        
        if (matches.length === 0) {
            await this.addFinding(
                'LOW',
                'MISSING_CHECK_CONSTRAINTS',
                `No CHECK constraints found in ${schemaFile}`,
                {
                    file: schemaFile,
                    issue: 'No data validation constraints',
                    impact: 'Invalid data may be inserted',
                    recommendation: 'Consider adding CHECK constraints for data validation'
                }
            );
        }
    }

    async validateUniqueConstraints(schemaFile, content) {
        const uniqueRegex = /UNIQUE\s*\([^)]+\)|(\w+)\s+[^,\n]*UNIQUE/gi;
        const matches = content.match(uniqueRegex) || [];
        
        // Check if email fields have unique constraints
        if (content.includes('email') && !content.toLowerCase().includes('email') + ' unique') {
            const emailUniqueFound = matches.some(match => 
                match.toLowerCase().includes('email')
            );
            
            if (!emailUniqueFound) {
                await this.addFinding(
                    'MEDIUM',
                    'MISSING_UNIQUE_CONSTRAINT',
                    `Email field should have UNIQUE constraint in ${schemaFile}`,
                    {
                        file: schemaFile,
                        field: 'email',
                        impact: 'Duplicate emails may be allowed',
                        recommendation: 'Add UNIQUE constraint to email columns'
                    }
                );
            }
        }
    }

    async validateRLSPolicies() {
        await this.logProgress('Validating RLS policies...');

        for (const schemaFile of this.schemaFiles) {
            try {
                const content = await fs.readFile(schemaFile, 'utf8');
                
                // Check if RLS is enabled
                await this.validateRLSEnabled(schemaFile, content);
                
                // Check for required policies
                await this.validateRequiredPolicies(schemaFile, content);
                
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    await this.addFinding(
                        'MEDIUM',
                        'RLS_VALIDATION_ERROR',
                        `Error validating RLS policies in ${schemaFile}`,
                        { file: schemaFile, error: error.message }
                    );
                }
            }
        }
    }

    async validateRLSEnabled(schemaFile, content) {
        const tables = this.extractTablesFromSQL(content);
        const rlsEnabledRegex = /ALTER\s+TABLE\s+(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
        const rlsEnabledTables = [];
        let match;
        
        while ((match = rlsEnabledRegex.exec(content)) !== null) {
            rlsEnabledTables.push(match[1]);
        }
        
        for (const table of tables) {
            if (this.expectedSchema.tables[table] && !rlsEnabledTables.includes(table)) {
                await this.addFinding(
                    'HIGH',
                    'RLS_NOT_ENABLED',
                    `RLS not enabled for table '${table}'`,
                    {
                        table,
                        file: schemaFile,
                        impact: 'Security vulnerability - unrestricted data access',
                        recommendation: `Enable RLS for table ${table}`
                    }
                );
            }
        }
    }

    async validateRequiredPolicies(schemaFile, content) {
        const policies = this.extractPoliciesFromSQL(content);
        
        for (const [tableName, expectedPolicies] of Object.entries(this.expectedSchema.rlsPolicies)) {
            const tablePolicies = policies.filter(p => p.table.toLowerCase() === tableName.toLowerCase());
            
            if (tablePolicies.length === 0) {
                await this.addFinding(
                    'HIGH',
                    'MISSING_RLS_POLICIES',
                    `No RLS policies found for table '${tableName}'`,
                    {
                        table: tableName,
                        file: schemaFile,
                        impact: 'Table may be inaccessible or insecure',
                        recommendation: `Create RLS policies for table ${tableName}`
                    }
                );
            } else {
                // Check for basic read/write policies
                const hasReadPolicy = tablePolicies.some(p => 
                    p.name.toLowerCase().includes('view') || 
                    p.name.toLowerCase().includes('select') ||
                    p.name.toLowerCase().includes('read')
                );
                
                const hasWritePolicy = tablePolicies.some(p => 
                    p.name.toLowerCase().includes('manage') || 
                    p.name.toLowerCase().includes('update') ||
                    p.name.toLowerCase().includes('insert') ||
                    p.name.toLowerCase().includes('write')
                );
                
                if (!hasReadPolicy) {
                    await this.addFinding(
                        'MEDIUM',
                        'MISSING_READ_POLICY',
                        `No read policy found for table '${tableName}'`,
                        {
                            table: tableName,
                            file: schemaFile,
                            impact: 'Users may not be able to read data',
                            recommendation: `Add SELECT policy for table ${tableName}`
                        }
                    );
                }
                
                if (!hasWritePolicy) {
                    await this.addFinding(
                        'MEDIUM',
                        'MISSING_WRITE_POLICY',
                        `No write policy found for table '${tableName}'`,
                        {
                            table: tableName,
                            file: schemaFile,
                            impact: 'Users may not be able to modify data',
                            recommendation: `Add INSERT/UPDATE/DELETE policies for table ${tableName}`
                        }
                    );
                }
            }
        }
    }

    async checkSchemaInconsistencies() {
        await this.logProgress('Checking for schema inconsistencies...');

        // Check for common schema issues
        await this.checkNamingConsistency();
        await this.checkTimestampConsistency();
        await this.checkIdConsistency();
    }

    async checkNamingConsistency() {
        for (const schemaFile of this.schemaFiles) {
            try {
                const content = await fs.readFile(schemaFile, 'utf8');
                
                // Check for inconsistent naming patterns
                const tables = this.extractTablesFromSQL(content);
                const snakeCaseTables = tables.filter(t => t.includes('_'));
                const camelCaseTables = tables.filter(t => /[A-Z]/.test(t) && !t.includes('_'));
                
                if (snakeCaseTables.length > 0 && camelCaseTables.length > 0) {
                    await this.addFinding(
                        'LOW',
                        'INCONSISTENT_NAMING',
                        `Mixed naming conventions in ${schemaFile}`,
                        {
                            file: schemaFile,
                            snakeCaseTables,
                            camelCaseTables,
                            impact: 'Inconsistent code style',
                            recommendation: 'Use consistent naming convention (snake_case recommended for SQL)'
                        }
                    );
                }
                
            } catch (error) {
                // Skip if file doesn't exist
            }
        }
    }

    async checkTimestampConsistency() {
        for (const schemaFile of this.schemaFiles) {
            try {
                const content = await fs.readFile(schemaFile, 'utf8');
                
                // Check for tables without created_at/updated_at
                const tables = this.extractTablesFromSQL(content);
                
                for (const table of tables) {
                    const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}\\s*\\(([^;]+)\\)`, 'is');
                    const match = content.match(tableRegex);
                    
                    if (match) {
                        const tableDefinition = match[1];
                        const hasCreatedAt = tableDefinition.includes('created_at');
                        const hasUpdatedAt = tableDefinition.includes('updated_at');
                        
                        if (!hasCreatedAt) {
                            await this.addFinding(
                                'LOW',
                                'MISSING_TIMESTAMP',
                                `Table '${table}' missing created_at timestamp`,
                                {
                                    table,
                                    file: schemaFile,
                                    impact: 'Cannot track record creation time',
                                    recommendation: `Add created_at TIMESTAMPTZ DEFAULT NOW() to ${table}`
                                }
                            );
                        }
                        
                        if (!hasUpdatedAt) {
                            await this.addFinding(
                                'LOW',
                                'MISSING_TIMESTAMP',
                                `Table '${table}' missing updated_at timestamp`,
                                {
                                    table,
                                    file: schemaFile,
                                    impact: 'Cannot track record modification time',
                                    recommendation: `Add updated_at TIMESTAMPTZ DEFAULT NOW() to ${table}`
                                }
                            );
                        }
                    }
                }
                
            } catch (error) {
                // Skip if file doesn't exist
            }
        }
    }

    async checkIdConsistency() {
        for (const schemaFile of this.schemaFiles) {
            try {
                const content = await fs.readFile(schemaFile, 'utf8');
                
                // Check for tables without UUID primary keys
                const tables = this.extractTablesFromSQL(content);
                
                for (const table of tables) {
                    const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}\\s*\\(([^;]+)\\)`, 'is');
                    const match = content.match(tableRegex);
                    
                    if (match) {
                        const tableDefinition = match[1];
                        const hasUuidId = tableDefinition.includes('id UUID') || tableDefinition.includes('id uuid');
                        const hasIntegerId = tableDefinition.includes('id INTEGER') || tableDefinition.includes('id SERIAL');
                        
                        if (hasIntegerId && !hasUuidId) {
                            await this.addFinding(
                                'LOW',
                                'INCONSISTENT_ID_TYPE',
                                `Table '${table}' uses INTEGER id instead of UUID`,
                                {
                                    table,
                                    file: schemaFile,
                                    impact: 'Inconsistent ID types across tables',
                                    recommendation: `Consider using UUID for ${table}.id for consistency`
                                }
                            );
                        }
                    }
                }
                
            } catch (error) {
                // Skip if file doesn't exist
            }
        }
    }

    async generateSchemaValidationReport() {
        await this.logProgress('Generating schema validation report...');

        const categorized = this.categorizeFindings();
        const report = this.reporter.clear();

        // Executive Summary
        report.addSection('Executive Summary', 
            `Schema validation identified ${this.findings.length} issues across database schema files. ` +
            `Critical issues: ${categorized.critical.length}, ` +
            `High priority: ${categorized.high.length}, ` +
            `Medium priority: ${categorized.medium.length}, ` +
            `Low priority: ${categorized.low.length}.`
        );

        // Critical Issues
        if (categorized.critical.length > 0) {
            const criticalItems = categorized.critical.map(f => ({
                title: f.message,
                content: f.details.issue || 'Critical schema issue detected',
                details: [
                    `File: ${f.details.file || 'Unknown'}`,
                    `Impact: ${f.details.impact || 'Unknown'}`,
                    `Recommendation: ${f.details.recommendation || 'Review required'}`
                ]
            }));
            report.addSection('Critical Schema Issues', criticalItems);
        }

        // High Priority Issues
        if (categorized.high.length > 0) {
            const highItems = categorized.high.map(f => ({
                title: f.message,
                content: f.details.issue || 'High priority schema issue',
                details: [
                    `File: ${f.details.file || 'Unknown'}`,
                    `Table: ${f.details.table || 'N/A'}`,
                    `Impact: ${f.details.impact || 'Unknown'}`,
                    `Recommendation: ${f.details.recommendation || 'Review required'}`
                ]
            }));
            report.addSection('High Priority Issues', highItems);
        }

        // Schema File Analysis
        const schemaFileFindings = this.findings.filter(f => f.category === 'SCHEMA_FILE');
        if (schemaFileFindings.length > 0) {
            const schemaItems = schemaFileFindings.map(f => ({
                title: f.message,
                content: `File size: ${f.details.size || 'Unknown'} bytes`,
                details: [
                    `Tables: ${f.details.tables || 0}`,
                    `Indexes: ${f.details.indexes || 0}`
                ]
            }));
            report.addSection('Schema Files Found', schemaItems);
        }

        // Summary by Category
        const categoryStats = {};
        for (const finding of this.findings) {
            categoryStats[finding.category] = (categoryStats[finding.category] || 0) + 1;
        }

        const categoryRows = Object.entries(categoryStats).map(([category, count]) => [
            category,
            count.toString(),
            this.getFindingsBySeverity('CRITICAL').filter(f => f.category === category).length.toString(),
            this.getFindingsBySeverity('HIGH').filter(f => f.category === category).length.toString()
        ]);

        report.addTable('Issues by Category', 
            ['Category', 'Total', 'Critical', 'High'], 
            categoryRows
        );

        // Recommendations
        const recommendations = [
            'Ensure all required tables exist with proper structure',
            'Enable Row Level Security (RLS) on all tables',
            'Create appropriate RLS policies for data access control',
            'Add missing indexes for performance optimization',
            'Implement consistent naming conventions',
            'Add created_at and updated_at timestamps to all tables',
            'Validate foreign key relationships',
            'Add check constraints for data validation'
        ];

        report.addList('Key Recommendations', recommendations);

        return report.generate('Schema Validation Report');
    }
}

module.exports = SchemaValidator;