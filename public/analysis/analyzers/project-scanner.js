/**
 * Project Scanner
 * Scans the entire project structure and documents all files, directories, and components
 */

const fs = require('fs').promises;
const path = require('path');
const BaseAnalyzer = require('../base-analyzer');

class ProjectScanner extends BaseAnalyzer {
    constructor(infrastructure, projectRoot = process.cwd()) {
        super(infrastructure);
        this.projectRoot = projectRoot;
        this.fileInventory = {
            html: [],
            javascript: [],
            css: [],
            sql: [],
            json: [],
            markdown: [],
            other: []
        };
        this.directories = [];
        this.totalFiles = 0;
        this.totalSize = 0;
    }

    async analyze() {
        await this.logProgress('🔍 Starting project scan...');
        
        try {
            // Scan project structure
            await this.scanDirectory(this.projectRoot);
            
            // Categorize files
            await this.categorizeFiles();
            
            // Generate report
            await this.generateScanReport();
            
            await this.logProgress(`✅ Project scan complete: ${this.totalFiles} files scanned`);
            
            return {
                success: true,
                filesScanned: this.totalFiles,
                totalSize: this.totalSize,
                inventory: this.fileInventory
            };
            
        } catch (error) {
            await this.logError('Project scan failed', error);
            throw error;
        }
    }

    async scanDirectory(dirPath, relativePath = '') {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relPath = path.join(relativePath, entry.name);
                
                // Skip excluded directories
                if (this.shouldSkip(entry.name)) {
                    continue;
                }
                
                if (entry.isDirectory()) {
                    this.directories.push({
                        name: entry.name,
                        path: relPath,
                        fullPath: fullPath
                    });
                    
                    // Recursively scan subdirectory
                    await this.scanDirectory(fullPath, relPath);
                    
                } else if (entry.isFile()) {
                    await this.processFile(fullPath, relPath, entry.name);
                }
            }
            
        } catch (error) {
            await this.logError(`Failed to scan directory: ${dirPath}`, error);
        }
    }

    async processFile(fullPath, relativePath, fileName) {
        try {
            const stats = await fs.stat(fullPath);
            const ext = path.extname(fileName).toLowerCase();
            
            const fileInfo = {
                name: fileName,
                path: relativePath,
                fullPath: fullPath,
                size: stats.size,
                extension: ext,
                modified: stats.mtime
            };
            
            // Categorize by extension
            const category = this.getFileCategory(ext);
            this.fileInventory[category].push(fileInfo);
            
            this.totalFiles++;
            this.totalSize += stats.size;
            
        } catch (error) {
            await this.logError(`Failed to process file: ${fullPath}`, error);
        }
    }

    getFileCategory(extension) {
        const categories = {
            '.html': 'html',
            '.htm': 'html',
            '.js': 'javascript',
            '.mjs': 'javascript',
            '.css': 'css',
            '.scss': 'css',
            '.sass': 'css',
            '.sql': 'sql',
            '.json': 'json',
            '.md': 'markdown',
            '.markdown': 'markdown'
        };
        
        return categories[extension] || 'other';
    }

    shouldSkip(name) {
        const skipList = [
            'node_modules',
            '.git',
            '.kiro',
            'dist',
            'build',
            'coverage',
            '.next',
            '.nuxt',
            'out',
            '__pycache__',
            '.pytest_cache',
            '.vscode',
            '.idea',
            'analysis' // Skip our own analysis directory
        ];
        
        return skipList.includes(name) || name.startsWith('.');
    }

    async categorizeFiles() {
        await this.logProgress('📊 Categorizing files...');
        
        // Identify key file types
        this.identifyPages();
        this.identifyServices();
        this.identifyAPIs();
        this.identifyConfigs();
        this.identifyTests();
    }

    identifyPages() {
        const pages = this.fileInventory.html.filter(file => {
            const name = file.name.toLowerCase();
            return !name.includes('test') && !name.includes('demo');
        });
        
        this.fileInventory.pages = pages.map(file => ({
            ...file,
            type: this.classifyPage(file.name)
        }));
    }

    classifyPage(fileName) {
        const name = fileName.toLowerCase();
        
        if (name.includes('admin')) return 'admin';
        if (name.includes('login')) return 'auth';
        if (name.includes('editor')) return 'editor';
        if (name.includes('dashboard')) return 'dashboard';
        if (name.includes('carousel')) return 'carousel';
        if (name === 'index.html') return 'homepage';
        
        return 'other';
    }

    identifyServices() {
        const services = this.fileInventory.javascript.filter(file => {
            const name = file.name.toLowerCase();
            return name.includes('service') || 
                   name.includes('client') || 
                   name.includes('api') ||
                   file.path.includes('js/') && !file.path.includes('test');
        });
        
        this.fileInventory.services = services.map(file => ({
            ...file,
            type: this.classifyService(file.name)
        }));
    }

    classifyService(fileName) {
        const name = fileName.toLowerCase();
        
        if (name.includes('supabase')) return 'database';
        if (name.includes('cloudinary')) return 'image';
        if (name.includes('auth')) return 'authentication';
        if (name.includes('carousel')) return 'carousel';
        if (name.includes('case-study') || name.includes('case_study')) return 'case-study';
        
        return 'utility';
    }

    identifyAPIs() {
        const apis = this.fileInventory.javascript.filter(file => {
            return file.path.includes('api/') || 
                   file.name === 'server.js' ||
                   file.name.includes('server');
        });
        
        this.fileInventory.apis = apis;
    }

    identifyConfigs() {
        const configs = [
            ...this.fileInventory.json.filter(file => {
                const name = file.name.toLowerCase();
                return name.includes('package') || 
                       name.includes('config') ||
                       name === 'vercel.json';
            }),
            ...this.fileInventory.other.filter(file => {
                const name = file.name.toLowerCase();
                return name.includes('.env') || name.includes('config');
            })
        ];
        
        this.fileInventory.configs = configs;
    }

    identifyTests() {
        const tests = [
            ...this.fileInventory.html.filter(file => {
                const name = file.name.toLowerCase();
                return name.includes('test') || name.includes('debug') || name.includes('demo');
            }),
            ...this.fileInventory.javascript.filter(file => {
                const name = file.name.toLowerCase();
                return name.includes('test') || name.includes('spec');
            })
        ];
        
        this.fileInventory.tests = tests;
    }

    async generateScanReport() {
        await this.logProgress('📝 Generating scan report...');
        
        // Add summary section
        this.reporter.addSection('Summary', [
            `Total Files: ${this.totalFiles}`,
            `Total Size: ${this.formatBytes(this.totalSize)}`,
            `Directories: ${this.directories.length}`,
            `HTML Files: ${this.fileInventory.html.length}`,
            `JavaScript Files: ${this.fileInventory.javascript.length}`,
            `CSS Files: ${this.fileInventory.css.length}`,
            `SQL Files: ${this.fileInventory.sql.length}`,
            `JSON Files: ${this.fileInventory.json.length}`,
            `Markdown Files: ${this.fileInventory.markdown.length}`
        ]);
        
        // Add pages section
        if (this.fileInventory.pages && this.fileInventory.pages.length > 0) {
            const pageRows = this.fileInventory.pages.map(page => [
                page.name,
                page.type,
                page.path,
                this.formatBytes(page.size)
            ]);
            
            this.reporter.addTable(
                'HTML Pages',
                ['File Name', 'Type', 'Path', 'Size'],
                pageRows
            );
        }
        
        // Add services section
        if (this.fileInventory.services && this.fileInventory.services.length > 0) {
            const serviceRows = this.fileInventory.services.map(service => [
                service.name,
                service.type,
                service.path,
                this.formatBytes(service.size)
            ]);
            
            this.reporter.addTable(
                'Service Files',
                ['File Name', 'Type', 'Path', 'Size'],
                serviceRows
            );
        }
        
        // Add APIs section
        if (this.fileInventory.apis && this.fileInventory.apis.length > 0) {
            const apiRows = this.fileInventory.apis.map(api => [
                api.name,
                api.path,
                this.formatBytes(api.size)
            ]);
            
            this.reporter.addTable(
                'API Files',
                ['File Name', 'Path', 'Size'],
                apiRows
            );
        }
        
        // Add configs section
        if (this.fileInventory.configs && this.fileInventory.configs.length > 0) {
            const configRows = this.fileInventory.configs.map(config => [
                config.name,
                config.path
            ]);
            
            this.reporter.addTable(
                'Configuration Files',
                ['File Name', 'Path'],
                configRows
            );
        }
        
        // Add directory structure
        const topLevelDirs = this.directories
            .filter(dir => !dir.path.includes('/') && !dir.path.includes('\\'))
            .map(dir => dir.name);
        
        this.reporter.addList('Top-Level Directories', topLevelDirs);
        
        // Save report
        await this.generateReport('Project Scan Report', 'project-scan');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getInventory() {
        return this.fileInventory;
    }

    getStatistics() {
        return {
            totalFiles: this.totalFiles,
            totalSize: this.totalSize,
            totalDirectories: this.directories.length,
            filesByType: {
                html: this.fileInventory.html.length,
                javascript: this.fileInventory.javascript.length,
                css: this.fileInventory.css.length,
                sql: this.fileInventory.sql.length,
                json: this.fileInventory.json.length,
                markdown: this.fileInventory.markdown.length,
                other: this.fileInventory.other.length
            }
        };
    }
}

module.exports = ProjectScanner;

// CLI usage
if (require.main === module) {
    (async () => {
        const AnalysisInfrastructure = require('../index');
        const infrastructure = new AnalysisInfrastructure();
        await infrastructure.initialize();
        
        const scanner = new ProjectScanner(infrastructure);
        const result = await scanner.analyze();
        
        console.log('\n📊 Scan Results:');
        console.log(JSON.stringify(result, null, 2));
    })();
}
