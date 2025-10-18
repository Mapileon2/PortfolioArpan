/**
 * Run Schema Validation Analysis
 */

const SchemaValidator = require('./analyzers/schema-validator');
const path = require('path');
const fs = require('fs').promises;

async function runSchemaValidation() {
    console.log('🔍 Starting Schema Validation Analysis...\n');

    // Setup infrastructure
    const infrastructure = {
        outputDir: path.join(__dirname, 'output'),
        logFile: path.join(__dirname, 'output', 'schema-validation.log'),
        
        async saveReport(filename, content, category = 'analysis') {
            const reportPath = path.join(this.outputDir, 'reports', `${filename}.md`);
            await fs.mkdir(path.dirname(reportPath), { recursive: true });
            await fs.writeFile(reportPath, content);
            return reportPath;
        }
    };

    // Ensure output directory exists
    await fs.mkdir(infrastructure.outputDir, { recursive: true });
    await fs.mkdir(path.join(infrastructure.outputDir, 'reports'), { recursive: true });

    try {
        // Initialize validator
        const validator = new SchemaValidator(infrastructure);

        // Run analysis
        const results = await validator.analyze();

        // Generate report
        const reportContent = await validator.generateSchemaValidationReport();
        const reportPath = await infrastructure.saveReport('schema-validation-analysis', reportContent);

        // Display summary
        console.log('📊 Schema Validation Results:');
        console.log(`   Critical Issues: ${results.critical.length}`);
        console.log(`   High Priority: ${results.high.length}`);
        console.log(`   Medium Priority: ${results.medium.length}`);
        console.log(`   Low Priority: ${results.low.length}`);
        console.log(`   Total Issues: ${validator.getAllFindings().length}\n`);

        console.log(`📄 Report saved to: ${reportPath}\n`);

        // Display top issues
        if (results.critical.length > 0) {
            console.log('🚨 Critical Schema Issues:');
            results.critical.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue.message}`);
                if (issue.details.file) {
                    console.log(`      File: ${issue.details.file}`);
                }
                if (issue.details.impact) {
                    console.log(`      Impact: ${issue.details.impact}`);
                }
                console.log('');
            });
        }

        if (results.high.length > 0) {
            console.log('⚠️  High Priority Schema Issues:');
            results.high.slice(0, 5).forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue.message}`);
                if (issue.details.file) {
                    console.log(`      File: ${issue.details.file}`);
                }
                if (issue.details.table) {
                    console.log(`      Table: ${issue.details.table}`);
                }
                console.log('');
            });
            
            if (results.high.length > 5) {
                console.log(`   ... and ${results.high.length - 5} more high priority issues\n`);
            }
        }

        // Display schema file summary
        const schemaFileFindings = validator.getAllFindings().filter(f => f.category === 'SCHEMA_FILE');
        if (schemaFileFindings.length > 0) {
            console.log('📋 Schema Files Analysis:');
            schemaFileFindings.forEach(finding => {
                if (finding.details.size) {
                    console.log(`   ✅ ${finding.details.file}: ${finding.details.tables} tables, ${finding.details.indexes} indexes`);
                } else {
                    console.log(`   ❌ ${finding.details.file}: ${finding.message}`);
                }
            });
            console.log('');
        }

        console.log('✅ Schema Validation Analysis completed successfully!');
        return results;

    } catch (error) {
        console.error('❌ Error during schema validation:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    runSchemaValidation()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runSchemaValidation;