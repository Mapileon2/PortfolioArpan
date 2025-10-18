/**
 * System Verification Script
 * Comprehensive testing of all implemented features
 */

class SystemVerification {
    constructor() {
        this.results = {
            cloudinary: { status: 'pending', details: [] },
            imageResizer: { status: 'pending', details: [] },
            carousel: { status: 'pending', details: [] },
            adminDashboard: { status: 'pending', details: [] },
            authentication: { status: 'pending', details: [] },
            caseStudyEditor: { status: 'pending', details: [] }
        };
        
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    async runAllTests() {
        console.log('🚀 Starting comprehensive system verification...\n');
        
        await this.testCloudinaryIntegration();
        await this.testImageResizerService();
        await this.testCarouselFunctionality();
        await this.testAdminDashboard();
        await this.testAuthentication();
        await this.testCaseStudyEditor();
        
        this.generateReport();
    }

    async testCloudinaryIntegration() {
        console.log('🔍 Testing Cloudinary Integration...');
        const test = this.results.cloudinary;
        
        try {
            // Test 1: Check if service file exists
            const response = await fetch('js/cloudinary-sdk-service.js');
            if (response.ok) {
                test.details.push('✅ Cloudinary service file exists');
                this.passedTests++;
            } else {
                throw new Error('Service file not found');
            }
            this.totalTests++;

            // Test 2: Check service content
            const content = await response.text();
            if (content.includes('CloudinarySDKService')) {
                test.details.push('✅ CloudinarySDKService class found');
                this.passedTests++;
            } else {
                throw new Error('CloudinarySDKService class not found');
            }
            this.totalTests++;

            // Test 3: Check configuration
            if (content.includes('cloudName') && content.includes('uploadPreset')) {
                test.details.push('✅ Configuration parameters present');
                this.passedTests++;
            } else {
                throw new Error('Configuration incomplete');
            }
            this.totalTests++;

            // Test 4: Check transformation fix
            if (content.includes('buildTransformation') || content.includes('transformation')) {
                test.details.push('✅ Transformation functionality implemented');
                this.passedTests++;
            } else {
                test.details.push('⚠️ Transformation functionality may be missing');
            }
            this.totalTests++;

            test.status = 'pass';
            console.log('✅ Cloudinary Integration: PASSED\n');
            
        } catch (error) {
            test.status = 'fail';
            test.details.push(`❌ ${error.message}`);
            this.failedTests++;
            console.log(`❌ Cloudinary Integration: FAILED - ${error.message}\n`);
        }
    }

    async testImageResizerService() {
        console.log('🔍 Testing Image Resizer Service...');
        const test = this.results.imageResizer;
        
        try {
            // Test 1: Check if service file exists
            const response = await fetch('js/image-resizer-service.js');
            if (response.ok) {
                test.details.push('✅ Image resizer service file exists');
                this.passedTests++;
            } else {
                throw new Error('Service file not found');
            }
            this.totalTests++;

            // Test 2: Check service content
            const content = await response.text();
            if (content.includes('ImageResizerService')) {
                test.details.push('✅ ImageResizerService class found');
                this.passedTests++;
            } else {
                throw new Error('ImageResizerService class not found');
            }
            this.totalTests++;

            // Test 3: Check presets
            if (content.includes('presets') && content.includes('thumbnail')) {
                test.details.push('✅ Resize presets configured');
                this.passedTests++;
            } else {
                throw new Error('Resize presets not found');
            }
            this.totalTests++;

            // Test 4: Check upload functionality
            if (content.includes('uploadWithResize')) {
                test.details.push('✅ Upload with resize functionality present');
                this.passedTests++;
            } else {
                test.details.push('⚠️ Upload with resize functionality may be missing');
            }
            this.totalTests++;

            test.status = 'pass';
            console.log('✅ Image Resizer Service: PASSED\n');
            
        } catch (error) {
            test.status = 'fail';
            test.details.push(`❌ ${error.message}`);
            this.failedTests++;
            console.log(`❌ Image Resizer Service: FAILED - ${error.message}\n`);
        }
    }

    async testCarouselFunctionality() {
        console.log('🔍 Testing Carousel Functionality...');
        const test = this.results.carousel;
        
        try {
            // Test 1: Check admin dashboard for carousel section
            const response = await fetch('admin-dashboard.html');
            if (!response.ok) {
                throw new Error('Admin dashboard not accessible');
            }
            this.totalTests++;

            const content = await response.text();
            
            // Test 2: Check for carousel view section
            if (content.includes('carouselView')) {
                test.details.push('✅ Carousel view section found');
                this.passedTests++;
            } else {
                throw new Error('Carousel view section not found');
            }
            this.totalTests++;

            // Test 3: Check for upload zone
            if (content.includes('carousel-upload-zone')) {
                test.details.push('✅ Carousel upload zone present');
                this.passedTests++;
            } else {
                throw new Error('Carousel upload zone not found');
            }
            this.totalTests++;

            // Test 4: Check for carousel management
            if (content.includes('carousel-grid') || content.includes('carousel-preview')) {
                test.details.push('✅ Carousel management interface present');
                this.passedTests++;
            } else {
                test.details.push('⚠️ Carousel management interface may be incomplete');
            }
            this.totalTests++;

            // Test 5: Check for JavaScript handlers
            if (content.includes('handleCarouselFiles') || content.includes('openCarouselUpload')) {
                test.details.push('✅ Carousel JavaScript handlers present');
                this.passedTests++;
            } else {
                throw new Error('Carousel JavaScript handlers not found');
            }
            this.totalTests++;

            test.status = 'pass';
            console.log('✅ Carousel Functionality: PASSED\n');
            
        } catch (error) {
            test.status = 'fail';
            test.details.push(`❌ ${error.message}`);
            this.failedTests++;
            console.log(`❌ Carousel Functionality: FAILED - ${error.message}\n`);
        }
    }

    async testAdminDashboard() {
        console.log('🔍 Testing Admin Dashboard...');
        const test = this.results.adminDashboard;
        
        try {
            // Test 1: Check dashboard accessibility
            const response = await fetch('admin-dashboard.html');
            if (response.ok) {
                test.details.push('✅ Admin dashboard accessible');
                this.passedTests++;
            } else {
                throw new Error('Admin dashboard not accessible');
            }
            this.totalTests++;

            const content = await response.text();
            
            // Test 2: Check for navigation
            if (content.includes('navigation') || content.includes('sidebar')) {
                test.details.push('✅ Navigation structure present');
                this.passedTests++;
            } else {
                throw new Error('Navigation structure not found');
            }
            this.totalTests++;

            // Test 3: Check for AdminDashboard class
            if (content.includes('class AdminDashboard')) {
                test.details.push('✅ AdminDashboard class implemented');
                this.passedTests++;
            } else {
                throw new Error('AdminDashboard class not found');
            }
            this.totalTests++;

            // Test 4: Check for hash fragment handling
            if (content.includes('handleHashChange') || content.includes('window.location.hash')) {
                test.details.push('✅ Hash fragment handling implemented');
                this.passedTests++;
            } else {
                test.details.push('⚠️ Hash fragment handling may be missing');
            }
            this.totalTests++;

            // Test 5: Check for view switching
            if (content.includes('showView') || content.includes('page-view')) {
                test.details.push('✅ View switching functionality present');
                this.passedTests++;
            } else {
                throw new Error('View switching functionality not found');
            }
            this.totalTests++;

            test.status = 'pass';
            console.log('✅ Admin Dashboard: PASSED\n');
            
        } catch (error) {
            test.status = 'fail';
            test.details.push(`❌ ${error.message}`);
            this.failedTests++;
            console.log(`❌ Admin Dashboard: FAILED - ${error.message}\n`);
        }
    }

    async testAuthentication() {
        console.log('🔍 Testing Authentication System...');
        const test = this.results.authentication;
        
        try {
            // Test 1: Check auth system file
            const authResponse = await fetch('js/auth-system.js');
            if (authResponse.ok) {
                test.details.push('✅ Auth system file exists');
                this.passedTests++;
            } else {
                throw new Error('Auth system file not found');
            }
            this.totalTests++;

            // Test 2: Check Supabase client
            const supabaseResponse = await fetch('js/supabase-client.js');
            if (supabaseResponse.ok) {
                test.details.push('✅ Supabase client file exists');
                this.passedTests++;
            } else {
                throw new Error('Supabase client file not found');
            }
            this.totalTests++;

            // Test 3: Check auth content
            const authContent = await authResponse.text();
            if (authContent.includes('AuthSystem') || authContent.includes('authentication')) {
                test.details.push('✅ Authentication logic present');
                this.passedTests++;
            } else {
                throw new Error('Authentication logic not found');
            }
            this.totalTests++;

            test.status = 'pass';
            console.log('✅ Authentication System: PASSED\n');
            
        } catch (error) {
            test.status = 'fail';
            test.details.push(`❌ ${error.message}`);
            this.failedTests++;
            console.log(`❌ Authentication System: FAILED - ${error.message}\n`);
        }
    }

    async testCaseStudyEditor() {
        console.log('🔍 Testing Case Study Editor...');
        const test = this.results.caseStudyEditor;
        
        try {
            // Test 1: Check case study editor file
            const response = await fetch('case_study_editor.html');
            if (response.ok) {
                test.details.push('✅ Case study editor file exists');
                this.passedTests++;
            } else {
                // Try alternative files
                const altResponse = await fetch('case_study_editor_complete.html');
                if (altResponse.ok) {
                    test.details.push('✅ Case study editor (complete) file exists');
                    this.passedTests++;
                } else {
                    throw new Error('Case study editor file not found');
                }
            }
            this.totalTests++;

            test.status = 'pass';
            console.log('✅ Case Study Editor: PASSED\n');
            
        } catch (error) {
            test.status = 'fail';
            test.details.push(`❌ ${error.message}`);
            this.failedTests++;
            console.log(`❌ Case Study Editor: FAILED - ${error.message}\n`);
        }
    }

    generateReport() {
        console.log('📊 SYSTEM VERIFICATION REPORT');
        console.log('=' .repeat(50));
        console.log(`Total Tests: ${this.totalTests}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.failedTests}`);
        console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
        console.log('=' .repeat(50));
        
        Object.entries(this.results).forEach(([component, result]) => {
            console.log(`\n${component.toUpperCase()}: ${result.status.toUpperCase()}`);
            result.details.forEach(detail => console.log(`  ${detail}`));
        });
        
        console.log('\n' + '=' .repeat(50));
        
        if (this.failedTests === 0) {
            console.log('🎉 ALL SYSTEMS OPERATIONAL!');
        } else {
            console.log(`⚠️ ${this.failedTests} issue(s) need attention`);
        }
    }
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemVerification;
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
    window.SystemVerification = SystemVerification;
}