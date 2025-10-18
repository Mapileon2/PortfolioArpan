/**
 * Run Failure Point Detection Analysis
 */

const FailurePointDetector = require('./analyzers/failure-point-detector');
const path = require('path');
const fs = require('fs').promises;

async function runFailureDetection() {
    console.log('🔍 Starting Failure Point Detection Analysis...\n');

    // Setup infrastructure
    const infrastructure = {
        outputDir: path.join(__dirname, 'output'),
        logFile: path.join(__dirname, 'output', 'failure-detection.log'),
        
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
        // Initialize detector
        const detector = new FailurePointDetector(infrastructure);

        // Run analysis
        const results = await detector.analyze();

        // Generate report
        const reportContent = await detector.generateFailurePointReport();
        const reportPath = await infrastructure.saveReport('failure-point-analysis', reportContent);

        // Display summary
        console.log('📊 Analysis Results Summary:');
        console.log(`   Critical Issues: ${results.critical.length}`);
        console.log(`   High Priority: ${results.high.length}`);
        console.log(`   Medium Priority: ${results.medium.length}`);
        console.log(`   Low Priority: ${results.low.length}`);
        console.log(`   Total Issues: ${detector.getAllFindings().length}\n`);

        console.log(`📄 Report saved to: ${reportPath}\n`);

        // Display top issues
        if (results.critical.length > 0) {
            console.log('🚨 Critical Issues:');
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
            console.log('⚠️  High Priority Issues:');
            results.high.slice(0, 5).forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue.message}`);
                if (issue.details.file) {
                    console.log(`      File: ${issue.details.file}`);
                }
                console.log('');
            });
            
            if (results.high.length > 5) {
                console.log(`   ... and ${results.high.length - 5} more high priority issues\n`);
            }
        }

        console.log('✅ Failure Point Detection Analysis completed successfully!');
        return results;

    } catch (error) {
        console.error('❌ Error during failure point detection:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    runFailureDetection()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runFailureDetection;