/**
 * Failure Point Detector
 * Identifies potential failure points in the SaaS system
 */

const BaseAnalyzer = require('../base-analyzer');
const fs = require('fs').promises;
const path = require('path');

class FailurePointDetector extends BaseAnalyzer {
    constructor(infrastructure) {
        super(infrastructure);
        this.patterns = {
            // Common failure patterns
            missingErrorHandling: [
                /\.then\([^)]*\)(?!\s*\.catch)/g,
                /await\s+[^;]+(?!\s*try)/g,
                /fetch\([^)]*\)(?!\s*\.catch)/g
            ],
            raceConditions: [
                /Promise\.all\(/g,
                /setTimeout\(/g,
                /setInterval\(/g,
                /async\s+function[^{]*{[^}]*await[^}]*await/g
            ],
            improperAsyncHandling: [
                /\.then\([^)]*\)\.then\([^)]*\)\.then/g,
                /callback\(/g,
                /new\s+Promise\(/g
            ],
            missingValidation: [
                /req\.body\.[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*&&|\s*\|\||\s*\?)/g,
                /req\.params\.[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*&&|\s*\|\||\s*\?)/g,
                /req\.query\.[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*&&|\s*\|\||\s*\?)/g
            ],
            inconsistentStateManagement: [
                /setState\(/g,
                /state\s*=\s*/g,
                /localStorage\./g,
                /sessionStorage\./g
            ]
        };
    }

    async analyze() {
        await this.logProgress('Starting failure point detection...');

        try {
            // Analyze different aspects of the system
            await this.analyzeCaseStudyPersistence();
            await this.analyzeImageHandling();
            await this.analyzeAPIEndpoints();
            await this.analyzeErrorHandling();
            await this.analyzeAsyncPatterns();
            await this.analyzeStateManagement();

            // Classify and prioritize issues
            await this.classifyIssues();

            await this.logProgress('Failure point detection completed');
            return this.categorizeFindings();

        } catch (error) {
            await this.logError('Error during failure point detection', error);
            throw error;
        }
    }

    async analyzeCaseStudyPersistence() {
        await this.logProgress('Analyzing case study persistence logic...');

        const caseStudyFiles = [
            'server.js',
            'case_study_editor.html',
            'case_study_editor_saas.html',
            'js/supabase-client.js',
            'api/case-studies.js'
        ];

        for (const file of caseStudyFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                await this.checkPersistencePatterns(file, content);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    await this.addFinding(
                        'MEDIUM',
                        'FILE_ACCESS',
                        `Could not analyze ${file}`,
                        { error: error.message }
                    );
                }
            }
        }
    }

    async checkPersistencePatterns(file, content) {
        // Check for missing re-fetch after save
        if (content.includes('update') || content.includes('upsert')) {
            if (!content.includes('fetch') && !content.includes('reload')) {
                await this.addFinding(
                    'HIGH',
                    'PERSISTENCE',
                    `Missing re-fetch after update in ${file}`,
                    { 
                        file,
                        issue: 'No re-fetch logic found after update operations',
                        impact: 'UI may show stale data after updates'
                    }
                );
            }
        }

        // Check for missing transaction handling
        if (content.includes('INSERT') || content.includes('UPDATE')) {
            if (!content.includes('transaction') && !content.includes('BEGIN')) {
                await this.addFinding(
                    'MEDIUM',
                    'PERSISTENCE',
                    `Missing transaction handling in ${file}`,
                    {
                        file,
                        issue: 'Database operations not wrapped in transactions',
                        impact: 'Risk of partial updates and data inconsistency'
                    }
                );
            }
        }

        // Check for proper timestamp handling
        if (content.includes('updated_at') || content.includes('created_at')) {
            if (!content.includes('NOW()') && !content.includes('new Date()')) {
                await this.addFinding(
                    'LOW',
                    'PERSISTENCE',
                    `Inconsistent timestamp handling in ${file}`,
                    {
                        file,
                        issue: 'Timestamps may not be properly set',
                        impact: 'Audit trail and versioning issues'
                    }
                );
            }
        }

        // Check for concurrent update handling
        if (content.includes('UPDATE') && !content.includes('version') && !content.includes('WHERE')) {
            await this.addFinding(
                'HIGH',
                'PERSISTENCE',
                `Missing concurrent update protection in ${file}`,
                {
                    file,
                    issue: 'No optimistic locking or version checking',
                    impact: 'Risk of lost updates in concurrent scenarios'
                }
            );
        }
    }

    async analyzeImageHandling() {
        await this.logProgress('Analyzing image handling logic...');

        const imageFiles = [
            'js/cloudinary-service.js',
            'js/cloudinary-config.js',
            'api/cloudinary-v2.js',
            'case_study_editor.html'
        ];

        for (const file of imageFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                await this.checkImagePatterns(file, content);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    await this.addFinding(
                        'MEDIUM',
                        'FILE_ACCESS',
                        `Could not analyze ${file}`,
                        { error: error.message }
                    );
                }
            }
        }
    }

    async checkImagePatterns(file, content) {
        // Check for missing secure_url validation
        if (content.includes('cloudinary') && content.includes('upload')) {
            if (!content.includes('secure_url')) {
                await this.addFinding(
                    'HIGH',
                    'IMAGE_HANDLING',
                    `Missing secure_url validation in ${file}`,
                    {
                        file,
                        issue: 'Upload response not validated for secure_url',
                        impact: 'Images may not be properly stored or accessible'
                    }
                );
            }
        }

        // Check for missing fallback images
        if (content.includes('<img') || content.includes('src=')) {
            if (!content.includes('onerror') && !content.includes('fallback') && !content.includes('placeholder')) {
                await this.addFinding(
                    'MEDIUM',
                    'IMAGE_HANDLING',
                    `Missing fallback image handling in ${file}`,
                    {
                        file,
                        issue: 'No fallback mechanism for failed image loads',
                        impact: 'Broken images displayed to users'
                    }
                );
            }
        }

        // Check for async loading issues
        if (content.includes('async') && content.includes('image')) {
            const asyncMatches = content.match(/async[^{]*{[^}]*}/g);
            if (asyncMatches) {
                for (const match of asyncMatches) {
                    if (!match.includes('await') && !match.includes('.then')) {
                        await this.addFinding(
                            'MEDIUM',
                            'IMAGE_HANDLING',
                            `Potential async loading issue in ${file}`,
                            {
                                file,
                                issue: 'Async function without proper awaiting',
                                impact: 'Race conditions in image loading'
                            }
                        );
                    }
                }
            }
        }

        // Check for missing error recovery
        if (content.includes('upload') && !content.includes('retry') && !content.includes('catch')) {
            await this.addFinding(
                'HIGH',
                'IMAGE_HANDLING',
                `Missing error recovery in image upload in ${file}`,
                {
                    file,
                    issue: 'No retry mechanism for failed uploads',
                    impact: 'Users cannot recover from upload failures'
                }
            );
        }
    }

    async analyzeAPIEndpoints() {
        await this.logProgress('Analyzing API endpoints...');

        try {
            const serverContent = await fs.readFile('server.js', 'utf8');
            await this.checkAPIPatterns('server.js', serverContent);

            // Check API directory if it exists
            try {
                const apiFiles = await fs.readdir('api');
                for (const file of apiFiles) {
                    if (file.endsWith('.js')) {
                        const content = await fs.readFile(path.join('api', file), 'utf8');
                        await this.checkAPIPatterns(`api/${file}`, content);
                    }
                }
            } catch (error) {
                // API directory might not exist
            }
        } catch (error) {
            await this.addFinding(
                'CRITICAL',
                'API_ANALYSIS',
                'Could not analyze server.js',
                { error: error.message }
            );
        }
    }

    async checkAPIPatterns(file, content) {
        // Check for missing error handling in routes
        const routeMatches = content.match(/app\.(get|post|put|delete)\([^}]*}/g);
        if (routeMatches) {
            for (const route of routeMatches) {
                if (!route.includes('try') && !route.includes('catch')) {
                    await this.addFinding(
                        'HIGH',
                        'API_ERROR_HANDLING',
                        `Missing error handling in API route in ${file}`,
                        {
                            file,
                            issue: 'API route without try-catch block',
                            impact: 'Unhandled errors can crash the server'
                        }
                    );
                }
            }
        }

        // Check for missing input validation
        if (content.includes('req.body') && !content.includes('validate') && !content.includes('joi') && !content.includes('check')) {
            await this.addFinding(
                'HIGH',
                'API_VALIDATION',
                `Missing input validation in ${file}`,
                {
                    file,
                    issue: 'Request body not validated',
                    impact: 'Security vulnerability and potential data corruption'
                }
            );
        }

        // Check for inconsistent response format
        const responseMatches = content.match(/res\.(json|send)\([^)]*\)/g);
        if (responseMatches && responseMatches.length > 1) {
            const formats = new Set();
            for (const response of responseMatches) {
                if (response.includes('success')) formats.add('success_format');
                if (response.includes('error')) formats.add('error_format');
                if (response.includes('data')) formats.add('data_format');
            }
            
            if (formats.size > 1) {
                await this.addFinding(
                    'MEDIUM',
                    'API_CONSISTENCY',
                    `Inconsistent response format in ${file}`,
                    {
                        file,
                        issue: 'Multiple response formats used',
                        impact: 'Client-side handling becomes complex'
                    }
                );
            }
        }
    }

    async analyzeErrorHandling() {
        await this.logProgress('Analyzing error handling patterns...');

        const files = await this.getAllJavaScriptFiles();
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                await this.checkErrorHandlingPatterns(file, content);
            } catch (error) {
                // Skip files that can't be read
            }
        }
    }

    async checkErrorHandlingPatterns(file, content) {
        // Check for unhandled promises
        for (const pattern of this.patterns.missingErrorHandling) {
            const matches = content.match(pattern);
            if (matches) {
                await this.addFinding(
                    'HIGH',
                    'ERROR_HANDLING',
                    `Unhandled promise in ${file}`,
                    {
                        file,
                        matches: matches.length,
                        issue: 'Promises without error handling',
                        impact: 'Unhandled promise rejections'
                    }
                );
            }
        }

        // Check for proper async/await usage
        if (content.includes('async') && !content.includes('try')) {
            await this.addFinding(
                'MEDIUM',
                'ERROR_HANDLING',
                `Async function without try-catch in ${file}`,
                {
                    file,
                    issue: 'Async function not wrapped in try-catch',
                    impact: 'Errors may not be properly handled'
                }
            );
        }
    }

    async analyzeAsyncPatterns() {
        await this.logProgress('Analyzing async patterns for race conditions...');

        const files = await this.getAllJavaScriptFiles();
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                await this.checkAsyncPatterns(file, content);
            } catch (error) {
                // Skip files that can't be read
            }
        }
    }

    async checkAsyncPatterns(file, content) {
        // Check for potential race conditions
        for (const pattern of this.patterns.raceConditions) {
            const matches = content.match(pattern);
            if (matches) {
                await this.addFinding(
                    'MEDIUM',
                    'RACE_CONDITION',
                    `Potential race condition in ${file}`,
                    {
                        file,
                        matches: matches.length,
                        issue: 'Pattern that may cause race conditions',
                        impact: 'Unpredictable behavior in concurrent scenarios'
                    }
                );
            }
        }

        // Check for callback hell
        const callbackDepth = (content.match(/function\s*\([^)]*\)\s*{[^}]*function\s*\([^)]*\)\s*{/g) || []).length;
        if (callbackDepth > 2) {
            await this.addFinding(
                'LOW',
                'CODE_QUALITY',
                `Callback hell detected in ${file}`,
                {
                    file,
                    depth: callbackDepth,
                    issue: 'Deeply nested callbacks',
                    impact: 'Code maintainability issues'
                }
            );
        }
    }

    async analyzeStateManagement() {
        await this.logProgress('Analyzing state management patterns...');

        const frontendFiles = await this.getAllHTMLFiles();
        
        for (const file of frontendFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                await this.checkStateManagement(file, content);
            } catch (error) {
                // Skip files that can't be read
            }
        }
    }

    async checkStateManagement(file, content) {
        // Check for inconsistent state management
        let statePatterns = 0;
        for (const pattern of this.patterns.inconsistentStateManagement) {
            const matches = content.match(pattern);
            if (matches) {
                statePatterns += matches.length;
            }
        }

        if (statePatterns > 3) {
            await this.addFinding(
                'MEDIUM',
                'STATE_MANAGEMENT',
                `Complex state management in ${file}`,
                {
                    file,
                    patterns: statePatterns,
                    issue: 'Multiple state management approaches',
                    impact: 'Potential state synchronization issues'
                }
            );
        }

        // Check for localStorage usage without error handling
        if (content.includes('localStorage') && !content.includes('try')) {
            await this.addFinding(
                'LOW',
                'STATE_MANAGEMENT',
                `localStorage usage without error handling in ${file}`,
                {
                    file,
                    issue: 'localStorage access not wrapped in try-catch',
                    impact: 'May fail in private browsing mode'
                }
            );
        }
    }

    async classifyIssues() {
        await this.logProgress('Classifying and prioritizing issues...');

        const findings = this.getAllFindings();
        
        // Reclassify based on impact and frequency
        for (const finding of findings) {
            if (finding.category === 'PERSISTENCE' && finding.severity === 'HIGH') {
                finding.priority = 1; // Highest priority
            } else if (finding.category === 'IMAGE_HANDLING' && finding.severity === 'HIGH') {
                finding.priority = 2;
            } else if (finding.category === 'API_ERROR_HANDLING' && finding.severity === 'HIGH') {
                finding.priority = 3;
            } else {
                finding.priority = 4; // Lower priority
            }

            // Add recommendations
            finding.recommendation = this.getRecommendation(finding);
        }
    }

    getRecommendation(finding) {
        const recommendations = {
            'PERSISTENCE': {
                'Missing re-fetch after update': 'Add re-fetch logic after successful update operations',
                'Missing transaction handling': 'Wrap database operations in transactions',
                'Missing concurrent update protection': 'Implement optimistic locking with version checking'
            },
            'IMAGE_HANDLING': {
                'Missing secure_url validation': 'Validate Cloudinary response contains secure_url before storing',
                'Missing fallback image handling': 'Add onerror handlers and placeholder images',
                'Missing error recovery': 'Implement retry logic for failed uploads'
            },
            'API_ERROR_HANDLING': {
                'Missing error handling in API route': 'Wrap route handlers in try-catch blocks',
                'Missing input validation': 'Add input validation using joi or similar library'
            }
        };

        for (const [category, recs] of Object.entries(recommendations)) {
            if (finding.category === category) {
                for (const [issue, rec] of Object.entries(recs)) {
                    if (finding.message.includes(issue)) {
                        return rec;
                    }
                }
            }
        }

        return 'Review and address the identified issue';
    }

    async getAllJavaScriptFiles() {
        const files = [];
        
        // Add known JS files
        const knownFiles = [
            'server.js',
            'js/supabase-client.js',
            'js/cloudinary-service.js',
            'js/cloudinary-config.js'
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

    async getAllHTMLFiles() {
        const files = [];
        
        // Add known HTML files
        const knownFiles = [
            'index.html',
            'case_study_editor.html',
            'admin-dashboard.html',
            'case_study_editor_saas.html'
        ];

        for (const file of knownFiles) {
            try {
                await fs.access(file);
                files.push(file);
            } catch (error) {
                // File doesn't exist
            }
        }

        return files;
    }

    async generateFailurePointReport() {
        await this.logProgress('Generating failure point report...');

        const categorized = this.categorizeFindings();
        const report = this.reporter.clear();

        // Executive Summary
        report.addSection('Executive Summary', 
            `This report identifies ${this.findings.length} potential failure points in the SaaS system. ` +
            `Critical issues: ${categorized.critical.length}, ` +
            `High priority: ${categorized.high.length}, ` +
            `Medium priority: ${categorized.medium.length}, ` +
            `Low priority: ${categorized.low.length}.`
        );

        // Critical Issues
        if (categorized.critical.length > 0) {
            const criticalItems = categorized.critical.map(f => ({
                title: f.message,
                content: f.details.issue || 'No details available',
                details: [
                    `File: ${f.details.file || 'Unknown'}`,
                    `Impact: ${f.details.impact || 'Unknown'}`,
                    `Recommendation: ${f.recommendation || 'Review required'}`
                ]
            }));
            report.addSection('Critical Issues', criticalItems);
        }

        // High Priority Issues
        if (categorized.high.length > 0) {
            const highItems = categorized.high.map(f => ({
                title: f.message,
                content: f.details.issue || 'No details available',
                details: [
                    `File: ${f.details.file || 'Unknown'}`,
                    `Impact: ${f.details.impact || 'Unknown'}`,
                    `Recommendation: ${f.recommendation || 'Review required'}`
                ]
            }));
            report.addSection('High Priority Issues', highItems);
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

        // Recommendations Summary
        const recommendations = [
            'Implement proper error handling in all API endpoints',
            'Add re-fetch logic after database update operations',
            'Implement fallback mechanisms for image loading',
            'Add input validation to all API endpoints',
            'Implement optimistic locking for concurrent updates',
            'Add retry logic for failed operations'
        ];

        report.addList('Key Recommendations', recommendations);

        return report.generate('Failure Point Analysis Report');
    }
}

module.exports = FailurePointDetector;