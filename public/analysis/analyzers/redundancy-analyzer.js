/**
 * Redundancy Analyzer
 * Identifies duplicate code patterns and consolidation opportunities
 */

const BaseAnalyzer = require('../base-analyzer');
const fs = require('fs').promises;
const path = require('path');

class RedundancyAnalyzer extends BaseAnalyzer {
    constructor(infrastructure) {
        super(infrastructure);
        this.duplicateThreshold = 0.8; // 80% similarity threshold
        this.minLineCount = 5; // Minimum lines to consider for duplication
        this.functionPatterns = {
            supabaseQueries: [
                /supabase\.from\(['"`]([^'"`]+)['"`]\)/g,
                /\.select\(['"`]?([^'"`\)]+)['"`]?\)/g,
                /\.insert\(/g,
                /\.update\(/g,
                /\.delete\(/g,
                /\.upsert\(/g
            ],
            apiCalls: [
                /fetch\(['"`]([^'"`]+)['"`]/g,
                /axios\.(get|post|put|delete)\(/g,
                /\.then\(/g,
                /\.catch\(/g
            ],
            cloudinaryOperations: [
                /cloudinary\.uploader\./g,
                /cloudinary\.url\(/g,
                /cloudinary\.image\(/g
            ],
            domManipulation: [
                /document\.getElementById\(/g,
                /document\.querySelector\(/g,
                /document\.createElement\(/g,
                /\.addEventListener\(/g,
                /\.innerHTML\s*=/g,
                /\.textContent\s*=/g
            ]
        };
    }

    async analyze() {
        await this.logProgress('Starting redundancy analysis...');

        try {
            // Analyze different types of redundancy
            await this.analyzeAPICallPatterns();
            await this.analyzeFunctionDuplication();
            await this.analyzeSupabaseQueryPatterns();
            await this.analyzeCloudinaryPatterns();
            await this.analyzeNamingInconsistencies();
            await this.identifyConsolidationOpportunities();

            await this.logProgress('Redundancy analysis completed');
            return this.categorizeFindings();

        } catch (error) {
            await this.logError('Error during redundancy analysis', error);
            throw error;
        }
    }

    async analyzeAPICallPatterns() {
        await this.logProgress('Analyzing API call patterns...');

        const files = await this.getAllJavaScriptFiles();
        const apiCallMap = new Map();
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const apiCalls = this.extractAPICallPatterns(content);
                
                for (const call of apiCalls) {
                    const key = this.normalizeAPICall(call);
                    if (!apiCallMap.has(key)) {
                        apiCallMap.set(key, []);
                    }
                    apiCallMap.get(key).push({
                        file,
                        call,
                        line: this.findLineNumber(content, call)
                    });
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // Identify duplicate API calls
        for (const [pattern, occurrences] of apiCallMap) {
            if (occurrences.length > 1) {
                await this.addFinding(
                    'MEDIUM',
                    'DUPLICATE_API_CALLS',
                    `Duplicate API call pattern found: ${pattern}`,
                    {
                        pattern,
                        occurrences: occurrences.length,
                        files: occurrences.map(o => o.file),
                        locations: occurrences,
                        impact: 'Code duplication increases maintenance burden',
                        recommendation: 'Create a shared utility function for this API call'
                    }
                );
            }
        }
    }

    extractAPICallPatterns(content) {
        const patterns = [];
        
        // Extract fetch calls
        const fetchMatches = content.match(/fetch\(['"`]([^'"`]+)['"`][^)]*\)/g);
        if (fetchMatches) {
            patterns.push(...fetchMatches);
        }
        
        // Extract axios calls
        const axiosMatches = content.match(/axios\.(get|post|put|delete)\([^)]+\)/g);
        if (axiosMatches) {
            patterns.push(...axiosMatches);
        }
        
        return patterns;
    }

    normalizeAPICall(call) {
        // Normalize API calls by removing variable parts
        return call
            .replace(/['"`][^'"`]*['"`]/g, '"URL"') // Replace URLs with placeholder
            .replace(/\$\{[^}]+\}/g, '${VAR}') // Replace template variables
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    async analyzeFunctionDuplication() {
        await this.logProgress('Analyzing function duplication...');

        const files = await this.getAllJavaScriptFiles();
        const functions = [];
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const fileFunctions = this.extractFunctions(content);
                
                for (const func of fileFunctions) {
                    functions.push({
                        ...func,
                        file
                    });
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // Compare functions for similarity
        for (let i = 0; i < functions.length; i++) {
            for (let j = i + 1; j < functions.length; j++) {
                const func1 = functions[i];
                const func2 = functions[j];
                
                if (func1.file !== func2.file) { // Only compare across different files
                    const similarity = this.calculateSimilarity(func1.body, func2.body);
                    
                    if (similarity > this.duplicateThreshold && func1.lines >= this.minLineCount) {
                        await this.addFinding(
                            'HIGH',
                            'DUPLICATE_FUNCTION',
                            `Similar functions found: ${func1.name} and ${func2.name}`,
                            {
                                function1: { name: func1.name, file: func1.file, lines: func1.lines },
                                function2: { name: func2.name, file: func2.file, lines: func2.lines },
                                similarity: Math.round(similarity * 100),
                                impact: 'Duplicate logic increases maintenance complexity',
                                recommendation: 'Extract common logic into a shared utility function'
                            }
                        );
                    }
                }
            }
        }
    }

    extractFunctions(content) {
        const functions = [];
        
        // Extract function declarations
        const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            const body = match[2].trim();
            const lines = body.split('\n').length;
            
            functions.push({
                name: match[1],
                body: this.normalizeCode(body),
                lines,
                raw: match[0]
            });
        }
        
        // Extract arrow functions
        const arrowRegex = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{([^{}]*(?:{[^{}]*}[^{}]*)*)}/g;
        
        while ((match = arrowRegex.exec(content)) !== null) {
            const body = match[2].trim();
            const lines = body.split('\n').length;
            
            functions.push({
                name: match[1],
                body: this.normalizeCode(body),
                lines,
                raw: match[0]
            });
        }
        
        return functions;
    }

    normalizeCode(code) {
        return code
            .replace(/\/\/.*$/gm, '') // Remove comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/['"`][^'"`]*['"`]/g, 'STRING') // Replace strings
            .replace(/\d+/g, 'NUMBER') // Replace numbers
            .trim();
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    async analyzeSupabaseQueryPatterns() {
        await this.logProgress('Analyzing Supabase query patterns...');

        const files = await this.getAllJavaScriptFiles();
        const queryPatterns = new Map();
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const queries = this.extractSupabaseQueries(content);
                
                for (const query of queries) {
                    const normalized = this.normalizeSupabaseQuery(query);
                    if (!queryPatterns.has(normalized)) {
                        queryPatterns.set(normalized, []);
                    }
                    queryPatterns.get(normalized).push({
                        file,
                        query,
                        line: this.findLineNumber(content, query)
                    });
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // Identify duplicate query patterns
        for (const [pattern, occurrences] of queryPatterns) {
            if (occurrences.length > 2) { // More than 2 occurrences
                await this.addFinding(
                    'MEDIUM',
                    'DUPLICATE_SUPABASE_QUERIES',
                    `Duplicate Supabase query pattern: ${pattern}`,
                    {
                        pattern,
                        occurrences: occurrences.length,
                        files: [...new Set(occurrences.map(o => o.file))],
                        locations: occurrences,
                        impact: 'Duplicate database queries increase maintenance complexity',
                        recommendation: 'Create a shared data access layer or hook for this query'
                    }
                );
            }
        }
    }

    extractSupabaseQueries(content) {
        const queries = [];
        
        // Extract supabase.from() chains
        const supabaseRegex = /supabase\.from\(['"`]([^'"`]+)['"`]\)[^;]*/g;
        let match;
        
        while ((match = supabaseRegex.exec(content)) !== null) {
            queries.push(match[0]);
        }
        
        return queries;
    }

    normalizeSupabaseQuery(query) {
        return query
            .replace(/['"`][^'"`]*['"`]/g, 'VALUE') // Replace string values
            .replace(/\d+/g, 'NUM') // Replace numbers
            .replace(/\$\{[^}]+\}/g, 'VAR') // Replace template variables
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    async analyzeCloudinaryPatterns() {
        await this.logProgress('Analyzing Cloudinary patterns...');

        const files = await this.getAllJavaScriptFiles();
        const cloudinaryPatterns = new Map();
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const operations = this.extractCloudinaryOperations(content);
                
                for (const operation of operations) {
                    const normalized = this.normalizeCloudinaryOperation(operation);
                    if (!cloudinaryPatterns.has(normalized)) {
                        cloudinaryPatterns.set(normalized, []);
                    }
                    cloudinaryPatterns.get(normalized).push({
                        file,
                        operation,
                        line: this.findLineNumber(content, operation)
                    });
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // Identify duplicate Cloudinary patterns
        for (const [pattern, occurrences] of cloudinaryPatterns) {
            if (occurrences.length > 1) {
                await this.addFinding(
                    'LOW',
                    'DUPLICATE_CLOUDINARY_OPERATIONS',
                    `Duplicate Cloudinary operation: ${pattern}`,
                    {
                        pattern,
                        occurrences: occurrences.length,
                        files: [...new Set(occurrences.map(o => o.file))],
                        locations: occurrences,
                        impact: 'Duplicate image operations could be centralized',
                        recommendation: 'Create a shared image service utility'
                    }
                );
            }
        }
    }

    extractCloudinaryOperations(content) {
        const operations = [];
        
        // Extract cloudinary operations
        const cloudinaryRegex = /cloudinary\.[^;]*/g;
        let match;
        
        while ((match = cloudinaryRegex.exec(content)) !== null) {
            operations.push(match[0]);
        }
        
        return operations;
    }

    normalizeCloudinaryOperation(operation) {
        return operation
            .replace(/['"`][^'"`]*['"`]/g, 'VALUE')
            .replace(/\{[^}]*\}/g, 'OPTIONS')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async analyzeNamingInconsistencies() {
        await this.logProgress('Analyzing naming inconsistencies...');

        const files = await this.getAllJavaScriptFiles();
        const namingPatterns = {
            camelCase: [],
            snake_case: [],
            kebab_case: [],
            PascalCase: []
        };
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const identifiers = this.extractIdentifiers(content);
                
                for (const identifier of identifiers) {
                    if (/^[a-z][a-zA-Z0-9]*$/.test(identifier)) {
                        namingPatterns.camelCase.push({ identifier, file });
                    } else if (/^[a-z][a-z0-9_]*$/.test(identifier)) {
                        namingPatterns.snake_case.push({ identifier, file });
                    } else if (/^[a-z][a-z0-9-]*$/.test(identifier)) {
                        namingPatterns.kebab_case.push({ identifier, file });
                    } else if (/^[A-Z][a-zA-Z0-9]*$/.test(identifier)) {
                        namingPatterns.PascalCase.push({ identifier, file });
                    }
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // Check for mixed naming conventions
        const usedConventions = Object.entries(namingPatterns)
            .filter(([_, items]) => items.length > 0)
            .map(([convention, _]) => convention);

        if (usedConventions.length > 2) {
            await this.addFinding(
                'LOW',
                'INCONSISTENT_NAMING',
                `Multiple naming conventions found: ${usedConventions.join(', ')}`,
                {
                    conventions: usedConventions,
                    counts: Object.fromEntries(
                        Object.entries(namingPatterns).map(([k, v]) => [k, v.length])
                    ),
                    impact: 'Inconsistent naming reduces code readability',
                    recommendation: 'Standardize on one naming convention (camelCase recommended for JavaScript)'
                }
            );
        }
    }

    extractIdentifiers(content) {
        const identifiers = new Set();
        
        // Extract variable names
        const varRegex = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;
        
        while ((match = varRegex.exec(content)) !== null) {
            identifiers.add(match[1]);
        }
        
        // Extract function names
        const funcRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        
        while ((match = funcRegex.exec(content)) !== null) {
            identifiers.add(match[1]);
        }
        
        return Array.from(identifiers);
    }

    async identifyConsolidationOpportunities() {
        await this.logProgress('Identifying consolidation opportunities...');

        // Suggest hook standardization
        const files = await this.getAllJavaScriptFiles();
        const dataOperations = new Set();
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                
                // Look for data fetching patterns
                if (content.includes('supabase.from') && content.includes('case_studies')) {
                    dataOperations.add('case_studies_fetch');
                }
                if (content.includes('supabase.from') && content.includes('carousel')) {
                    dataOperations.add('carousel_fetch');
                }
                if (content.includes('cloudinary.uploader')) {
                    dataOperations.add('image_upload');
                }
            } catch (error) {
                // Skip files that can't be read
            }
        }

        if (dataOperations.size > 0) {
            await this.addFinding(
                'MEDIUM',
                'HOOK_STANDARDIZATION_OPPORTUNITY',
                'Data operations could be standardized into hooks',
                {
                    operations: Array.from(dataOperations),
                    impact: 'Scattered data operations make code harder to maintain',
                    recommendation: 'Create standardized hooks: useFetchCaseStudy, useCreateCaseStudy, useImageUpload, etc.',
                    suggestedHooks: [
                        'useFetchCaseStudy(id)',
                        'useCreateCaseStudy()',
                        'useUpdateCaseStudy(id)',
                        'useDeleteCaseStudy(id)',
                        'useFetchCarousel()',
                        'useImageUpload()',
                        'useCloudinaryTransform()'
                    ]
                }
            );
        }

        // Suggest API endpoint consolidation
        const apiEndpoints = await this.analyzeAPIEndpoints();
        if (apiEndpoints.duplicates > 0) {
            await this.addFinding(
                'MEDIUM',
                'API_CONSOLIDATION_OPPORTUNITY',
                'API endpoints could be consolidated',
                {
                    duplicateEndpoints: apiEndpoints.duplicates,
                    totalEndpoints: apiEndpoints.total,
                    impact: 'Duplicate API logic increases maintenance burden',
                    recommendation: 'Consolidate similar API endpoints and create shared middleware'
                }
            );
        }
    }

    async analyzeAPIEndpoints() {
        try {
            const serverContent = await fs.readFile('server.js', 'utf8');
            const endpoints = this.extractAPIEndpoints(serverContent);
            
            const patterns = new Map();
            for (const endpoint of endpoints) {
                const pattern = this.normalizeEndpoint(endpoint);
                if (!patterns.has(pattern)) {
                    patterns.set(pattern, []);
                }
                patterns.get(pattern).push(endpoint);
            }
            
            const duplicates = Array.from(patterns.values())
                .filter(group => group.length > 1)
                .length;
            
            return {
                total: endpoints.length,
                duplicates,
                patterns: Array.from(patterns.keys())
            };
        } catch (error) {
            return { total: 0, duplicates: 0, patterns: [] };
        }
    }

    extractAPIEndpoints(content) {
        const endpoints = [];
        const endpointRegex = /app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g;
        let match;
        
        while ((match = endpointRegex.exec(content)) !== null) {
            endpoints.push({
                method: match[1].toUpperCase(),
                path: match[2]
            });
        }
        
        return endpoints;
    }

    normalizeEndpoint(endpoint) {
        return `${endpoint.method} ${endpoint.path.replace(/:\w+/g, ':param')}`;
    }

    findLineNumber(content, searchString) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchString)) {
                return i + 1;
            }
        }
        return 1;
    }

    async getAllJavaScriptFiles() {
        const files = [];
        
        // Add known JS files
        const knownFiles = [
            'server.js',
            'js/supabase-client.js',
            'js/cloudinary-service.js',
            'js/cloudinary-config.js',
            'js/saas-case-study-service.js',
            'js/working-supabase-client.js',
            'js/working-upload-service.js'
        ];

        for (const file of knownFiles) {
            try {
                await fs.access(file);
                files.push(file);
            } catch (error) {
                // File doesn't exist
            }
        }

        // Add API files
        try {
            const apiFiles = await fs.readdir('api');
            for (const file of apiFiles) {
                if (file.endsWith('.js')) {
                    files.push(path.join('api', file));
                }
            }
        } catch (error) {
            // API directory doesn't exist
        }

        return files;
    }

    async generateRedundancyReport() {
        await this.logProgress('Generating redundancy analysis report...');

        const categorized = this.categorizeFindings();
        const report = this.reporter.clear();

        // Executive Summary
        report.addSection('Executive Summary', 
            `Redundancy analysis identified ${this.findings.length} opportunities for code consolidation. ` +
            `High priority: ${categorized.high.length}, ` +
            `Medium priority: ${categorized.medium.length}, ` +
            `Low priority: ${categorized.low.length}.`
        );

        // High Priority Consolidation Opportunities
        if (categorized.high.length > 0) {
            const highItems = categorized.high.map(f => ({
                title: f.message,
                content: f.details.impact || 'High priority consolidation opportunity',
                details: [
                    `Files affected: ${f.details.files ? f.details.files.length : 'Multiple'}`,
                    `Occurrences: ${f.details.occurrences || 'Multiple'}`,
                    `Recommendation: ${f.details.recommendation || 'Review and consolidate'}`
                ]
            }));
            report.addSection('High Priority Consolidation Opportunities', highItems);
        }

        // Medium Priority Opportunities
        if (categorized.medium.length > 0) {
            const mediumItems = categorized.medium.map(f => ({
                title: f.message,
                content: f.details.impact || 'Medium priority consolidation opportunity',
                details: [
                    `Pattern: ${f.details.pattern || 'N/A'}`,
                    `Occurrences: ${f.details.occurrences || 'Multiple'}`,
                    `Recommendation: ${f.details.recommendation || 'Consider consolidation'}`
                ]
            }));
            report.addSection('Medium Priority Opportunities', mediumItems);
        }

        // Consolidation Recommendations
        const recommendations = [
            'Create standardized data access hooks (useFetchCaseStudy, useCreateCaseStudy, etc.)',
            'Implement shared utility functions for common API calls',
            'Consolidate duplicate Supabase query patterns',
            'Create a centralized image service for Cloudinary operations',
            'Standardize naming conventions across the codebase',
            'Remove duplicate API endpoints and create shared middleware',
            'Extract common validation logic into reusable functions',
            'Create shared error handling utilities'
        ];

        report.addList('Key Consolidation Recommendations', recommendations);

        // Summary by Category
        const categoryStats = {};
        for (const finding of this.findings) {
            categoryStats[finding.category] = (categoryStats[finding.category] || 0) + 1;
        }

        const categoryRows = Object.entries(categoryStats).map(([category, count]) => [
            category,
            count.toString(),
            this.getFindingsBySeverity('HIGH').filter(f => f.category === category).length.toString(),
            this.getFindingsBySeverity('MEDIUM').filter(f => f.category === category).length.toString()
        ]);

        report.addTable('Redundancy by Category', 
            ['Category', 'Total', 'High', 'Medium'], 
            categoryRows
        );

        return report.generate('Redundancy Analysis Report');
    }
}

module.exports = RedundancyAnalyzer;