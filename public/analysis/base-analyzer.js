/**
 * Base Analyzer Class
 * All analysis modules extend this class
 */

const Logger = require('./utils/logger');
const Reporter = require('./utils/reporter');

class BaseAnalyzer {
    constructor(infrastructure) {
        this.infrastructure = infrastructure;
        this.logger = new Logger(infrastructure.logFile);
        this.reporter = new Reporter();
        this.findings = [];
    }

    async analyze() {
        throw new Error('analyze() must be implemented by subclass');
    }

    async addFinding(severity, category, message, details = {}) {
        const finding = {
            severity,
            category,
            message,
            details,
            timestamp: new Date().toISOString()
        };

        this.findings.push(finding);
        
        await this.logger.log(
            `[${severity}] ${category}: ${message}`,
            severity === 'CRITICAL' || severity === 'HIGH' ? 'ERROR' : 'WARN',
            details
        );
    }

    getFindingsBySeverity(severity) {
        return this.findings.filter(f => f.severity === severity);
    }

    getAllFindings() {
        return this.findings;
    }

    async generateReport(title, category) {
        const report = this.reporter.generate(title);
        const reportPath = await this.infrastructure.saveReport(
            title.toLowerCase().replace(/\s+/g, '-'),
            report,
            category
        );
        return reportPath;
    }

    categorizeFindings() {
        return {
            critical: this.getFindingsBySeverity('CRITICAL'),
            high: this.getFindingsBySeverity('HIGH'),
            medium: this.getFindingsBySeverity('MEDIUM'),
            low: this.getFindingsBySeverity('LOW')
        };
    }

    async logProgress(message) {
        await this.logger.info(message);
    }

    async logError(message, error) {
        await this.logger.error(message, { error: error.message, stack: error.stack });
    }
}

module.exports = BaseAnalyzer;
