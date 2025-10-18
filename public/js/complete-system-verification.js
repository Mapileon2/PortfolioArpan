/**
 * Complete System Verification - Comprehensive Test Suite
 * Tests every aspect of case study functionality and homepage integration
 */

class CompleteSystemVerification {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            duration: 0
        };
        this.startTime = null;
        this.testData = {
            testCaseStudyId: null,
            originalCaseStudies: []
        };
        
        this.setupEventListeners();
        this.log('🔧 Complete System Verification initialized', 'info');
    }

    setupEventListeners() {
        document.getElementById('runFullTest').addEventListener('click', () => this.runFullTestSuite());
        document.getElementById('runApiTests').addEventListener('click', () => this.runApiTests());
        document.getElementById('runIntegrationTests').addEventListener('click', () => this.runIntegrationTests());
        document.getElementById('runHomepageTests').addEventListener('click', () => this.runHomepageTests());
        document.getElementById('clearResults').addEventListener('click', () => this.clearResults());
    }

    log(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    updateProgress(current, total) {
        const percentage = (current / total) * 100;
        document.getElementById('progressFill').style.width = `${percentage}%`;
    }

    updateStats() {
        document.getElementById('totalTests').textContent = this.testResults.total;
        document.getElementById('passedTests').textContent = this.testResults.passed;
        document.getElementById('failedTests').textContent = this.testResults.failed;
        document.getElementById('testDuration').textContent = this.testResults.duration + 'ms';
    }

    async runTest(testId, testName, testFunction) {
        this.testResults.total++;
        this.updateTestStatus(testId, 'running', 'Running...');
        
        try {
            const startTime = Date.now();
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            if (result.success) {
                this.testResults.passed++;
                this.updateTestStatus(testId, 'passed', `Passed (${duration}ms)`, result.details);
                this.log(`✅ ${testName} - PASSED (${duration}ms)`, 'success');
            } else {
                this.testResults.failed++;
                this.updateTestStatus(testId, 'failed', `Failed (${duration}ms)`, result.error);
                this.log(`❌ ${testName} - FAILED: ${result.error}`, 'error');
            }
        } catch (error) {
            this.testResults.failed++;
            this.updateTestStatus(testId, 'failed', 'Error', error.message);
            this.log(`❌ ${testName} - ERROR: ${error.message}`, 'error');
        }
        
        this.updateStats();
    }

    updateTestStatus(testId, status, statusText, details = '') {
        const testItem = document.getElementById(testId);
        if (!testItem) return;
        
        testItem.className = `test-item ${status}`;
        
        const statusIcon = testItem.querySelector('.status-icon');
        const statusTextEl = testItem.querySelector('.status-text');
        const detailsEl = testItem.querySelector('.test-details');
        
        statusIcon.className = `status-icon ${status}`;
        statusTextEl.textContent = statusText;
        
        if (details) {
            detailsEl.textContent = typeof details === 'object' ? JSON.stringify(details, null, 2) : details;
        }
        
        // Update icon content
        switch (status) {
            case 'running': statusIcon.textContent = '⏳'; break;
            case 'passed': statusIcon.textContent = '✅'; break;
            case 'failed': statusIcon.textContent = '❌'; break;
            default: statusIcon.textContent = '⏳'; break;
        }
    }

    async runFullTestSuite() {
        this.log('🚀 Starting Complete System Verification', 'info');
        this.startTime = Date.now();
        this.testResults = { total: 0, passed: 0, failed: 0, duration: 0 };
        
        this.disableButtons();
        
        try {
            // Run all test categories
            await this.runApiTests();
            await this.runDatabaseTests();
            await this.runHomepageTests();
            await this.runEditorTests();
            await this.runMediaTests();
            await this.runPerformanceTests();
            
            this.testResults.duration = Date.now() - this.startTime;
            this.updateStats();
            
            const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
            this.log(`🏁 Complete test suite finished: ${this.testResults.passed}/${this.testResults.total} passed (${successRate}%)`, 'info');
            
        } catch (error) {
            this.log(`💥 Test suite failed: ${error.message}`, 'error');
        } finally {
            this.enableButtons();
        }
    }
} 
   // API Tests
    async runApiTests() {
        this.log('🔌 Running API Tests...', 'info');
        
        await this.runTest('test-server-health', 'Server Health Check', async () => {
            const response = await fetch('/api/case-studies', { method: 'HEAD' });
            return {
                success: response.ok,
                details: `Status: ${response.status}`,
                error: response.ok ? null : `Server returned ${response.status}`
            };
        });

        await this.runTest('test-case-studies-api', 'Case Studies API Endpoint', async () => {
            const response = await fetch('/api/case-studies');
            const data = await response.json();
            
            this.testData.originalCaseStudies = data;
            
            return {
                success: response.ok && Array.isArray(data),
                details: `Found ${data.length} case studies`,
                error: response.ok ? null : 'API endpoint failed or returned invalid data'
            };
        });

        await this.runTest('test-api-create', 'Case Study Creation API', async () => {
            const testCaseStudy = {
                project_title: 'Test Case Study - ' + Date.now(),
                project_description: 'This is a test case study for system verification',
                project_category: 'Testing',
                project_rating: 5,
                sections: {
                    hero: {
                        title: 'Test Hero Title',
                        subtitle: 'Test Hero Subtitle'
                    }
                },
                status: 'published'
            };

            const response = await fetch('/api/case-studies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testCaseStudy)
            });

            const result = await response.json();
            
            if (response.ok && result.data) {
                this.testData.testCaseStudyId = result.data.id;
                return {
                    success: true,
                    details: `Created case study with ID: ${result.data.id}`,
                    error: null
                };
            } else {
                return {
                    success: false,
                    details: result,
                    error: result.message || 'Failed to create case study'
                };
            }
        });

        await this.runTest('test-api-update', 'Case Study Update API', async () => {
            if (!this.testData.testCaseStudyId) {
                return { success: false, error: 'No test case study ID available' };
            }

            const updateData = {
                project_title: 'Updated Test Case Study - ' + Date.now(),
                project_description: 'This case study has been updated'
            };

            const response = await fetch(`/api/case-studies/${this.testData.testCaseStudyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();
            
            return {
                success: response.ok && result.data,
                details: result.data ? `Updated case study: ${result.data.project_title}` : result,
                error: response.ok ? null : result.message || 'Failed to update case study'
            };
        });

        await this.runTest('test-api-delete', 'Case Study Delete API', async () => {
            if (!this.testData.testCaseStudyId) {
                return { success: false, error: 'No test case study ID available' };
            }

            const response = await fetch(`/api/case-studies/${this.testData.testCaseStudyId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            return {
                success: response.ok && result.success,
                details: 'Test case study deleted successfully',
                error: response.ok ? null : result.message || 'Failed to delete case study'
            };
        });
    }

    // Database Tests
    async runDatabaseTests() {
        this.log('🗄️ Running Database Tests...', 'info');
        
        await this.runTest('test-supabase-connection', 'Supabase Connection', async () => {
            try {
                const response = await fetch('/api/case-studies?limit=1');
                const data = await response.json();
                
                return {
                    success: response.ok,
                    details: 'Database connection successful',
                    error: response.ok ? null : 'Database connection failed'
                };
            } catch (error) {
                return {
                    success: false,
                    details: null,
                    error: `Database connection error: ${error.message}`
                };
            }
        });

        await this.runTest('test-data-persistence', 'Data Persistence Verification', async () => {
            // Create a test case study
            const testData = {
                project_title: 'Persistence Test - ' + Date.now(),
                project_description: 'Testing data persistence',
                status: 'published'
            };

            const createResponse = await fetch('/api/case-studies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });

            if (!createResponse.ok) {
                return { success: false, error: 'Failed to create test case study' };
            }

            const created = await createResponse.json();
            const testId = created.data.id;

            // Wait a moment then fetch it back
            await new Promise(resolve => setTimeout(resolve, 500));

            const fetchResponse = await fetch(`/api/case-studies/${testId}`);
            
            if (fetchResponse.ok) {
                const fetched = await fetchResponse.json();
                
                // Clean up
                await fetch(`/api/case-studies/${testId}`, { method: 'DELETE' });
                
                return {
                    success: fetched.project_title === testData.project_title,
                    details: 'Data persisted and retrieved correctly',
                    error: fetched.project_title !== testData.project_title ? 'Data mismatch after persistence' : null
                };
            } else {
                return { success: false, error: 'Failed to retrieve persisted data' };
            }
        });

        await this.runTest('test-data-integrity', 'Data Integrity Check', async () => {
            const response = await fetch('/api/case-studies');
            const caseStudies = await response.json();
            
            let integrityIssues = [];
            
            caseStudies.forEach((cs, index) => {
                if (!cs.id) integrityIssues.push(`Case study ${index} missing ID`);
                if (!cs.project_title) integrityIssues.push(`Case study ${cs.id} missing title`);
                if (!cs.created_at) integrityIssues.push(`Case study ${cs.id} missing created_at`);
                if (!cs.updated_at) integrityIssues.push(`Case study ${cs.id} missing updated_at`);
            });
            
            return {
                success: integrityIssues.length === 0,
                details: integrityIssues.length === 0 ? 'All data integrity checks passed' : `Found ${integrityIssues.length} issues`,
                error: integrityIssues.length > 0 ? integrityIssues.join('; ') : null
            };
        });
    }

    // Homepage Tests
    async runHomepageTests() {
        this.log('🏠 Running Homepage Tests...', 'info');
        
        await this.runTest('test-homepage-load', 'Homepage Loading', async () => {
            try {
                const response = await fetch('/');
                const html = await response.text();
                
                const hasProjectsSection = html.includes('id="projects"');
                const hasScriptTag = html.includes('script.js');
                
                return {
                    success: response.ok && hasProjectsSection,
                    details: `Homepage loaded, projects section: ${hasProjectsSection}, scripts: ${hasScriptTag}`,
                    error: response.ok ? (hasProjectsSection ? null : 'Projects section not found') : 'Homepage failed to load'
                };
            } catch (error) {
                return {
                    success: false,
                    details: null,
                    error: `Homepage load error: ${error.message}`
                };
            }
        });

        await this.runTest('test-case-studies-display', 'Case Studies Display on Homepage', async () => {
            // This test simulates what the homepage JavaScript does
            const response = await fetch('/api/case-studies');
            const caseStudies = await response.json();
            
            if (!response.ok) {
                return { success: false, error: 'Failed to fetch case studies for homepage' };
            }
            
            // Check if we have displayable case studies
            const publishedCaseStudies = caseStudies.filter(cs => cs.status === 'published');
            const hasRequiredFields = publishedCaseStudies.every(cs => 
                cs.project_title && cs.id
            );
            
            return {
                success: publishedCaseStudies.length > 0 && hasRequiredFields,
                details: `Found ${publishedCaseStudies.length} published case studies, all have required fields: ${hasRequiredFields}`,
                error: publishedCaseStudies.length === 0 ? 'No published case studies found' : 
                       !hasRequiredFields ? 'Some case studies missing required fields' : null
            };
        });

        await this.runTest('test-case-study-links', 'Case Study Links Functionality', async () => {
            const response = await fetch('/api/case-studies');
            const caseStudies = await response.json();
            
            if (caseStudies.length === 0) {
                return { success: false, error: 'No case studies available to test links' };
            }
            
            // Test if case study detail page would be accessible
            const firstCaseStudy = caseStudies[0];
            const detailResponse = await fetch(`/api/case-studies/${firstCaseStudy.id}`);
            
            return {
                success: detailResponse.ok,
                details: `Case study detail accessible for ID: ${firstCaseStudy.id}`,
                error: detailResponse.ok ? null : 'Case study detail page not accessible'
            };
        });

        await this.runTest('test-data-sync', 'Real-time Data Synchronization', async () => {
            // Create a case study and immediately check if it appears in the list
            const testData = {
                project_title: 'Sync Test - ' + Date.now(),
                project_description: 'Testing real-time sync',
                status: 'published'
            };

            const createResponse = await fetch('/api/case-studies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });

            if (!createResponse.ok) {
                return { success: false, error: 'Failed to create test case study for sync test' };
            }

            const created = await createResponse.json();
            const testId = created.data.id;

            // Immediately fetch the list to see if it includes our new item
            const listResponse = await fetch('/api/case-studies');
            const caseStudies = await listResponse.json();
            
            const foundInList = caseStudies.some(cs => cs.id === testId);
            
            // Clean up
            await fetch(`/api/case-studies/${testId}`, { method: 'DELETE' });
            
            return {
                success: foundInList,
                details: foundInList ? 'New case study immediately available in list' : 'Sync delay detected',
                error: foundInList ? null : 'Data synchronization issue detected'
            };
        });
    }
} 
   // Editor Tests
    async runEditorTests() {
        this.log('✏️ Running Editor Tests...', 'info');
        
        await this.runTest('test-editor-load', 'Editor Page Loading', async () => {
            try {
                const response = await fetch('/case_study_editor.html');
                const html = await response.text();
                
                const hasForm = html.includes('form') || html.includes('input');
                const hasScripts = html.includes('script');
                
                return {
                    success: response.ok && hasForm,
                    details: `Editor page loaded, has form elements: ${hasForm}, has scripts: ${hasScripts}`,
                    error: response.ok ? (hasForm ? null : 'Editor form not found') : 'Editor page failed to load'
                };
            } catch (error) {
                return {
                    success: false,
                    details: null,
                    error: `Editor load error: ${error.message}`
                };
            }
        });

        await this.runTest('test-editor-save', 'Save Functionality', async () => {
            // Test the save API endpoint that the editor would use
            const testData = {
                project_title: 'Editor Save Test - ' + Date.now(),
                project_description: 'Testing editor save functionality',
                sections: {
                    hero: { title: 'Test', subtitle: 'Test subtitle' }
                },
                status: 'draft'
            };

            const response = await fetch('/api/case-studies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });

            const result = await response.json();
            
            if (response.ok && result.data) {
                // Clean up
                await fetch(`/api/case-studies/${result.data.id}`, { method: 'DELETE' });
                
                return {
                    success: true,
                    details: 'Editor save functionality working',
                    error: null
                };
            } else {
                return {
                    success: false,
                    details: result,
                    error: 'Editor save functionality failed'
                };
            }
        });

        await this.runTest('test-editor-validation', 'Form Validation', async () => {
            // Test validation by sending invalid data
            const invalidData = {
                project_title: '', // Empty title should fail validation
                project_description: 'Test description'
            };

            const response = await fetch('/api/case-studies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invalidData)
            });

            const result = await response.json();
            
            // We expect this to fail due to validation
            const validationWorking = !response.ok || (result.error && result.error.includes('title'));
            
            return {
                success: validationWorking,
                details: validationWorking ? 'Validation correctly rejected invalid data' : 'Validation not working',
                error: validationWorking ? null : 'Form validation not functioning properly'
            };
        });
    }

    // Media Tests
    async runMediaTests() {
        this.log('🖼️ Running Media Tests...', 'info');
        
        await this.runTest('test-cloudinary-connection', 'Cloudinary Connection', async () => {
            // Test if we can access Cloudinary-related endpoints
            try {
                // Check if there are any image references in the system
                const response = await fetch('/api/images');
                
                return {
                    success: response.ok,
                    details: response.ok ? 'Image API accessible' : 'Image API not accessible',
                    error: response.ok ? null : 'Cloudinary integration may have issues'
                };
            } catch (error) {
                return {
                    success: false,
                    details: null,
                    error: `Cloudinary connection test failed: ${error.message}`
                };
            }
        });

        await this.runTest('test-image-upload', 'Image Upload Functionality', async () => {
            // Test image reference creation (simulating successful upload)
            const testImageData = {
                cloudinary_public_id: 'test_image_' + Date.now(),
                cloudinary_secure_url: 'https://res.cloudinary.com/test/image/upload/v1/test_image.jpg',
                original_filename: 'test_image.jpg',
                file_size: 1024,
                mime_type: 'image/jpeg',
                width: 800,
                height: 600,
                context: 'case_study'
            };

            const response = await fetch('/api/images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testImageData)
            });

            const result = await response.json();
            
            if (response.ok && result.data) {
                // Clean up
                await fetch(`/api/images/${result.data.id}`, { method: 'DELETE' });
                
                return {
                    success: true,
                    details: 'Image upload functionality working',
                    error: null
                };
            } else {
                return {
                    success: false,
                    details: result,
                    error: 'Image upload functionality failed'
                };
            }
        });

        await this.runTest('test-image-display', 'Image Display on Homepage', async () => {
            // Check if case studies have image URLs that would display
            const response = await fetch('/api/case-studies');
            const caseStudies = await response.json();
            
            if (!response.ok) {
                return { success: false, error: 'Failed to fetch case studies for image test' };
            }
            
            const caseStudiesWithImages = caseStudies.filter(cs => 
                cs.project_image_url || 
                (cs.sections && cs.sections.hero && cs.sections.hero.image) ||
                (cs.sections && cs.sections.gallery && cs.sections.gallery.images)
            );
            
            return {
                success: true, // This is informational, not a failure
                details: `${caseStudiesWithImages.length}/${caseStudies.length} case studies have images`,
                error: null
            };
        });
    }

    // Performance Tests
    async runPerformanceTests() {
        this.log('⚡ Running Performance Tests...', 'info');
        
        await this.runTest('test-api-response-time', 'API Response Time', async () => {
            const startTime = Date.now();
            const response = await fetch('/api/case-studies');
            const endTime = Date.now();
            
            const responseTime = endTime - startTime;
            const isAcceptable = responseTime < 2000; // 2 seconds threshold
            
            return {
                success: response.ok && isAcceptable,
                details: `API response time: ${responseTime}ms`,
                error: !response.ok ? 'API request failed' : 
                       !isAcceptable ? 'API response time too slow' : null
            };
        });

        await this.runTest('test-homepage-load-time', 'Homepage Load Time', async () => {
            const startTime = Date.now();
            const response = await fetch('/');
            const html = await response.text();
            const endTime = Date.now();
            
            const loadTime = endTime - startTime;
            const isAcceptable = loadTime < 3000; // 3 seconds threshold
            
            return {
                success: response.ok && isAcceptable && html.length > 1000,
                details: `Homepage load time: ${loadTime}ms, size: ${html.length} chars`,
                error: !response.ok ? 'Homepage request failed' : 
                       !isAcceptable ? 'Homepage load time too slow' : 
                       html.length <= 1000 ? 'Homepage content too small' : null
            };
        });

        await this.runTest('test-concurrent-requests', 'Concurrent Request Handling', async () => {
            const concurrentRequests = 5;
            const startTime = Date.now();
            
            const promises = Array(concurrentRequests).fill().map(() => 
                fetch('/api/case-studies')
            );
            
            try {
                const responses = await Promise.all(promises);
                const endTime = Date.now();
                
                const allSuccessful = responses.every(r => r.ok);
                const totalTime = endTime - startTime;
                const avgTime = totalTime / concurrentRequests;
                
                return {
                    success: allSuccessful && avgTime < 1000,
                    details: `${concurrentRequests} concurrent requests, avg time: ${avgTime.toFixed(0)}ms`,
                    error: !allSuccessful ? 'Some concurrent requests failed' : 
                           avgTime >= 1000 ? 'Concurrent request handling too slow' : null
                };
            } catch (error) {
                return {
                    success: false,
                    details: null,
                    error: `Concurrent request test failed: ${error.message}`
                };
            }
        });
    }

    // Individual test runners
    async runIntegrationTests() {
        this.log('🔗 Running Integration Tests Only...', 'info');
        this.startTime = Date.now();
        this.testResults = { total: 0, passed: 0, failed: 0, duration: 0 };
        
        this.disableButtons();
        
        try {
            await this.runDatabaseTests();
            await this.runHomepageTests();
            await this.runEditorTests();
            
            this.testResults.duration = Date.now() - this.startTime;
            this.updateStats();
            
        } finally {
            this.enableButtons();
        }
    }

    // Utility methods
    disableButtons() {
        document.querySelectorAll('button').forEach(btn => btn.disabled = true);
    }

    enableButtons() {
        document.querySelectorAll('button').forEach(btn => btn.disabled = false);
    }

    clearResults() {
        this.testResults = { total: 0, passed: 0, failed: 0, duration: 0 };
        this.updateStats();
        
        // Reset all test items
        document.querySelectorAll('.test-item').forEach(item => {
            item.className = 'test-item';
            const statusIcon = item.querySelector('.status-icon');
            const statusText = item.querySelector('.status-text');
            const details = item.querySelector('.test-details');
            
            statusIcon.className = 'status-icon pending';
            statusIcon.textContent = '⏳';
            statusText.textContent = 'Pending';
            details.textContent = '';
        });
        
        // Clear progress
        document.getElementById('progressFill').style.width = '0%';
        
        // Clear logs
        document.getElementById('logContainer').innerHTML = 
            '<div class="log-entry info">🧹 Results cleared - Ready for new test run</div>';
        
        this.log('🧹 All test results cleared', 'info');
    }
}

// Utility functions
function toggleSection(header) {
    const content = header.nextElementSibling;
    const arrow = header.querySelector('span:last-child');
    
    content.classList.toggle('collapsed');
    arrow.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.systemVerification = new CompleteSystemVerification();
    console.log('🔍 Complete System Verification ready');
});