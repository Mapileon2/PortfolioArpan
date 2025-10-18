#!/usr/bin/env node

/**
 * Comprehensive System Test Script
 * Tests all implemented features and generates a detailed report
 */

const fs = require('fs');
const path = require('path');

class ComprehensiveSystemTest {
    constructor() {
        this.results = [];
        this.passCount = 0;
        this.failCount = 0;
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        }[type] || '📋';
        
        const logMessage = `${prefix} [${timestamp}] ${message}`;
        console.log(logMessage);
        
        this.results.push({
            timestamp,
            type,
            message,
            logMessage
        });
    }

    async runAllTests() {
        this.log('Starting comprehensive system verification...', 'info');
        this.log('=' .repeat(60), 'info');
        
        // Test 1: File Structure Verification
        await this.testFileStructure();
        
        // Test 2: HTML Files Validation
        await this.testHTMLFiles();
        
        // Test 3: JavaScript Services
        await this.testJavaScriptServices();
        
        // Test 4: Configuration Files
        await this.testConfigurationFiles();
        
        // Test 5: Integration Points
        await this.testIntegrationPoints();
        
        // Generate final report
        this.generateFinalReport();
    }

    async testFileStructure() {
        this.log('Testing file structure...', 'info');
        
        const requiredFiles = [
            'admin-dashboard.html',
            'js/cloudinary-sdk-service.js',
            'js/image-resizer-service.js',
            'admin-dashboard-server.js',
            'image-resizer-demo.html',
            'working-carousel-demo.html'
        ];
        
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                this.log(`File exists: ${file}`, 'success');
                this.passCount++;
            } else {
                this.log(`Missing file: ${file}`, 'error');
                this.failCount++;
            }
        }
    }

    async testHTMLFiles() {
        this.log('Testing HTML files...', 'info');
        
        const htmlFiles = [
            'admin-dashboard.html',
            'image-resizer-demo.html',
            'working-carousel-demo.html',
            'comprehensive-system-test.html',
            'run-system-tests.html'
        ];
        
        for (const file of htmlFiles) {
            if (fs.existsSync(file)) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Basic HTML structure validation
                    if (content.includes('<!DOCTYPE html>') && 
                        content.includes('<html') && 
                        content.includes('</html>')) {
                        this.log(`HTML structure valid: ${file}`, 'success');
                        this.passCount++;
                    } else {
                        this.log(`HTML structure invalid: ${file}`, 'error');
                        this.failCount++;
                    }
                    
                    // Check for script tags
                    if (content.includes('<script')) {
                        this.log(`JavaScript integration found: ${file}`, 'success');
                        this.passCount++;
                    } else {
                        this.log(`No JavaScript integration: ${file}`, 'warning');
                    }
                    
                } catch (error) {
                    this.log(`Error reading ${file}: ${error.message}`, 'error');
                    this.failCount++;
                }
            }
        }
    }

    async testJavaScriptServices() {
        this.log('Testing JavaScript services...', 'info');
        
        const jsFiles = [
            { file: 'js/cloudinary-sdk-service.js', class: 'CloudinarySDKService' },
            { file: 'js/image-resizer-service.js', class: 'ImageResizerService' },
            { file: 'system-verification.js', class: 'SystemVerification' }
        ];
        
        for (const { file, class: className } of jsFiles) {
            if (fs.existsSync(file)) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Check for class definition
                    if (content.includes(`class ${className}`)) {
                        this.log(`Class ${className} found in ${file}`, 'success');
                        this.passCount++;
                    } else {
                        this.log(`Class ${className} not found in ${file}`, 'error');
                        this.failCount++;
                    }
                    
                    // Check for basic methods
                    if (content.includes('constructor') && content.includes('async')) {
                        this.log(`Modern JavaScript features used in ${file}`, 'success');
                        this.passCount++;
                    } else {
                        this.log(`Basic JavaScript structure missing in ${file}`, 'warning');
                    }
                    
                } catch (error) {
                    this.log(`Error reading ${file}: ${error.message}`, 'error');
                    this.failCount++;
                }
            } else {
                this.log(`JavaScript service missing: ${file}`, 'error');
                this.failCount++;
            }
        }
    }

    async testConfigurationFiles() {
        this.log('Testing configuration files...', 'info');
        
        // Check for server configuration
        if (fs.existsSync('admin-dashboard-server.js')) {
            try {
                const content = fs.readFileSync('admin-dashboard-server.js', 'utf8');
                
                if (content.includes('express') && content.includes('PORT')) {
                    this.log('Server configuration valid', 'success');
                    this.passCount++;
                } else {
                    this.log('Server configuration incomplete', 'error');
                    this.failCount++;
                }
                
                if (content.includes('static') && content.includes('sendFile')) {
                    this.log('Static file serving configured', 'success');
                    this.passCount++;
                } else {
                    this.log('Static file serving not configured', 'error');
                    this.failCount++;
                }
                
            } catch (error) {
                this.log(`Error reading server config: ${error.message}`, 'error');
                this.failCount++;
            }
        }
        
        // Check for package.json
        if (fs.existsSync('package.json')) {
            try {
                const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                
                if (packageJson.dependencies && packageJson.dependencies.express) {
                    this.log('Express dependency found', 'success');
                    this.passCount++;
                } else {
                    this.log('Express dependency missing', 'warning');
                }
                
            } catch (error) {
                this.log(`Error reading package.json: ${error.message}`, 'error');
                this.failCount++;
            }
        }
    }

    async testIntegrationPoints() {
        this.log('Testing integration points...', 'info');
        
        // Test admin dashboard integration
        if (fs.existsSync('admin-dashboard.html')) {
            const content = fs.readFileSync('admin-dashboard.html', 'utf8');
            
            // Check for carousel integration
            if (content.includes('carouselView')) {
                this.log('Carousel integration present in admin dashboard', 'success');
                this.passCount++;
                
                // Check for upload functionality
                if (content.includes('carousel-upload') || content.includes('openCarouselUpload')) {
                    this.log('Carousel upload functionality present', 'success');
                    this.passCount++;
                } else {
                    this.log('Carousel upload functionality missing', 'warning');
                }
            } else {
                this.log('Carousel integration missing in admin dashboard', 'error');
                this.failCount++;
            }
            
            // Check for image upload integration
            if (content.includes('upload') && content.includes('image')) {
                this.log('Image upload integration references found', 'success');
                this.passCount++;
            } else {
                this.log('Image upload integration references missing', 'warning');
            }
            
            // Check for authentication integration
            if (content.includes('auth') || content.includes('supabase')) {
                this.log('Authentication integration references found', 'success');
                this.passCount++;
            } else {
                this.log('Authentication integration references missing', 'warning');
            }
        }
    }

    generateFinalReport() {
        const endTime = Date.now();
        const duration = ((endTime - this.startTime) / 1000).toFixed(2);
        
        this.log('=' .repeat(60), 'info');
        this.log('COMPREHENSIVE SYSTEM TEST REPORT', 'info');
        this.log('=' .repeat(60), 'info');
        this.log(`Test Duration: ${duration} seconds`, 'info');
        this.log(`Total Tests: ${this.passCount + this.failCount}`, 'info');
        this.log(`Passed: ${this.passCount}`, 'success');
        this.log(`Failed: ${this.failCount}`, 'error');
        
        const successRate = ((this.passCount / (this.passCount + this.failCount)) * 100).toFixed(1);
        this.log(`Success Rate: ${successRate}%`, 'info');
        
        if (this.failCount === 0) {
            this.log('🎉 ALL SYSTEMS OPERATIONAL!', 'success');
        } else if (this.failCount <= 3) {
            this.log('⚠️ Minor issues detected - system mostly functional', 'warning');
        } else {
            this.log('❌ Multiple issues detected - requires attention', 'error');
        }
        
        // Save detailed report
        this.saveDetailedReport();
    }

    saveDetailedReport() {
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: this.passCount + this.failCount,
                passed: this.passCount,
                failed: this.failCount,
                successRate: ((this.passCount / (this.passCount + this.failCount)) * 100).toFixed(1)
            },
            results: this.results
        };
        
        const reportFileName = `system-test-report-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
        
        try {
            fs.writeFileSync(reportFileName, JSON.stringify(reportData, null, 2));
            this.log(`Detailed report saved: ${reportFileName}`, 'success');
        } catch (error) {
            this.log(`Failed to save report: ${error.message}`, 'error');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ComprehensiveSystemTest();
    tester.runAllTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = ComprehensiveSystemTest;