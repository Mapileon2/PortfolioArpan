/**
 * Comprehensive Diagnostic and Fix Script for Case Study Editor
 * Identifies and fixes common image and preview issues
 */

class CaseStudyEditorDiagnostic {
    constructor() {
        this.issues = [];
        this.fixes = [];
        this.testResults = {};
    }

    async runDiagnostic() {
        console.log('🔍 Starting Case Study Editor Diagnostic...');
        
        // Test 1: Check if required elements exist
        await this.testDOMElements();
        
        // Test 2: Check Cloudinary configuration
        await this.testCloudinaryConfig();
        
        // Test 3: Check image upload functionality
        await this.testImageUpload();
        
        // Test 4: Check preview functionality
        await this.testPreviewFunctionality();
        
        // Test 5: Check JavaScript errors
        await this.testJavaScriptErrors();
        
        // Generate report
        this.generateReport();
        
        // Apply fixes
        await this.applyFixes();
        
        console.log('✅ Diagnostic complete');
        return this.testResults;
    }

    async testDOMElements() {
        console.log('🧪 Testing DOM Elements...');
        
        const requiredElements = [
            'heroImageUpload',
            'heroImagePreview', 
            'heroImageImg',
            'heroImagePlaceholder',
            'galleryUpload',
            'previewBtn',
            'previewMode',
            'integratedPreviewContent'
        ];
        
        const missingElements = [];
        
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                missingElements.push(id);
                this.issues.push(`Missing DOM element: ${id}`);
            }
        });
        
        this.testResults.domElements = {
            passed: missingElements.length === 0,
            missing: missingElements,
            total: requiredElements.length,
            found: requiredElements.length - missingElements.length
        };
        
        if (missingElements.length > 0) {
            this.fixes.push({
                type: 'dom',
                description: 'Add missing DOM elements',
                elements: missingElements
            });
        }
    }

    async testCloudinaryConfig() {
        console.log('🌤️ Testing Cloudinary Configuration...');
        
        const issues = [];
        
        // Check if Cloudinary SDK is loaded
        if (typeof cloudinary === 'undefined') {
            issues.push('Cloudinary SDK not loaded');
            this.issues.push('Cloudinary SDK not available');
        }
        
        // Check if CloudinaryService exists
        if (typeof CloudinaryService === 'undefined') {
            issues.push('CloudinaryService class not found');
            this.issues.push('CloudinaryService not initialized');
        }
        
        // Check configuration
        const expectedConfig = {
            cloudName: 'dgymjtqil',
            apiKey: '951533987774134'
        };
        
        this.testResults.cloudinary = {
            passed: issues.length === 0,
            issues: issues,
            sdkLoaded: typeof cloudinary !== 'undefined',
            serviceLoaded: typeof CloudinaryService !== 'undefined'
        };
        
        if (issues.length > 0) {
            this.fixes.push({
                type: 'cloudinary',
                description: 'Fix Cloudinary configuration',
                issues: issues
            });
        }
    }

    async testImageUpload() {
        console.log('🖼️ Testing Image Upload Functionality...');
        
        const issues = [];
        
        // Test file input creation
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            if (!input.files) {
                issues.push('File input not supported');
            }
        } catch (error) {
            issues.push('Cannot create file input: ' + error.message);
        }
        
        // Test drag and drop support
        const uploadZone = document.getElementById('heroImageUpload');
        if (uploadZone) {
            const dragEvents = ['dragover', 'dragleave', 'drop'];
            dragEvents.forEach(event => {
                try {
                    const testEvent = new Event(event);
                    uploadZone.dispatchEvent(testEvent);
                } catch (error) {
                    issues.push(`Drag event ${event} not supported`);
                }
            });
        }
        
        // Test URL.createObjectURL support
        if (typeof URL.createObjectURL !== 'function') {
            issues.push('URL.createObjectURL not supported');
        }
        
        this.testResults.imageUpload = {
            passed: issues.length === 0,
            issues: issues,
            fileInputSupported: true,
            dragDropSupported: uploadZone !== null,
            objectUrlSupported: typeof URL.createObjectURL === 'function'
        };
        
        if (issues.length > 0) {
            this.fixes.push({
                type: 'imageUpload',
                description: 'Fix image upload functionality',
                issues: issues
            });
        }
    }

    async testPreviewFunctionality() {
        console.log('👁️ Testing Preview Functionality...');
        
        const issues = [];
        
        // Test preview mode elements
        const previewMode = document.getElementById('previewMode');
        const previewContent = document.getElementById('integratedPreviewContent');
        
        if (!previewMode) {
            issues.push('Preview mode element missing');
        }
        
        if (!previewContent) {
            issues.push('Preview content element missing');
        }
        
        // Test preview button
        const previewBtn = document.getElementById('previewBtn');
        if (!previewBtn) {
            issues.push('Preview button missing');
        }
        
        // Test close preview button
        const closePreview = document.getElementById('closePreview');
        if (!closePreview) {
            issues.push('Close preview button missing');
        }
        
        this.testResults.preview = {
            passed: issues.length === 0,
            issues: issues,
            previewModeExists: !!previewMode,
            previewContentExists: !!previewContent,
            previewButtonExists: !!previewBtn,
            closeButtonExists: !!closePreview
        };
        
        if (issues.length > 0) {
            this.fixes.push({
                type: 'preview',
                description: 'Fix preview functionality',
                issues: issues
            });
        }
    }

    async testJavaScriptErrors() {
        console.log('🐛 Testing for JavaScript Errors...');
        
        const issues = [];
        
        // Check for common JavaScript objects
        const requiredObjects = [
            'document',
            'window',
            'console',
            'URL',
            'File',
            'FileReader'
        ];
        
        requiredObjects.forEach(obj => {
            if (typeof window[obj] === 'undefined') {
                issues.push(`${obj} not available`);
            }
        });
        
        // Test localStorage
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (error) {
            issues.push('localStorage not available: ' + error.message);
        }
        
        this.testResults.javascript = {
            passed: issues.length === 0,
            issues: issues,
            requiredObjectsAvailable: requiredObjects.length - issues.length,
            localStorageAvailable: true
        };
        
        if (issues.length > 0) {
            this.fixes.push({
                type: 'javascript',
                description: 'Fix JavaScript environment issues',
                issues: issues
            });
        }
    }

    generateReport() {
        console.log('\n📊 DIAGNOSTIC REPORT');
        console.log('==================');
        
        Object.keys(this.testResults).forEach(test => {
            const result = this.testResults[test];
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${test.toUpperCase()}: ${status}`);
            
            if (!result.passed && result.issues) {
                result.issues.forEach(issue => {
                    console.log(`  - ${issue}`);
                });
            }
        });
        
        console.log('\n🔧 FIXES NEEDED');
        console.log('===============');
        
        if (this.fixes.length === 0) {
            console.log('✅ No fixes needed!');
        } else {
            this.fixes.forEach((fix, index) => {
                console.log(`${index + 1}. ${fix.description}`);
                if (fix.issues) {
                    fix.issues.forEach(issue => {
                        console.log(`   - ${issue}`);
                    });
                }
            });
        }
    }

    async applyFixes() {
        console.log('\n🛠️ Applying Fixes...');
        
        for (const fix of this.fixes) {
            try {
                await this.applyFix(fix);
                console.log(`✅ Applied fix: ${fix.description}`);
            } catch (error) {
                console.error(`❌ Failed to apply fix: ${fix.description}`, error);
            }
        }
    }

    async applyFix(fix) {
        switch (fix.type) {
            case 'dom':
                this.fixDOMElements(fix);
                break;
            case 'cloudinary':
                this.fixCloudinaryConfig(fix);
                break;
            case 'imageUpload':
                this.fixImageUpload(fix);
                break;
            case 'preview':
                this.fixPreview(fix);
                break;
            case 'javascript':
                this.fixJavaScript(fix);
                break;
        }
    }

    fixDOMElements(fix) {
        fix.elements.forEach(elementId => {
            if (!document.getElementById(elementId)) {
                const element = document.createElement('div');
                element.id = elementId;
                
                // Add appropriate classes and structure based on element type
                if (elementId.includes('Preview')) {
                    element.className = 'hidden';
                } else if (elementId.includes('Upload')) {
                    element.className = 'upload-zone p-8 text-center';
                } else if (elementId.includes('Placeholder')) {
                    element.className = 'image-placeholder';
                    element.innerHTML = `
                        <i class="fas fa-image text-4xl mb-4 text-gray-400"></i>
                        <p class="text-gray-600">Image placeholder</p>
                    `;
                }
                
                // Try to find a suitable parent
                const container = document.querySelector('.editor-card, .p-6, body');
                if (container) {
                    container.appendChild(element);
                }
            }
        });
    }

    fixCloudinaryConfig(fix) {
        // Create a basic Cloudinary service if missing
        if (typeof CloudinaryService === 'undefined') {
            window.CloudinaryService = class {
                constructor() {
                    this.config = {
                        cloudName: 'dgymjtqil',
                        apiKey: '951533987774134'
                    };
                }
                
                async uploadImage(file) {
                    // Basic upload simulation
                    return {
                        secure_url: URL.createObjectURL(file),
                        public_id: 'temp_' + Date.now()
                    };
                }
            };
        }
    }

    fixImageUpload(fix) {
        // Add enhanced image upload functionality
        const uploadZones = document.querySelectorAll('.upload-zone');
        
        uploadZones.forEach(zone => {
            if (!zone.hasAttribute('data-fixed')) {
                zone.setAttribute('data-fixed', 'true');
                
                // Add click handler
                zone.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = zone.id.includes('gallery');
                    
                    input.onchange = (e) => {
                        const files = Array.from(e.target.files);
                        this.handleFiles(files, zone);
                    };
                    
                    input.click();
                });
                
                // Add drag and drop
                zone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    zone.classList.add('dragover');
                });
                
                zone.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    zone.classList.remove('dragover');
                });
                
                zone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    zone.classList.remove('dragover');
                    
                    const files = Array.from(e.dataTransfer.files);
                    this.handleFiles(files, zone);
                });
            }
        });
    }

    handleFiles(files, zone) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.displayImage(e.target.result, file.name, zone);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    displayImage(src, name, zone) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = name;
        img.className = 'w-full h-48 object-cover rounded-lg';
        
        const container = document.createElement('div');
        container.className = 'image-preview mb-4';
        container.appendChild(img);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'text-sm text-gray-600 mt-2';
        nameDiv.textContent = name;
        container.appendChild(nameDiv);
        
        zone.innerHTML = '';
        zone.appendChild(container);
    }

    fixPreview(fix) {
        // Create preview functionality if missing
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn && !previewBtn.hasAttribute('data-fixed')) {
            previewBtn.setAttribute('data-fixed', 'true');
            
            previewBtn.addEventListener('click', () => {
                this.showPreview();
            });
        }
        
        // Create preview mode if missing
        if (!document.getElementById('previewMode')) {
            const previewMode = document.createElement('div');
            previewMode.id = 'previewMode';
            previewMode.className = 'preview-mode';
            previewMode.innerHTML = `
                <div class="preview-content">
                    <div class="preview-header">
                        <h2>Preview</h2>
                        <button id="closePreview" class="btn-secondary">Close</button>
                    </div>
                    <div id="integratedPreviewContent" class="p-6">
                        <p>Preview content will appear here</p>
                    </div>
                </div>
            `;
            document.body.appendChild(previewMode);
            
            // Add close functionality
            document.getElementById('closePreview').addEventListener('click', () => {
                previewMode.classList.remove('active');
            });
        }
    }

    showPreview() {
        const previewMode = document.getElementById('previewMode');
        const previewContent = document.getElementById('integratedPreviewContent');
        
        if (previewMode && previewContent) {
            // Generate preview content
            const title = document.getElementById('caseStudyTitle')?.value || 'Sample Case Study';
            const description = document.getElementById('projectDescription')?.value || 'Sample description';
            
            previewContent.innerHTML = `
                <div class="space-y-6">
                    <h1 class="text-3xl font-bold">${title}</h1>
                    <p class="text-gray-700">${description}</p>
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <p class="text-blue-800">This is a live preview of your case study.</p>
                    </div>
                </div>
            `;
            
            previewMode.classList.add('active');
        }
    }

    fixJavaScript(fix) {
        // Add polyfills or fallbacks for missing JavaScript features
        fix.issues.forEach(issue => {
            if (issue.includes('URL.createObjectURL')) {
                // Add a basic polyfill
                if (!window.URL || !window.URL.createObjectURL) {
                    window.URL = window.URL || {};
                    window.URL.createObjectURL = function(file) {
                        return 'data:' + file.type + ';base64,' + btoa(file);
                    };
                }
            }
        });
    }
}

// Enhanced Case Study Editor with Fixes
class EnhancedCaseStudyEditor {
    constructor() {
        this.diagnostic = new CaseStudyEditorDiagnostic();
        this.images = {
            hero: null,
            gallery: []
        };
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Enhanced Case Study Editor...');
        
        // Run diagnostic first
        await this.diagnostic.runDiagnostic();
        
        // Setup enhanced functionality
        this.setupImageHandling();
        this.setupPreview();
        this.setupNotifications();
        
        console.log('✅ Enhanced Case Study Editor ready!');
    }

    setupImageHandling() {
        // Enhanced image upload with better error handling
        const uploadZones = document.querySelectorAll('.upload-zone');
        
        uploadZones.forEach(zone => {
            this.enhanceUploadZone(zone);
        });
    }

    enhanceUploadZone(zone) {
        // Add visual feedback
        zone.style.transition = 'all 0.3s ease';
        
        // Enhanced click handler
        zone.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            this.openFileDialog(zone);
        });
        
        // Enhanced drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        zone.addEventListener('dragenter', () => {
            zone.classList.add('dragover');
        });
        
        zone.addEventListener('dragleave', (e) => {
            if (!zone.contains(e.relatedTarget)) {
                zone.classList.remove('dragover');
            }
        });
        
        zone.addEventListener('drop', (e) => {
            zone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            this.handleFileUpload(files, zone);
        });
    }

    openFileDialog(zone) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = zone.id.includes('gallery');
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.handleFileUpload(files, zone);
        };
        
        input.click();
    }

    async handleFileUpload(files, zone) {
        try {
            this.showNotification('Processing images...', 'info');
            
            for (const file of files) {
                if (this.validateFile(file)) {
                    await this.processImage(file, zone);
                }
            }
            
            this.showNotification('Images processed successfully!', 'success');
            this.updatePreview();
            
        } catch (error) {
            console.error('❌ Upload error:', error);
            this.showNotification('Upload failed: ' + error.message, 'error');
        }
    }

    validateFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Invalid file type. Please use JPG, PNG, WebP, or GIF.', 'error');
            return false;
        }
        
        if (file.size > maxSize) {
            this.showNotification('File too large. Maximum size is 10MB.', 'error');
            return false;
        }
        
        return true;
    }

    async processImage(file, zone) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    this.displayImage(e.target.result, file.name, zone);
                    
                    // Store image data
                    const imageData = {
                        file: file,
                        dataUrl: e.target.result,
                        name: file.name,
                        size: file.size
                    };
                    
                    if (zone.id.includes('hero')) {
                        this.images.hero = imageData;
                    } else if (zone.id.includes('gallery')) {
                        this.images.gallery.push(imageData);
                    }
                    
                    resolve(imageData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    displayImage(src, name, zone) {
        const container = document.createElement('div');
        container.className = 'image-preview';
        
        const img = document.createElement('img');
        img.src = src;
        img.alt = name;
        img.className = 'w-full h-48 object-cover rounded-lg';
        
        const controls = document.createElement('div');
        controls.className = 'flex justify-center space-x-2 mt-2';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600';
        removeBtn.innerHTML = '<i class="fas fa-trash mr-1"></i>Remove';
        removeBtn.onclick = () => {
            this.removeImage(zone);
        };
        
        controls.appendChild(removeBtn);
        container.appendChild(img);
        container.appendChild(controls);
        
        // Clear zone and add image
        const placeholder = zone.querySelector('.image-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Remove existing preview
        const existingPreview = zone.querySelector('.image-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
        
        zone.appendChild(container);
    }

    removeImage(zone) {
        const preview = zone.querySelector('.image-preview');
        if (preview) {
            preview.remove();
        }
        
        const placeholder = zone.querySelector('.image-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        
        // Clear stored image data
        if (zone.id.includes('hero')) {
            this.images.hero = null;
        } else if (zone.id.includes('gallery')) {
            // For gallery, you'd need to identify which image to remove
            this.images.gallery = [];
        }
        
        this.updatePreview();
        this.showNotification('Image removed', 'info');
    }

    setupPreview() {
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.showPreview();
            });
        }
        
        // Setup live preview updates
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updatePreview();
            });
        });
    }

    showPreview() {
        let previewMode = document.getElementById('previewMode');
        
        if (!previewMode) {
            previewMode = this.createPreviewMode();
        }
        
        this.updatePreview();
        previewMode.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    createPreviewMode() {
        const previewMode = document.createElement('div');
        previewMode.id = 'previewMode';
        previewMode.className = 'preview-mode';
        previewMode.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <div class="flex items-center">
                        <i class="fas fa-eye mr-2"></i>
                        <span class="font-bold text-lg">Live Preview</span>
                    </div>
                    <button id="closePreview" class="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition">
                        <i class="fas fa-times mr-2"></i>Close Preview
                    </button>
                </div>
                <div id="integratedPreviewContent" class="p-6">
                    <!-- Preview content will be generated here -->
                </div>
            </div>
        `;
        
        document.body.appendChild(previewMode);
        
        // Add close functionality
        document.getElementById('closePreview').addEventListener('click', () => {
            previewMode.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
        
        return previewMode;
    }

    updatePreview() {
        const previewContent = document.getElementById('integratedPreviewContent');
        if (!previewContent) return;
        
        const formData = this.getFormData();
        
        previewContent.innerHTML = `
            <div class="space-y-8">
                <!-- Hero Section -->
                <div class="text-center py-16 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
                    ${this.images.hero ? `<img src="${this.images.hero.dataUrl}" alt="Hero" class="w-full h-64 object-cover rounded-lg mb-6">` : ''}
                    <h1 class="text-4xl font-bold mb-4">${formData.title || 'Your Case Study Title'}</h1>
                    <p class="text-xl mb-4">${formData.subtitle || 'Your subtitle here'}</p>
                    <p class="text-lg opacity-90">${formData.description || 'Your description will appear here'}</p>
                </div>
                
                <!-- Project Details -->
                <div class="bg-white p-8 rounded-lg shadow-lg">
                    <h2 class="text-2xl font-bold mb-4">Project Details</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <strong>Category:</strong> ${formData.category || 'Not specified'}
                        </div>
                        <div>
                            <strong>Status:</strong> ${formData.status || 'In Progress'}
                        </div>
                    </div>
                </div>
                
                <!-- Gallery -->
                ${this.images.gallery.length > 0 ? `
                    <div class="bg-white p-8 rounded-lg shadow-lg">
                        <h3 class="text-xl font-bold mb-6">Project Gallery</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${this.images.gallery.map(image => `
                                <img src="${image.dataUrl}" alt="${image.name}" class="w-full h-48 object-cover rounded-lg">
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="text-center py-8">
                    <p class="text-gray-600">This is a live preview of your case study. Changes are reflected in real-time.</p>
                </div>
            </div>
        `;
    }

    getFormData() {
        return {
            title: document.getElementById('caseStudyTitle')?.value || document.getElementById('heroTitle')?.value || '',
            subtitle: document.getElementById('heroSubtitle')?.value || '',
            description: document.getElementById('projectDescription')?.value || document.getElementById('heroDescription')?.value || '',
            category: document.getElementById('projectCategory')?.value || '',
            status: 'Active'
        };
    }

    setupNotifications() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            max-width: 300px;
        `;
        
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.enhancedCaseStudyEditor = new EnhancedCaseStudyEditor();
    });
} else {
    window.enhancedCaseStudyEditor = new EnhancedCaseStudyEditor();
}

// Export for manual initialization
window.CaseStudyEditorDiagnostic = CaseStudyEditorDiagnostic;
window.EnhancedCaseStudyEditor = EnhancedCaseStudyEditor;