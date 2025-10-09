/**
 * Case Study Image Editor
 * Complete integration with Cloudinary SDK for case study image management
 * Includes preview functionality, drag-drop, image galleries, and CRUD operations
 */

class CaseStudyImageEditor {
    constructor() {
        this.images = {
            hero: null,
            gallery: [],
            process: [],
            results: []
        };
        this.currentSection = 'hero';
        this.previewMode = false;
        this.unsavedChanges = false;
        
        this.init();
    }

    async init() {
        console.log('📝 Initializing Case Study Image Editor...');
        
        // Wait for Cloudinary SDK to be ready
        await this.waitForCloudinarySDK();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize editor interface
        this.initializeEditor();
        
        // Load existing case study images if editing
        await this.loadExistingImages();
        
        console.log('✅ Case Study Image Editor ready!');
    }

    async waitForCloudinarySDK() {
        let attempts = 0;
        while (!window.cloudinarySDK && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.cloudinarySDK) {
            console.error('❌ Cloudinary SDK not available');
            throw new Error('Cloudinary SDK not loaded');
        }
    }

    setupEventListeners() {
        // Listen for Cloudinary upload events
        document.addEventListener('cloudinary-upload-success', (e) => {
            this.handleImageUpload(e.detail);
        });

        document.addEventListener('cloudinary-preview-ready', (e) => {
            this.handleImagePreview(e.detail);
        });

        document.addEventListener('cloudinary-upload-progress', (e) => {
            this.updateUploadProgress(e.detail);
        });

        // Setup drag and drop for all sections
        this.setupDragAndDrop();
        
        // Auto-save functionality
        this.setupAutoSave();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupDragAndDrop() {
        const dropZones = ['heroDropZone', 'galleryDropZone', 'processDropZone', 'resultsDropZone'];
        
        dropZones.forEach(zoneId => {
            const zone = document.getElementById(zoneId);
            if (!zone) return;

            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', async (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                const files = Array.from(e.dataTransfer.files).filter(file => 
                    file.type.startsWith('image/')
                );

                if (files.length > 0) {
                    const section = zoneId.replace('DropZone', '');
                    await this.uploadImagesForSection(files, section);
                }
            });
        });
    }

    setupAutoSave() {
        // Auto-save every 30 seconds if there are unsaved changes
        setInterval(() => {
            if (this.unsavedChanges) {
                this.autoSave();
            }
        }, 30000);

        // Save on page unload
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCaseStudy();
            }
            
            // Ctrl/Cmd + P to toggle preview
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.togglePreview();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    initializeEditor() {
        const container = document.getElementById('caseStudyImageEditor');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg">
                <!-- Editor Header -->
                <div class="border-b border-gray-200 p-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-900">Case Study Image Editor</h2>
                        <div class="flex space-x-3">
                            <button onclick="window.caseStudyImageEditor.togglePreview()" 
                                    class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
                                <i class="fas fa-eye mr-2"></i>Preview
                            </button>
                            <button onclick="window.caseStudyImageEditor.saveCaseStudy()" 
                                    class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                                <i class="fas fa-save mr-2"></i>Save
                            </button>
                        </div>
                    </div>
                    
                    <!-- Section Tabs -->
                    <div class="mt-4 flex space-x-1 bg-gray-100 rounded-lg p-1">
                        ${['hero', 'gallery', 'process', 'results'].map(section => `
                            <button onclick="window.caseStudyImageEditor.switchSection('${section}')" 
                                    class="section-tab flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                                        this.currentSection === section 
                                            ? 'bg-white text-blue-600 shadow-sm' 
                                            : 'text-gray-600 hover:text-gray-900'
                                    }">
                                ${this.getSectionIcon(section)} ${this.getSectionTitle(section)}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Editor Content -->
                <div class="p-6">
                    <div id="editorContent">
                        ${this.renderSectionEditor(this.currentSection)}
                    </div>
                </div>

                <!-- Upload Progress -->
                <div id="uploadProgress" class="hidden fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
                    <div class="flex items-center space-x-3">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">Uploading...</div>
                            <div class="text-xs text-gray-500" id="uploadProgressText">0%</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSectionIcon(section) {
        const icons = {
            hero: '<i class="fas fa-image mr-2"></i>',
            gallery: '<i class="fas fa-images mr-2"></i>',
            process: '<i class="fas fa-cogs mr-2"></i>',
            results: '<i class="fas fa-chart-line mr-2"></i>'
        };
        return icons[section] || '<i class="fas fa-folder mr-2"></i>';
    }

    getSectionTitle(section) {
        const titles = {
            hero: 'Hero Image',
            gallery: 'Gallery',
            process: 'Process',
            results: 'Results'
        };
        return titles[section] || section.charAt(0).toUpperCase() + section.slice(1);
    }

    switchSection(section) {
        this.currentSection = section;
        
        // Update tab styles
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.className = tab.className.replace('bg-white text-blue-600 shadow-sm', 'text-gray-600 hover:text-gray-900');
        });
        
        document.querySelector(`[onclick="window.caseStudyImageEditor.switchSection('${section}')"]`)
            .className = document.querySelector(`[onclick="window.caseStudyImageEditor.switchSection('${section}')"]`)
            .className.replace('text-gray-600 hover:text-gray-900', 'bg-white text-blue-600 shadow-sm');
        
        // Render section content
        document.getElementById('editorContent').innerHTML = this.renderSectionEditor(section);
    }

    renderSectionEditor(section) {
        switch (section) {
            case 'hero':
                return this.renderHeroEditor();
            case 'gallery':
                return this.renderGalleryEditor();
            case 'process':
                return this.renderProcessEditor();
            case 'results':
                return this.renderResultsEditor();
            default:
                return '<div class="text-center py-12 text-gray-500">Section not found</div>';
        }
    }

    renderHeroEditor() {
        const heroImage = this.images.hero;
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Hero Image</h3>
                    <button onclick="window.caseStudyImageEditor.uploadHeroImage()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i>Upload Hero Image
                    </button>
                </div>

                <!-- Drop Zone -->
                <div id="heroDropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center transition-colors hover:border-blue-500">
                    ${heroImage ? `
                        <div class="relative group">
                            <img src="${heroImage.url}" alt="Hero Image" class="max-w-full h-64 object-cover rounded-lg mx-auto">
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center rounded-lg">
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                                    <button onclick="window.caseStudyImageEditor.editHeroImage()" 
                                            class="bg-white text-gray-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.caseStudyImageEditor.removeHeroImage()" 
                                            class="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="mt-4 text-sm text-gray-600">
                            <p><strong>Title:</strong> ${heroImage.title || 'Untitled'}</p>
                            <p><strong>Dimensions:</strong> ${heroImage.width} × ${heroImage.height}</p>
                            <p><strong>Size:</strong> ${(heroImage.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    ` : `
                        <i class="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-900 mb-2">Upload Hero Image</h3>
                        <p class="text-gray-600 mb-4">Drag and drop your hero image here, or click to select</p>
                        <p class="text-sm text-gray-500">Recommended: 1920×1080px, JPG or PNG, max 10MB</p>
                    `}
                </div>

                ${heroImage ? `
                    <!-- Hero Image Settings -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="font-semibold text-gray-900 mb-3">Hero Image Settings</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Alt Text</label>
                                <input type="text" value="${heroImage.alt || ''}" 
                                       onchange="window.caseStudyImageEditor.updateHeroAlt(this.value)"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="Describe the image for accessibility">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                                <input type="text" value="${heroImage.caption || ''}" 
                                       onchange="window.caseStudyImageEditor.updateHeroCaption(this.value)"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="Optional caption">
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderGalleryEditor() {
        const galleryImages = this.images.gallery;
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Image Gallery</h3>
                    <button onclick="window.caseStudyImageEditor.uploadGalleryImages()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i>Add Images
                    </button>
                </div>

                <!-- Drop Zone -->
                <div id="galleryDropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors hover:border-blue-500">
                    <i class="fas fa-images text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Add Gallery Images</h3>
                    <p class="text-gray-600 mb-4">Drag and drop multiple images here, or click to select</p>
                    <p class="text-sm text-gray-500">Supports JPG, PNG, WebP. Max 10MB per image</p>
                </div>

                <!-- Gallery Grid -->
                ${galleryImages.length > 0 ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${galleryImages.map((image, index) => this.renderGalleryImageCard(image, index)).join('')}
                    </div>
                ` : `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-images text-4xl mb-4"></i>
                        <p>No gallery images yet. Upload some to get started!</p>
                    </div>
                `}
            </div>
        `;
    }

    renderProcessEditor() {
        const processImages = this.images.process;
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Process Images</h3>
                    <button onclick="window.caseStudyImageEditor.uploadProcessImages()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i>Add Process Images
                    </button>
                </div>

                <!-- Drop Zone -->
                <div id="processDropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors hover:border-blue-500">
                    <i class="fas fa-cogs text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Add Process Images</h3>
                    <p class="text-gray-600 mb-4">Show your design process, wireframes, mockups, etc.</p>
                    <p class="text-sm text-gray-500">Drag and drop images or click to select</p>
                </div>

                <!-- Process Steps -->
                ${processImages.length > 0 ? `
                    <div class="space-y-6">
                        ${processImages.map((image, index) => this.renderProcessStep(image, index)).join('')}
                    </div>
                ` : `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-cogs text-4xl mb-4"></i>
                        <p>No process images yet. Add images to show your workflow!</p>
                    </div>
                `}
            </div>
        `;
    }

    renderResultsEditor() {
        const resultsImages = this.images.results;
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Results & Outcomes</h3>
                    <button onclick="window.caseStudyImageEditor.uploadResultsImages()" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i>Add Results
                    </button>
                </div>

                <!-- Drop Zone -->
                <div id="resultsDropZone" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors hover:border-blue-500">
                    <i class="fas fa-chart-line text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Add Results Images</h3>
                    <p class="text-gray-600 mb-4">Screenshots, analytics, before/after comparisons</p>
                    <p class="text-sm text-gray-500">Drag and drop images or click to select</p>
                </div>

                <!-- Results Grid -->
                ${resultsImages.length > 0 ? `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${resultsImages.map((image, index) => this.renderResultsImageCard(image, index)).join('')}
                    </div>
                ` : `
                    <div class="text-center py-12 text-gray-500">
                        <i class="fas fa-chart-line text-4xl mb-4"></i>
                        <p>No results images yet. Show the impact of your work!</p>
                    </div>
                `}
            </div>
        `;
    }

    renderGalleryImageCard(image, index) {
        return `
            <div class="relative group bg-white rounded-lg shadow-md overflow-hidden" draggable="true" 
                 ondragstart="window.caseStudyImageEditor.handleDragStart(event, 'gallery', ${index})">
                <img src="${image.thumbnail}" alt="${image.title}" class="w-full h-48 object-cover">
                
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                        <button onclick="window.caseStudyImageEditor.previewImage('gallery', ${index})" 
                                class="bg-white text-gray-900 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition">
                            <i class="fas fa-eye text-sm"></i>
                        </button>
                        <button onclick="window.caseStudyImageEditor.editImage('gallery', ${index})" 
                                class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-600 transition">
                            <i class="fas fa-edit text-sm"></i>
                        </button>
                        <button onclick="window.caseStudyImageEditor.removeImage('gallery', ${index})" 
                                class="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>

                <div class="p-3">
                    <h4 class="font-medium text-gray-900 text-sm truncate">${image.title}</h4>
                    <p class="text-xs text-gray-500 mt-1">${image.width} × ${image.height}</p>
                </div>
            </div>
        `;
    }

    renderProcessStep(image, index) {
        return `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            ${index + 1}
                        </div>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h4 class="font-semibold text-gray-900">${image.title}</h4>
                                <p class="text-gray-600 text-sm">${image.description || 'No description'}</p>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="window.caseStudyImageEditor.editImage('process', ${index})" 
                                        class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="window.caseStudyImageEditor.removeImage('process', ${index})" 
                                        class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <img src="${image.url}" alt="${image.title}" class="w-full max-w-md rounded-lg">
                    </div>
                </div>
            </div>
        `;
    }

    renderResultsImageCard(image, index) {
        return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                <img src="${image.url}" alt="${image.title}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-gray-900">${image.title}</h4>
                        <div class="flex space-x-2">
                            <button onclick="window.caseStudyImageEditor.editImage('results', ${index})" 
                                    class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="window.caseStudyImageEditor.removeImage('results', ${index})" 
                                    class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-gray-600 text-sm">${image.description || 'No description'}</p>
                    ${image.metrics ? `
                        <div class="mt-3 text-xs text-gray-500">
                            <strong>Impact:</strong> ${image.metrics}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Upload Methods
    async uploadHeroImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.processImageUpload(file, 'hero');
            }
        };
        input.click();
    }

    async uploadGalleryImages() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            await this.uploadImagesForSection(files, 'gallery');
        };
        input.click();
    }

    async uploadProcessImages() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            await this.uploadImagesForSection(files, 'process');
        };
        input.click();
    }

    async uploadResultsImages() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            await this.uploadImagesForSection(files, 'results');
        };
        input.click();
    }

    async uploadImagesForSection(files, section) {
        for (const file of files) {
            await this.processImageUpload(file, section);
        }
    }

    async processImageUpload(file, section) {
        try {
            console.log(`🔄 Processing ${section} image upload: ${file.name}`);
            
            this.showUploadProgress(true);
            
            const result = await window.cloudinarySDK.uploadImageWithPreview(file, {
                folder: `portfolio/case-studies/${section}`,
                tags: ['case-study', section],
                transformation: this.getTransformationForSection(section)
            });

            const imageData = {
                id: result.publicId,
                url: result.url,
                thumbnail: result.thumbnail,
                title: file.name.replace(/\.[^/.]+$/, ""),
                description: '',
                publicId: result.publicId,
                width: result.width,
                height: result.height,
                size: result.size,
                createdAt: new Date().toISOString(),
                alt: '',
                caption: '',
                section: section
            };

            // Add to appropriate section
            if (section === 'hero') {
                this.images.hero = imageData;
            } else {
                this.images[section].push(imageData);
            }

            this.unsavedChanges = true;
            this.switchSection(section); // Refresh the current section
            
            this.showUploadProgress(false);
            this.showNotification('success', `${section} image uploaded successfully!`);
            
        } catch (error) {
            console.error(`❌ Failed to upload ${section} image:`, error);
            this.showUploadProgress(false);
            this.showNotification('error', `Failed to upload image: ${error.message}`);
        }
    }

    getTransformationForSection(section) {
        const transformations = {
            hero: [
                { width: 1920, height: 1080, crop: 'fill' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            gallery: [
                { width: 800, height: 600, crop: 'fill' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            process: [
                { width: 1200, crop: 'scale' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            results: [
                { width: 1000, crop: 'scale' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        };
        
        return transformations[section] || [{ quality: 'auto:good' }];
    }

    // Image Management Methods
    previewImage(section, index) {
        const image = section === 'hero' ? this.images.hero : this.images[section][index];
        if (image) {
            window.cloudinarySDK.showImageModal(image.publicId);
        }
    }

    editImage(section, index) {
        const image = section === 'hero' ? this.images.hero : this.images[section][index];
        if (image) {
            this.showEditImageModal(image, section, index);
        }
    }

    removeImage(section, index) {
        const image = section === 'hero' ? this.images.hero : this.images[section][index];
        
        if (confirm(`Are you sure you want to remove "${image.title}"?`)) {
            if (section === 'hero') {
                this.images.hero = null;
            } else {
                this.images[section].splice(index, 1);
            }
            
            this.unsavedChanges = true;
            this.switchSection(section);
            this.showNotification('success', 'Image removed successfully');
        }
    }

    showEditImageModal(image, section, index) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-900">Edit Image</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-6">
                        <div class="text-center">
                            <img src="${image.thumbnail}" alt="${image.title}" class="max-w-full h-48 object-cover rounded-lg mx-auto">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
                            <input type="text" id="editImageTitle" value="${image.title}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea id="editImageDescription" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">${image.description}</textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Alt Text (for accessibility)</label>
                            <input type="text" id="editImageAlt" value="${image.alt || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="Describe the image for screen readers">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                            <input type="text" id="editImageCaption" value="${image.caption || ''}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="Optional caption">
                        </div>
                        
                        ${section === 'results' ? `
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Impact Metrics</label>
                                <input type="text" id="editImageMetrics" value="${image.metrics || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="e.g., 25% increase in conversions">
                            </div>
                        ` : ''}
                        
                        <div class="flex justify-end space-x-3">
                            <button onclick="this.closest('.fixed').remove()" 
                                    class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                                Cancel
                            </button>
                            <button onclick="window.caseStudyImageEditor.saveImageEdit('${section}', ${index}); this.closest('.fixed').remove();" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    saveImageEdit(section, index) {
        const title = document.getElementById('editImageTitle').value;
        const description = document.getElementById('editImageDescription').value;
        const alt = document.getElementById('editImageAlt').value;
        const caption = document.getElementById('editImageCaption').value;
        const metrics = document.getElementById('editImageMetrics')?.value;
        
        const image = section === 'hero' ? this.images.hero : this.images[section][index];
        
        image.title = title;
        image.description = description;
        image.alt = alt;
        image.caption = caption;
        if (metrics !== undefined) image.metrics = metrics;
        
        this.unsavedChanges = true;
        this.switchSection(section);
        this.showNotification('success', 'Image updated successfully');
    }

    // Hero Image specific methods
    updateHeroAlt(value) {
        if (this.images.hero) {
            this.images.hero.alt = value;
            this.unsavedChanges = true;
        }
    }

    updateHeroCaption(value) {
        if (this.images.hero) {
            this.images.hero.caption = value;
            this.unsavedChanges = true;
        }
    }

    removeHeroImage() {
        if (confirm('Are you sure you want to remove the hero image?')) {
            this.images.hero = null;
            this.unsavedChanges = true;
            this.switchSection('hero');
            this.showNotification('success', 'Hero image removed');
        }
    }

    editHeroImage() {
        if (this.images.hero) {
            this.showEditImageModal(this.images.hero, 'hero', 0);
        }
    }

    // Drag and Drop for reordering
    handleDragStart(event, section, index) {
        event.dataTransfer.setData('text/plain', JSON.stringify({ section, index }));
    }

    // Preview and Save functionality
    togglePreview() {
        this.previewMode = !this.previewMode;
        
        if (this.previewMode) {
            this.showPreviewModal();
        }
    }

    showPreviewModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-white z-50 overflow-y-auto';
        modal.innerHTML = `
            <div class="min-h-screen">
                <!-- Preview Header -->
                <div class="bg-gray-900 text-white p-4 flex justify-between items-center">
                    <h2 class="text-xl font-bold">Case Study Preview</h2>
                    <button onclick="this.closest('.fixed').remove(); window.caseStudyImageEditor.previewMode = false;" 
                            class="text-white hover:text-gray-300">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <!-- Preview Content -->
                <div class="max-w-4xl mx-auto p-6">
                    ${this.renderPreviewContent()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    renderPreviewContent() {
        let content = '';
        
        // Hero Section
        if (this.images.hero) {
            content += `
                <section class="mb-12">
                    <div class="relative">
                        <img src="${this.images.hero.url}" alt="${this.images.hero.alt}" class="w-full h-96 object-cover rounded-lg">
                        ${this.images.hero.caption ? `
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                                <p class="text-white text-lg">${this.images.hero.caption}</p>
                            </div>
                        ` : ''}
                    </div>
                </section>
            `;
        }
        
        // Gallery Section
        if (this.images.gallery.length > 0) {
            content += `
                <section class="mb-12">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">Gallery</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${this.images.gallery.map(image => `
                            <div class="relative group">
                                <img src="${image.url}" alt="${image.alt}" class="w-full h-64 object-cover rounded-lg">
                                ${image.caption ? `
                                    <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-3">
                                        <p class="text-sm">${image.caption}</p>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        }
        
        // Process Section
        if (this.images.process.length > 0) {
            content += `
                <section class="mb-12">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">Process</h2>
                    <div class="space-y-8">
                        ${this.images.process.map((image, index) => `
                            <div class="flex items-start space-x-6">
                                <div class="flex-shrink-0">
                                    <div class="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                        ${index + 1}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <h3 class="text-xl font-semibold text-gray-900 mb-2">${image.title}</h3>
                                    <p class="text-gray-600 mb-4">${image.description}</p>
                                    <img src="${image.url}" alt="${image.alt}" class="w-full max-w-2xl rounded-lg">
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        }
        
        // Results Section
        if (this.images.results.length > 0) {
            content += `
                <section class="mb-12">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">Results</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${this.images.results.map(image => `
                            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                                <img src="${image.url}" alt="${image.alt}" class="w-full h-48 object-cover">
                                <div class="p-6">
                                    <h3 class="text-lg font-semibold text-gray-900 mb-2">${image.title}</h3>
                                    <p class="text-gray-600 mb-4">${image.description}</p>
                                    ${image.metrics ? `
                                        <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <p class="text-green-800 font-semibold">Impact: ${image.metrics}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        }
        
        return content || '<div class="text-center py-12 text-gray-500">No images to preview yet. Add some images to see them here!</div>';
    }

    async saveCaseStudy() {
        try {
            console.log('💾 Saving case study...');
            
            const caseStudyData = {
                images: this.images,
                lastModified: new Date().toISOString()
            };
            
            const response = await fetch('/api/case-studies/images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(caseStudyData)
            });
            
            if (response.ok) {
                this.unsavedChanges = false;
                this.showNotification('success', 'Case study saved successfully!');
                console.log('✅ Case study saved');
            } else {
                throw new Error('Failed to save case study');
            }
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            this.showNotification('error', 'Failed to save case study');
        }
    }

    async autoSave() {
        if (this.unsavedChanges) {
            try {
                await this.saveCaseStudy();
                console.log('💾 Auto-save completed');
            } catch (error) {
                console.error('❌ Auto-save failed:', error);
            }
        }
    }

    async loadExistingImages() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const caseStudyId = urlParams.get('id');
            
            if (caseStudyId) {
                console.log(`📋 Loading existing images for case study: ${caseStudyId}`);
                
                const response = await fetch(`/api/case-studies/${caseStudyId}/images`);
                
                if (response.ok) {
                    const data = await response.json();
                    this.images = data.images || this.images;
                    console.log('✅ Existing images loaded');
                }
            }
        } catch (error) {
            console.error('❌ Failed to load existing images:', error);
        }
    }

    // Event handlers
    handleImageUpload(imageData) {
        // Handle global upload events
        console.log('📤 Image upload event received:', imageData);
    }

    handleImagePreview(previewData) {
        // Handle preview events
        console.log('👁️ Image preview ready:', previewData);
    }

    updateUploadProgress(progressData) {
        const progressElement = document.getElementById('uploadProgress');
        const progressText = document.getElementById('uploadProgressText');
        
        if (progressElement && progressText) {
            progressText.textContent = `${progressData.progress}%`;
        }
    }

    showUploadProgress(show) {
        const progressElement = document.getElementById('uploadProgress');
        if (progressElement) {
            progressElement.classList.toggle('hidden', !show);
        }
    }

    closeAllModals() {
        document.querySelectorAll('.fixed.inset-0').forEach(modal => {
            if (modal.classList.contains('z-50')) {
                modal.remove();
            }
        });
    }

    showNotification(type, message) {
        if (window.cloudinarySDK) {
            window.cloudinarySDK.showNotification(type, message);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Public API
    getImages() {
        return this.images;
    }

    hasUnsavedChanges() {
        return this.unsavedChanges;
    }

    getCurrentSection() {
        return this.currentSection;
    }
}

// Create global instance
window.caseStudyImageEditor = new CaseStudyImageEditor();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CaseStudyImageEditor;
}