/**
 * Run Redundancy Analysis
 */

const RedundancyAnalyzer = require('./analyzers/redundancy-analyzer');
const path = require('path');
const fs = require('fs').promises;

async function runRedundancyAnalysis() {
    console.log('🔍 Starting Redundancy Analysis...\n');

    // Setup infrastructure
    const infrastructure = {
        outputDir: path.join(__dirname, 'output'),
        logFile: path.join(__dirname, 'output', 'redundancy-analysis.log'),
        
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
        // Initialize analyzer
        const analyzer = new RedundancyAnalyzer(infrastructure);

        // Run analysis
        const results = await analyzer.analyze();

        // Generate report
        const reportContent = await analyzer.generateRedundancyReport();
        const reportPath = await infrastructure.saveReport('redundancy-analysis', reportContent);

        // Display summary
        console.log('📊 Redundancy Analysis Results:');
        console.log(`   High Priority: ${results.high.length}`);
        console.log(`   Medium Priority: ${results.medium.length}`);
        console.log(`   Low Priority: ${results.low.length}`);
        console.log(`   Total Opportunities: ${analyzer.getAllFindings().length}\n`);

        console.log(`📄 Report saved to: ${reportPath}\n`);

        // Display top consolidation opportunities
        if (results.high.length > 0) {
            console.log('🎯 High Priority Consolidation Opportunities:');
            results.high.forEach((opportunity, index) => {
                console.log(`   ${index + 1}. ${opportunity.message}`);
                if (opportunity.details.files) {
                    console.log(`      Files: ${opportunity.details.files.length} affected`);
                }
                if (opportunity.details.occurrences) {
                    console.log(`      Occurrences: ${opportunity.details.occurrences}`);
                }
                console.log('');
            });
        }

        if (results.medium.length > 0) {
            console.log('📋 Medium Priority Opportunities:');
            results.medium.slice(0, 5).forEach((opportunity, index) => {
                console.log(`   ${index + 1}. ${opportunity.message}`);
                if (opportunity.details.pattern) {
                    console.log(`      Pattern: ${opportunity.details.pattern}`);
                }
                console.log('');
            });
            
            if (results.medium.length > 5) {
                console.log(`   ... and ${results.medium.length - 5} more medium priority opportunities\n`);
            }
        }

        // Display consolidation recommendations
        const hookOpportunities = analyzer.getAllFindings().filter(f => f.category === 'HOOK_STANDARDIZATION_OPPORTUNITY');
        if (hookOpportunities.length > 0) {
            console.log('🔧 Suggested Standardized Hooks:');
            const hooks = hookOpportunities[0].details.suggestedHooks || [];
            hooks.forEach(hook => {
                console.log(`   - ${hook}`);
            });
            console.log('');
        }

        console.log('✅ Redundancy Analysis completed successfully!');
        return results;

    } catch (error) {
        console.error('❌ Error during redundancy analysis:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    runRedundancyAnalysis()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runRedundancyAnalysis;