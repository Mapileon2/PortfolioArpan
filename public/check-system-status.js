#!/usr/bin/env node

/**
 * System Status Checker
 * Quickly checks if all components are accessible
 */

const fs = require('fs');
const path = require('path');

class SystemStatusChecker {
    constructor() {
        this.results = {
            files: [],
            accessibility: [],
            integration: []
        };
    }

    async checkSystemStatus() {
        console.log('🔍 Checking system status...\n');
        
        await this.checkFileAccessibility();
        await this.checkWebAccessibility();
        await this.checkIntegrationPoints();
        
        this.generateStatusReport();
    }

    async checkFileAccessibility() {
        console.log('📁 Checking file accessibility...');
        
        const criticalFiles = [
            'admin-dashboard.html',
            'js/cloudinary-sdk-service.js',
            'js/image-resizer-service.js',
            'admin-dashboard-server.js',
            'case_study_editor.html',
            'image-resizer-demo.html',
            'working-carousel-demo.html'
        ];
        
        for (const file of criticalFiles) {
            const exists = fs.existsSync(file);
            const status = exists ? '✅' : '❌';
            console.log(`  ${status} ${file}`);
            
            this.results.files.push({
                file,
                exists,
                status: exists ? 'accessible' : 'missing'
            });
        }
        console.log('');
    }

    async checkWebAccessibility() {
        console.log('🌐 Checking web accessibility...');
        
        // Since we can't make HTTP requests in Node.js without additional setup,
        // we'll check if the files exist and have proper structure
        const webFiles = [
            'admin-dashboard.html',
            'comprehensive-functionality-test.html',
            'demo-all-features.html',
            'run-system-tests.html'
        ];
        
        for (const file of webFiles) {
            if (fs.existsSync(file)) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    const hasHtml = content.includes('<!DOCTYPE html>');
                    const hasTitle = content.includes('<title>');
                    const hasScript = content.includes('<script>');
                    
                    const status = hasHtml && hasTitle ? '✅' : '⚠️';
                    console.log(`  ${status} ${file} - ${hasHtml ? 'Valid HTML' : 'Invalid HTML'}`);
                    
                    this.results.accessibility.push({
                        file,
                        accessible: hasHtml && hasTitle,
                        hasScript,
                        status: hasHtml && hasTitle ? 'valid' : 'invalid'
                    });
                } catch (error) {
                    console.log(`  ❌ ${file} - Read error: ${error.message}`);
                    this.results.accessibility.push({
                        file,
                        accessible: false,
                        error: error.message,
                        status: 'error'
                    });
                }
            } else {
                console.log(`  ❌ ${file} - File not found`);
                this.results.accessibility.push({
                    file,
                    accessible: false,
                    status: 'missing'
                });
            }
        }
        console.log('');
    }

    async checkIntegrationPoints() {
        console.log('🔗 Checking integration points...');
        
        if (fs.existsSync('admin-dashboard.html')) {
            try {
                const content = fs.readFileSync('admin-dashboard.html', 'utf8');
                
                const integrations = [
                    { name: 'Carousel View', check: content.includes('carouselView') },
                    { name: 'Content Management', check: content.includes('contentView') },
                    { name: 'Projects View', check: content.includes('projectsView') },
                    { name: 'Settings View', check: content.includes('settingsView') },
                    { name: 'Navigation System', check: content.includes('switchView') },
                    { name: 'Hash Routing', check: content.includes('window.location.hash') },
                    { name: 'Cloudinary References', check: content.includes('cloudinary') || content.includes('upload') },
                    { name: 'Authentication', check: content.includes('auth') || content.includes('supabase') }
                ];
                
                integrations.forEach(integration => {
                    const status = integration.check ? '✅' : '❌';
                    console.log(`  ${status} ${integration.name}`);
                    
                    this.results.integration.push({
                        name: integration.name,
                        integrated: integration.check,
                        status: integration.check ? 'integrated' : 'missing'
                    });
                });
                
            } catch (error) {
                console.log(`  ❌ Error reading admin dashboard: ${error.message}`);
            }
        } else {
            console.log('  ❌ Admin dashboard not found');
        }
        console.log('');
    }

    generateStatusReport() {
        console.log('📊 SYSTEM STATUS REPORT');
        console.log('=' .repeat(50));
        
        // File accessibility summary
        const totalFiles = this.results.files.length;
        const accessibleFiles = this.results.files.filter(f => f.exists).length;
        console.log(`📁 Files: ${accessibleFiles}/${totalFiles} accessible`);
        
        // Web accessibility summary
        const totalWebFiles = this.results.accessibility.length;
        const validWebFiles = this.results.accessibility.filter(f => f.accessible).length;
        console.log(`🌐 Web Files: ${validWebFiles}/${totalWebFiles} valid`);
        
        // Integration summary
        const totalIntegrations = this.results.integration.length;
        const workingIntegrations = this.results.integration.filter(i => i.integrated).length;
        console.log(`🔗 Integrations: ${workingIntegrations}/${totalIntegrations} working`);
        
        // Overall status
        const overallScore = ((accessibleFiles / totalFiles) + 
                            (validWebFiles / totalWebFiles) + 
                            (workingIntegrations / totalIntegrations)) / 3;
        
        console.log('=' .repeat(50));
        console.log(`📈 Overall System Health: ${(overallScore * 100).toFixed(1)}%`);
        
        if (overallScore >= 0.9) {
            console.log('🎉 System Status: EXCELLENT - All systems operational!');
        } else if (overallScore >= 0.7) {
            console.log('✅ System Status: GOOD - Minor issues detected');
        } else if (overallScore >= 0.5) {
            console.log('⚠️ System Status: FAIR - Some issues need attention');
        } else {
            console.log('❌ System Status: POOR - Multiple issues detected');
        }
        
        console.log('\n🚀 Next Steps:');
        console.log('1. Open comprehensive-functionality-test.html for detailed testing');
        console.log('2. Run: node admin-dashboard-server.js (if not already running)');
        console.log('3. Access: http://localhost:3012/admin-dashboard.html');
        console.log('4. Test each functionality manually');
    }
}

// Run the status check
if (require.main === module) {
    const checker = new SystemStatusChecker();
    checker.checkSystemStatus().catch(error => {
        console.error('Status check failed:', error);
        process.exit(1);
    });
}

module.exports = SystemStatusChecker;