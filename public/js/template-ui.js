/**
 * Template Management UI Components
 * Provides user interface for template management functionality
 * 
 * Components:
 * - TemplateLibrary: Browse and search templates
 * - TemplateEditor: Create and edit templates
 * - TemplatePreview: Preview templates with variables
 * - TemplateApplication: Apply templates to case studies
 * - TemplateRating: Rate and review templates
 */

class TemplateUI {
    constructor(templateService, containerId) {
        this.templateService = templateService;
        this.container = document.getElementById(containerId);
        this.currentView = 'library';
        this.selectedTemplate = null;
        this.templates = [];
        this.categories = [];
        this.filters = {
            categoryId: null,
            search: '',
            templateType: null,
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        
        if (!this.container) {
            console.error('❌ Template UI container not found:', containerId);
            return;
        }
        
        this.init();
        console.log('📋 TemplateUI initialized');
    }

    /**
     * Initialize the template UI
     */
    async init() {
        this.container.innerHTML = this.getMainTemplate();
        this.attachEventListeners();
        this.loadStyles();
        await this.loadInitialData();
    }

    /**
     * Load initial data (categories and templates)
     */
    async loadInitialData() {
        try {
            this.showLoading('Loading templates...');
            
            // Load categories
            const categoriesResult = await this.templateService.getCategories({ includeStats: true });
            if (categoriesResult.success) {
                this.categories = categoriesResult.categories;
                this.renderCategories();
            }
            
            // Load templates
            await this.loadTemplates();
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showError('Failed to load template data');
        }
    }   
 /**
     * Load templates with current filters
     */
    async loadTemplates() {
        try {
            this.showLoading('Loading templates...');
            
            const result = await this.templateService.getTemplates({
                ...this.filters,
                limit: 20,
                offset: 0,
                includeUsage: true
            });
            
            if (result.success) {
                this.templates = result.templates;
                this.renderTemplates();
            } else {
                this.showError('Failed to load templates: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error loading templates:', error);
            this.showError('Failed to load templates');
        }
    }

    /**
     * Render the template library view
     */
    renderTemplates() {
        const templatesContainer = this.container.querySelector('.templates-grid');
        if (!templatesContainer) return;

        if (this.templates.length === 0) {
            templatesContainer.innerHTML = `
                <div class="no-templates">
                    <div class="no-templates-icon">📋</div>
                    <h3>No Templates Found</h3>
                    <p>No templates match your current filters. Try adjusting your search criteria or create a new template.</p>
                    <button class="btn-primary" onclick="templateUI.showCreateTemplate()">
                        Create Template
                    </button>
                </div>
            `;
            return;
        }

        const templatesHtml = this.templates.map(template => this.getTemplateCardTemplate(template)).join('');
        templatesContainer.innerHTML = templatesHtml;
    }

    /**
     * Get template card HTML
     */
    getTemplateCardTemplate(template) {
        const usageStats = template.usage_stats || {};
        const ratingStars = this.generateStarRating(template.rating_average || 0);
        
        return `
            <div class="template-card" data-template-id="${template.id}">
                <div class="template-card-header">
                    ${template.thumbnail_url ? 
                        `<img src="${template.thumbnail_url}" alt="${template.name}" class="template-thumbnail">` :
                        `<div class="template-thumbnail-placeholder">
                            <span class="template-type-icon">${this.getTemplateTypeIcon(template.template_type)}</span>
                        </div>`
                    }
                    <div class="template-badges">
                        ${template.is_featured ? '<span class="badge badge-featured">Featured</span>' : ''}
                        ${template.is_public ? '<span class="badge badge-public">Public</span>' : ''}
                    </div>
                </div>
                
                <div class="template-card-content">
                    <h4 class="template-title">${this.escapeHtml(template.name)}</h4>
                    <p class="template-description">${this.escapeHtml(template.description || 'No description available')}</p>
                    
                    <div class="template-meta">
                        <div class="template-category">
                            ${template.category_icon ? `<span class="category-icon">${template.category_icon}</span>` : ''}
                            <span class="category-name">${template.category_name || 'Uncategorized'}</span>
                        </div>
                        
                        <div class="template-stats">
                            <div class="stat-item">
                                <span class="stat-icon">👥</span>
                                <span class="stat-value">${template.usage_count || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-icon">⭐</span>
                                <span class="stat-value">${template.rating_average ? template.rating_average.toFixed(1) : '0.0'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="template-rating">
                        ${ratingStars}
                        <span class="rating-count">(${template.rating_count || 0})</span>
                    </div>
                    
                    <div class="template-tags">
                        ${(template.tags || []).slice(0, 3).map(tag => 
                            `<span class="tag">${this.escapeHtml(tag)}</span>`
                        ).join('')}
                        ${template.tags && template.tags.length > 3 ? 
                            `<span class="tag-more">+${template.tags.length - 3}</span>` : ''
                        }
                    </div>
                </div>
                
                <div class="template-card-actions">
                    <button class="btn-secondary btn-sm" onclick="templateUI.previewTemplate('${template.id}')">
                        👁️ Preview
                    </button>
                    <button class="btn-primary btn-sm" onclick="templateUI.applyTemplate('${template.id}')">
                        ✨ Use Template
                    </button>
                    <div class="template-actions-menu">
                        <button class="btn-icon" onclick="templateUI.showTemplateMenu('${template.id}', event)">
                            ⋮
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render categories filter
     */
    renderCategories() {
        const categoriesContainer = this.container.querySelector('.categories-filter');
        if (!categoriesContainer) return;

        const categoriesHtml = `
            <div class="category-item ${!this.filters.categoryId ? 'active' : ''}" 
                 onclick="templateUI.filterByCategory(null)">
                <span class="category-icon">📋</span>
                <span class="category-name">All Templates</span>
                <span class="category-count">${this.templates.length}</span>
            </div>
            ${this.categories.map(category => `
                <div class="category-item ${this.filters.categoryId === category.id ? 'active' : ''}" 
                     onclick="templateUI.filterByCategory('${category.id}')">
                    <span class="category-icon">${category.icon || '📁'}</span>
                    <span class="category-name">${this.escapeHtml(category.name)}</span>
                    <span class="category-count">${category.template_count || 0}</span>
                </div>
            `).join('')}
        `;
        
        categoriesContainer.innerHTML = categoriesHtml;
    }

    /**
     * Show template preview modal
     */
    async previewTemplate(templateId) {
        try {
            this.showLoading('Loading template preview...');
            
            const result = await this.templateService.getTemplate(templateId, { includeVersions: false });
            if (!result.success) {
                this.showError('Failed to load template: ' + result.message);
                return;
            }
            
            const template = result.template;
            this.selectedTemplate = template;
            
            // Show preview modal
            this.showPreviewModal(template);
            
        } catch (error) {
            console.error('❌ Error previewing template:', error);
            this.showError('Failed to preview template');
        }
    }

    /**
     * Show preview modal
     */
    showPreviewModal(template) {
        const modal = document.getElementById('template-preview-modal');
        const modalBody = document.getElementById('preview-modal-body');
        
        modalBody.innerHTML = this.getPreviewTemplate(template);
        modal.style.display = 'block';
        
        // Initialize variable inputs if template has variables
        if (template.variables && template.variables.length > 0) {
            this.initializeVariableInputs(template.variables);
        }
    }

    /**
     * Get preview modal template
     */
    getPreviewTemplate(template) {
        return `
            <div class="preview-header">
                <div class="preview-template-info">
                    <h3>${this.escapeHtml(template.name)}</h3>
                    <p>${this.escapeHtml(template.description || 'No description available')}</p>
                    <div class="template-meta-info">
                        <span class="meta-item">
                            <strong>Type:</strong> ${template.template_type}
                        </span>
                        <span class="meta-item">
                            <strong>Category:</strong> ${template.category_name || 'Uncategorized'}
                        </span>
                        <span class="meta-item">
                            <strong>Usage:</strong> ${template.usage_count || 0} times
                        </span>
                    </div>
                </div>
                
                <div class="preview-actions">
                    <button class="btn-secondary" onclick="templateUI.closePreviewModal()">
                        Close
                    </button>
                    <button class="btn-primary" onclick="templateUI.applyCurrentTemplate()">
                        Use This Template
                    </button>
                </div>
            </div>
            
            ${template.variables && template.variables.length > 0 ? `
                <div class="preview-variables">
                    <h4>Template Variables</h4>
                    <p>Customize the template by filling in the variables below:</p>
                    <div class="variables-form" id="variables-form">
                        ${template.variables.map(variable => this.getVariableInputTemplate(variable)).join('')}
                    </div>
                    <button class="btn-secondary btn-sm" onclick="templateUI.updatePreview()">
                        Update Preview
                    </button>
                </div>
            ` : ''}
            
            <div class="preview-content">
                <h4>Template Preview</h4>
                <div class="preview-display" id="preview-display">
                    <div class="loading-spinner"></div>
                    <p>Generating preview...</p>
                </div>
            </div>
        `;
    }

    /**
     * Get variable input template
     */
    getVariableInputTemplate(variable) {
        const inputId = `var-${variable.name}`;
        
        return `
            <div class="variable-input-group">
                <label for="${inputId}" class="variable-label">
                    ${this.escapeHtml(variable.label || variable.name)}
                    ${variable.required ? '<span class="required">*</span>' : ''}
                </label>
                <input 
                    type="text" 
                    id="${inputId}" 
                    name="${variable.name}"
                    class="variable-input"
                    placeholder="${this.escapeHtml(variable.description || '')}"
                    value="${this.escapeHtml(variable.defaultValue || '')}"
                    ${variable.required ? 'required' : ''}
                >
                <small class="variable-help">${this.escapeHtml(variable.description || '')}</small>
            </div>
        `;
    }

    /**
     * Initialize variable inputs and generate initial preview
     */
    async initializeVariableInputs(variables) {
        // Generate initial preview with default values
        await this.updatePreview();
        
        // Add event listeners for real-time preview updates
        const variableInputs = document.querySelectorAll('.variable-input');
        variableInputs.forEach(input => {
            input.addEventListener('input', this.debounce(() => {
                this.updatePreview();
            }, 500));
        });
    }

    /**
     * Update template preview with current variable values
     */
    async updatePreview() {
        if (!this.selectedTemplate) return;
        
        try {
            const variables = this.getVariableValues();
            const previewDisplay = document.getElementById('preview-display');
            
            previewDisplay.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Updating preview...</p>
            `;
            
            const result = await this.templateService.previewTemplate(this.selectedTemplate.id, variables);
            
            if (result.success) {
                previewDisplay.innerHTML = this.formatPreviewContent(result.preview);
            } else {
                previewDisplay.innerHTML = `
                    <div class="preview-error">
                        <p>❌ Failed to generate preview: ${result.message}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Error updating preview:', error);
            const previewDisplay = document.getElementById('preview-display');
            previewDisplay.innerHTML = `
                <div class="preview-error">
                    <p>❌ Error generating preview</p>
                </div>
            `;
        }
    }

    /**
     * Get current variable values from form
     */
    getVariableValues() {
        const variables = {};
        const inputs = document.querySelectorAll('.variable-input');
        
        inputs.forEach(input => {
            variables[input.name] = input.value;
        });
        
        return variables;
    }

    /**
     * Format preview content for display
     */
    formatPreviewContent(content) {
        return `
            <div class="preview-case-study">
                <div class="preview-section">
                    <h5>Project Title</h5>
                    <div class="preview-content-block">
                        ${this.escapeHtml(content.project_title || 'No title')}
                    </div>
                </div>
                
                <div class="preview-section">
                    <h5>Project Description</h5>
                    <div class="preview-content-block">
                        ${this.escapeHtml(content.project_description || 'No description')}
                    </div>
                </div>
                
                ${content.sections ? Object.entries(content.sections).map(([key, value]) => `
                    <div class="preview-section">
                        <h5>${this.formatSectionTitle(key)}</h5>
                        <div class="preview-content-block">
                            ${this.formatSectionContent(value)}
                        </div>
                    </div>
                `).join('') : ''}
            </div>
        `;
    }

    /**
     * Format section title for display
     */
    formatSectionTitle(sectionKey) {
        return sectionKey
            .split(/[_-]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Format section content for display
     */
    formatSectionContent(content) {
        if (typeof content === 'string') {
            return this.escapeHtml(content);
        } else if (Array.isArray(content)) {
            return content.map(item => `<li>${this.escapeHtml(String(item))}</li>`).join('');
        } else if (content && typeof content === 'object') {
            return Object.entries(content)
                .map(([key, value]) => `<strong>${key}:</strong> ${this.escapeHtml(String(value))}`)
                .join('<br>');
        }
        return this.escapeHtml(String(content));
    }

    /**
     * Apply template to case study
     */
    async applyTemplate(templateId) {
        // This would typically open a case study selection dialog
        // For now, we'll show a simple implementation
        const caseStudyId = prompt('Enter the Case Study ID to apply this template to:');
        if (!caseStudyId) return;
        
        try {
            this.showLoading('Applying template...');
            
            const variables = this.selectedTemplate ? this.getVariableValues() : {};
            
            const result = await this.templateService.applyTemplate(templateId, caseStudyId, {
                variables: variables,
                preserveExisting: false
            });
            
            if (result.success) {
                this.showSuccess('Template applied successfully!');
                this.closePreviewModal();
            } else {
                this.showError('Failed to apply template: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error applying template:', error);
            this.showError('Failed to apply template');
        }
    }

    /**
     * Apply currently previewed template
     */
    async applyCurrentTemplate() {
        if (!this.selectedTemplate) {
            this.showError('No template selected');
            return;
        }
        
        await this.applyTemplate(this.selectedTemplate.id);
    }

    /**
     * Filter templates by category
     */
    async filterByCategory(categoryId) {
        this.filters.categoryId = categoryId;
        await this.loadTemplates();
        this.renderCategories(); // Update active state
    }

    /**
     * Search templates
     */
    async searchTemplates(query) {
        this.filters.search = query;
        await this.loadTemplates();
    }

    /**
     * Sort templates
     */
    async sortTemplates(sortBy, sortOrder = 'desc') {
        this.filters.sortBy = sortBy;
        this.filters.sortOrder = sortOrder;
        await this.loadTemplates();
    }  
  /**
     * Get main template HTML
     */
    getMainTemplate() {
        return `
            <div class="template-ui-container">
                <div class="template-ui-header">
                    <div class="header-left">
                        <h2>Template Library</h2>
                        <p>Browse, preview, and apply content templates</p>
                    </div>
                    <div class="header-right">
                        <div class="search-box">
                            <input type="text" 
                                   placeholder="Search templates..." 
                                   class="search-input"
                                   onkeyup="templateUI.handleSearch(event)">
                            <button class="search-btn" onclick="templateUI.handleSearch()">🔍</button>
                        </div>
                        <div class="header-actions">
                            <button class="btn-secondary" onclick="templateUI.showCreateTemplate()">
                                ➕ Create Template
                            </button>
                            <div class="sort-dropdown">
                                <select onchange="templateUI.handleSort(this.value)">
                                    <option value="created_at:desc">Newest First</option>
                                    <option value="created_at:asc">Oldest First</option>
                                    <option value="name:asc">Name A-Z</option>
                                    <option value="name:desc">Name Z-A</option>
                                    <option value="usage_count:desc">Most Used</option>
                                    <option value="rating_average:desc">Highest Rated</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="template-ui-content">
                    <div class="template-sidebar">
                        <div class="sidebar-section">
                            <h4>Categories</h4>
                            <div class="categories-filter">
                                <!-- Categories will be loaded here -->
                            </div>
                        </div>
                        
                        <div class="sidebar-section">
                            <h4>Template Type</h4>
                            <div class="type-filter">
                                <label class="filter-option">
                                    <input type="radio" name="templateType" value="" checked 
                                           onchange="templateUI.filterByType('')">
                                    <span>All Types</span>
                                </label>
                                <label class="filter-option">
                                    <input type="radio" name="templateType" value="case_study" 
                                           onchange="templateUI.filterByType('case_study')">
                                    <span>Case Study</span>
                                </label>
                                <label class="filter-option">
                                    <input type="radio" name="templateType" value="section" 
                                           onchange="templateUI.filterByType('section')">
                                    <span>Section</span>
                                </label>
                                <label class="filter-option">
                                    <input type="radio" name="templateType" value="component" 
                                           onchange="templateUI.filterByType('component')">
                                    <span>Component</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="sidebar-section">
                            <h4>Quick Filters</h4>
                            <div class="quick-filters">
                                <button class="filter-btn" onclick="templateUI.showFeatured()">
                                    ⭐ Featured
                                </button>
                                <button class="filter-btn" onclick="templateUI.showPopular()">
                                    🔥 Popular
                                </button>
                                <button class="filter-btn" onclick="templateUI.showRecent()">
                                    🆕 Recent
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="template-main">
                        <div class="templates-grid">
                            <!-- Templates will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Template Preview Modal -->
            <div class="modal" id="template-preview-modal" style="display: none;">
                <div class="modal-content template-preview-content">
                    <div class="modal-header">
                        <h3>Template Preview</h3>
                        <button class="modal-close" onclick="templateUI.closePreviewModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="preview-modal-body">
                        <!-- Preview content will be loaded here -->
                    </div>
                </div>
            </div>
            
            <!-- Template Menu -->
            <div class="context-menu" id="template-menu" style="display: none;">
                <div class="menu-item" onclick="templateUI.viewTemplateDetails()">
                    👁️ View Details
                </div>
                <div class="menu-item" onclick="templateUI.editTemplate()">
                    ✏️ Edit Template
                </div>
                <div class="menu-item" onclick="templateUI.duplicateTemplate()">
                    📋 Duplicate
                </div>
                <div class="menu-item" onclick="templateUI.shareTemplate()">
                    🔗 Share
                </div>
                <div class="menu-separator"></div>
                <div class="menu-item danger" onclick="templateUI.deleteTemplate()">
                    🗑️ Delete
                </div>
            </div>
        `;
    }

    /**
     * Event handlers
     */
    attachEventListeners() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
            
            // Close context menu
            if (!e.target.closest('.context-menu') && !e.target.closest('.template-actions-menu')) {
                this.hideTemplateMenu();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.hideTemplateMenu();
            }
        });
    }

    /**
     * Handle search input
     */
    handleSearch(event) {
        if (event && event.type === 'keyup' && event.key !== 'Enter') {
            return;
        }
        
        const searchInput = this.container.querySelector('.search-input');
        const query = searchInput.value.trim();
        this.searchTemplates(query);
    }

    /**
     * Handle sort change
     */
    handleSort(value) {
        const [sortBy, sortOrder] = value.split(':');
        this.sortTemplates(sortBy, sortOrder);
    }

    /**
     * Filter by template type
     */
    async filterByType(templateType) {
        this.filters.templateType = templateType || null;
        await this.loadTemplates();
    }

    /**
     * Show featured templates
     */
    async showFeatured() {
        try {
            this.showLoading('Loading featured templates...');
            
            const result = await this.templateService.getTemplates({
                isFeatured: true,
                limit: 20
            });
            
            if (result.success) {
                this.templates = result.templates;
                this.renderTemplates();
            }
        } catch (error) {
            console.error('❌ Error loading featured templates:', error);
            this.showError('Failed to load featured templates');
        }
    }

    /**
     * Show popular templates
     */
    async showPopular() {
        try {
            this.showLoading('Loading popular templates...');
            
            const result = await this.templateService.getTemplates({
                sortBy: 'usage_count',
                sortOrder: 'desc',
                limit: 20
            });
            
            if (result.success) {
                this.templates = result.templates;
                this.renderTemplates();
            }
        } catch (error) {
            console.error('❌ Error loading popular templates:', error);
            this.showError('Failed to load popular templates');
        }
    }

    /**
     * Show recent templates
     */
    async showRecent() {
        try {
            this.showLoading('Loading recent templates...');
            
            const result = await this.templateService.getTemplates({
                sortBy: 'created_at',
                sortOrder: 'desc',
                limit: 20
            });
            
            if (result.success) {
                this.templates = result.templates;
                this.renderTemplates();
            }
        } catch (error) {
            console.error('❌ Error loading recent templates:', error);
            this.showError('Failed to load recent templates');
        }
    }

    /**
     * Show template context menu
     */
    showTemplateMenu(templateId, event) {
        event.stopPropagation();
        
        this.selectedTemplateId = templateId;
        const menu = document.getElementById('template-menu');
        
        menu.style.display = 'block';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
    }

    /**
     * Hide template context menu
     */
    hideTemplateMenu() {
        const menu = document.getElementById('template-menu');
        menu.style.display = 'none';
        this.selectedTemplateId = null;
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        this.selectedTemplate = null;
    }

    /**
     * Close preview modal
     */
    closePreviewModal() {
        document.getElementById('template-preview-modal').style.display = 'none';
        this.selectedTemplate = null;
    }

    /**
     * Utility methods
     */
    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return '★'.repeat(fullStars) + 
               (hasHalfStar ? '☆' : '') + 
               '☆'.repeat(emptyStars);
    }

    getTemplateTypeIcon(templateType) {
        const icons = {
            'case_study': '📄',
            'section': '📝',
            'component': '🧩'
        };
        return icons[templateType] || '📋';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showLoading(message) {
        const templatesGrid = this.container.querySelector('.templates-grid');
        if (templatesGrid) {
            templatesGrid.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showError(message) {
        const templatesGrid = this.container.querySelector('.templates-grid');
        if (templatesGrid) {
            templatesGrid.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="templateUI.loadTemplates()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    showSuccess(message) {
        // Simple implementation - could be enhanced with toast notifications
        console.log('✅ Success:', message);
        alert(message);
    }

    /**
     * Load CSS styles
     */
    loadStyles() {
        if (document.getElementById('template-ui-styles')) return;
        
        // Link to external CSS file
        const link = document.createElement('link');
        link.id = 'template-ui-styles';
        link.rel = 'stylesheet';
        link.href = 'css/template-ui.css';
        document.head.appendChild(link);
    }

    /**
     * Placeholder methods for future implementation
     */
    showCreateTemplate() {
        alert('Template creation UI would be implemented here');
    }

    viewTemplateDetails() {
        if (this.selectedTemplateId) {
            alert(`View details for template: ${this.selectedTemplateId}`);
        }
        this.hideTemplateMenu();
    }

    editTemplate() {
        if (this.selectedTemplateId) {
            alert(`Edit template: ${this.selectedTemplateId}`);
        }
        this.hideTemplateMenu();
    }

    duplicateTemplate() {
        if (this.selectedTemplateId) {
            alert(`Duplicate template: ${this.selectedTemplateId}`);
        }
        this.hideTemplateMenu();
    }

    shareTemplate() {
        if (this.selectedTemplateId) {
            alert(`Share template: ${this.selectedTemplateId}`);
        }
        this.hideTemplateMenu();
    }

    deleteTemplate() {
        if (this.selectedTemplateId) {
            if (confirm('Are you sure you want to delete this template?')) {
                alert(`Delete template: ${this.selectedTemplateId}`);
            }
        }
        this.hideTemplateMenu();
    }
}

// Global instance for easy access
let templateUI = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 TemplateUI ready for initialization');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateUI;
} else if (typeof window !== 'undefined') {
    window.TemplateUI = TemplateUI;
}

console.log('📋 TemplateUI class loaded successfully');