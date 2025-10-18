/**
 * API Endpoint Mapper
 * Parses server files and API routes to extract endpoint definitions
 */

const fs = require('fs').promises;
const path = require('path');
const BaseAnalyzer = require('../base-analyzer');

class APIMapper extends BaseAnalyzer {
    constructor(infrastructure, projectRoot = process.cwd()) {
        super(infrastructure);
        this.projectRoot = projectRoot;
        this.endpoints = [];
        this.apiFiles = [];
    }

    async analyze() {
        await this.logProgress('🔍 Mapping API endpoints...');
        
        try {
            // Find API files
            await this.findAPIFiles();
            
            // Parse each API file
            for (const file of this.apiFiles) {
                await this.parseAPIFile(file);
            }
            
            // Generate report
            await this.generateAPIReport();
            
            await this.logProgress(`✅ API mapping complete: ${this.endpoints.length} endpoints found`);
            
            return {
                success: true,
                endpointsFound: this.endpoints.length,
                endpoints: this.endpoints
            };
            
        } catch (error) {
            await this.logError('API mapping failed', error);
            throw error;
        }
    }

    async findAPIFiles() {
        const potentialFiles = [
            'server.js',
            'server-saas.js',
            'api/case-studies.js',
            'api/carousel.js',
            'api/auth.js',
            'api/upload.js',
            'api/cloudinary-complete.js',
            'api/test-case-studies.js'
        ];
        
        for (const file of potentialFiles) {
            const fullPath = path.join(this.projectRoot, file);
            try {
                await fs.access(fullPath);
                this.apiFiles.push({
                    name: path.basename(file),
                    path: file,
                    fullPath: fullPath
                });
            } catch (error) {
                // File doesn't exist, skip
            }
        }
        
        await this.logProgress(`Found ${this.apiFiles.length} API files`);
    }

    async parseAPIFile(file) {
        try {
            const content = await fs.readFile(file.fullPath, 'utf-8');
            
            // Extract endpoints using regex patterns
            this.extractExpressEndpoints(content, file);
            this.extractRouterEndpoints(content, file);
            
        } catch (error) {
            await this.logError(`Failed to parse API file: ${file.path}`, error);
        }
    }

    extractExpressEndpoints(content, file) {
        // Match patterns like: app.get('/api/path', ...)
        const patterns = [
            /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const method = match[1].toUpperCase();
                const path = match[2];
                
                // Extract handler function name if possible
                const handlerMatch = content.substring(match.index).match(/,\s*(\w+)/);
                const handler = handlerMatch ? handlerMatch[1] : 'anonymous';
                
                // Check for authentication middleware
                const hasAuth = this.checkForAuth(content, match.index);
                
                // Extract description from comments
                const description = this.extractDescription(content, match.index);
                
                this.endpoints.push({
                    method,
                    path,
                    handler,
                    file: file.name,
                    filePath: file.path,
                    authenticated: hasAuth,
                    description
                });
            }
        }
    }

    extractRouterEndpoints(content, file) {
        // Match router.use patterns
        const routerUsePattern = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)\s*\)/g;
        let match;
        
        while ((match = routerUsePattern.exec(content)) !== null) {
            const basePath = match[1];
            const routerName = match[2];
            
            this.endpoints.push({
                method: 'ROUTER',
                path: basePath,
                handler: routerName,
                file: file.name,
                filePath: file.path,
                authenticated: false,
                description: `Router mounted at ${basePath}`
            });
        }
    }

    checkForAuth(content, position) {
        // Look backwards from the match position for authentication middleware
        const beforeMatch = content.substring(Math.max(0, position - 200), position);
        
        return beforeMatch.includes('authenticateUser') ||
               beforeMatch.includes('authenticateToken') ||
               beforeMatch.includes('authMiddleware') ||
               beforeMatch.includes('requireAuth');
    }

    extractDescription(content, position) {
        // Look for comments before the endpoint
        const beforeMatch = content.substring(Math.max(0, position - 300), position);
        const commentMatch = beforeMatch.match(/\/\*\*?\s*\n?\s*\*?\s*([^\n*]+)/);
        
        if (commentMatch) {
            return commentMatch[1].trim();
        }
        
        // Try single-line comment
        const singleCommentMatch = beforeMatch.match(/\/\/\s*([^\n]+)/);
        if (singleCommentMatch) {
            return singleCommentMatch[1].trim();
        }
        
        return '';
    }

    async generateAPIReport() {
        await this.logProgress('📝 Generating API report...');
        
        // Group endpoints by file
        const endpointsByFile = {};
        for (const endpoint of this.endpoints) {
            if (!endpointsByFile[endpoint.file]) {
                endpointsByFile[endpoint.file] = [];
            }
            endpointsByFile[endpoint.file].push(endpoint);
        }
        
        // Add summary
        this.reporter.addSection('API Endpoint Summary', [
            `Total Endpoints: ${this.endpoints.length}`,
            `API Files: ${this.apiFiles.length}`,
            `Authenticated Endpoints: ${this.endpoints.filter(e => e.authenticated).length}`,
            `Public Endpoints: ${this.endpoints.filter(e => !e.authenticated).length}`
        ]);
        
        // Add endpoints by method
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ROUTER'];
        for (const method of methods) {
            const methodEndpoints = this.endpoints.filter(e => e.method === method);
            if (methodEndpoints.length > 0) {
                const rows = methodEndpoints.map(e => [
                    e.path,
                    e.file,
                    e.authenticated ? '🔒 Yes' : '🔓 No',
                    e.description || '-'
                ]);
                
                this.reporter.addTable(
                    `${method} Endpoints`,
                    ['Path', 'File', 'Auth Required', 'Description'],
                    rows
                );
            }
        }
        
        // Add endpoints by file
        this.reporter.addSection('Endpoints by File', '');
        for (const [fileName, endpoints] of Object.entries(endpointsByFile)) {
            const endpointList = endpoints.map(e => 
                `${e.method} ${e.path}${e.authenticated ? ' 🔒' : ''}`
            );
            this.reporter.addList(fileName, endpointList);
        }
        
        // Save report
        await this.generateReport('API Endpoint Mapping', 'project-scan');
    }

    getEndpoints() {
        return this.endpoints;
    }

    getEndpointsByMethod(method) {
        return this.endpoints.filter(e => e.method === method.toUpperCase());
    }

    getAuthenticatedEndpoints() {
        return this.endpoints.filter(e => e.authenticated);
    }

    getPublicEndpoints() {
        return this.endpoints.filter(e => !e.authenticated);
    }
}

module.exports = APIMapper;

// CLI usage
if (require.main === module) {
    (async () => {
        const AnalysisInfrastructure = require('../index');
        const infrastructure = new AnalysisInfrastructure();
        await infrastructure.initialize();
        
        const mapper = new APIMapper(infrastructure);
        const result = await mapper.analyze();
        
        console.log('\n📊 API Mapping Results:');
        console.log(JSON.stringify(result, null, 2));
    })();
}
