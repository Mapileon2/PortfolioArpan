/**
 * SaaS System Audit - Analysis Infrastructure
 * Main entry point for system analysis
 */

const fs = require('fs').promises;
const path = require('path');

class AnalysisInfrastructure {
    constructor() {
        this.outputDir = path.join(__dirname, 'output');
        this.reportsDir = path.join(this.outputDir, 'reports');
        this.logsDir = path.join(this.outputDir, 'logs');
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }

    async initialize() {
        console.log('🔧 Initializing analysis infrastructure...');
        
        // Create output directories
        await this.createDirectories();
        
        // Initialize logging
        await this.initializeLogging();
        
        console.log('✅ Analysis infrastructure initialized');
        return true;
    }

    async createDirectories() {
        const dirs = [
            this.outputDir,
            this.reportsDir,
            this.logsDir,
            path.join(this.reportsDir, 'project-scan'),
            path.join(this.reportsDir, 'data-flow'),
            path.join(this.reportsDir, 'failures'),
            path.join(this.reportsDir, 'schema'),
            path.join(this.reportsDir, 'redundancy'),
            path.join(this.reportsDir, 'final')
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`  ✓ Created directory: ${dir}`);
            } catch (error) {
                console.error(`  ✗ Failed to create directory ${dir}:`, error.message);
                throw error;
            }
        }
    }

    async initializeLogging() {
        this.logFile = path.join(this.logsDir, `analysis-${this.timestamp}.log`);
        await this.log('Analysis session started', 'INFO');
    }

    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        // Console output
        console.log(logEntry.trim());
        
        // File output
        try {
            await fs.appendFile(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    async saveReport(reportName, content, category = 'general') {
        const reportPath = path.join(this.reportsDir, category, `${reportName}-${this.timestamp}.md`);
        
        try {
            await fs.writeFile(reportPath, content);
            await this.log(`Report saved: ${reportPath}`, 'INFO');
            return reportPath;
        } catch (error) {
            await this.log(`Failed to save report ${reportName}: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async loadFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            await this.log(`Failed to load file ${filePath}: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async listFiles(directory, extensions = []) {
        try {
            const files = [];
            const entries = await fs.readdir(directory, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);

                if (entry.isDirectory()) {
                    // Skip node_modules, .git, and other build directories
                    if (!['node_modules', '.git', 'dist', 'build', '.kiro'].includes(entry.name)) {
                        const subFiles = await this.listFiles(fullPath, extensions);
                        files.push(...subFiles);
                    }
                } else if (entry.isFile()) {
                    if (extensions.length === 0 || extensions.some(ext => entry.name.endsWith(ext))) {
                        files.push(fullPath);
                    }
                }
            }

            return files;
        } catch (error) {
            await this.log(`Failed to list files in ${directory}: ${error.message}`, 'ERROR');
            return [];
        }
    }

    formatReport(title, sections) {
        let report = `# ${title}\n\n`;
        report += `**Generated:** ${new Date().toISOString()}\n\n`;
        report += `---\n\n`;

        for (const section of sections) {
            report += `## ${section.title}\n\n`;
            
            if (section.description) {
                report += `${section.description}\n\n`;
            }

            if (section.items && section.items.length > 0) {
                for (const item of section.items) {
                    if (typeof item === 'string') {
                        report += `- ${item}\n`;
                    } else if (item.title) {
                        report += `### ${item.title}\n\n`;
                        if (item.content) {
                            report += `${item.content}\n\n`;
                        }
                    }
                }
                report += `\n`;
            }

            if (section.table) {
                report += this.formatTable(section.table);
                report += `\n`;
            }

            if (section.code) {
                report += `\`\`\`${section.codeLanguage || 'javascript'}\n`;
                report += `${section.code}\n`;
                report += `\`\`\`\n\n`;
            }
        }

        return report;
    }

    formatTable(table) {
        if (!table.headers || !table.rows) return '';

        let output = '| ' + table.headers.join(' | ') + ' |\n';
        output += '| ' + table.headers.map(() => '---').join(' | ') + ' |\n';

        for (const row of table.rows) {
            output += '| ' + row.join(' | ') + ' |\n';
        }

        return output;
    }

    async generateSummary() {
        const summary = {
            timestamp: new Date().toISOString(),
            outputDirectory: this.outputDir,
            reportsGenerated: [],
            logsLocation: this.logFile
        };

        try {
            const reports = await fs.readdir(this.reportsDir, { recursive: true });
            summary.reportsGenerated = reports.filter(f => f.endsWith('.md'));
        } catch (error) {
            await this.log(`Failed to generate summary: ${error.message}`, 'ERROR');
        }

        return summary;
    }
}

module.exports = AnalysisInfrastructure;

// CLI usage
if (require.main === module) {
    (async () => {
        const infrastructure = new AnalysisInfrastructure();
        await infrastructure.initialize();
        console.log('\n✅ Analysis infrastructure is ready!');
        console.log(`📁 Output directory: ${infrastructure.outputDir}`);
        console.log(`📊 Reports directory: ${infrastructure.reportsDir}`);
        console.log(`📝 Logs directory: ${infrastructure.logsDir}`);
    })();
}
