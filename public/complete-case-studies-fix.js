/**
 * COMPLETE CASE STUDIES FIX - THOROUGH SOLUTION
 * This script completely replaces the broken case studies functionality
 * with a working implementation that displays case studies properly
 */

(function() {
    'use strict';
    
    console.log('🔧 COMPLETE Case Studies Fix - Loading...');
    
    // Configuration
    const STORAGE_KEY = 'portfolio_case_studies';
    let isInitialized = false;
    
    // Sample case studies data
    const SAMPLE_CASE_STUDIES = [
        {
            id: 'cs_complete_001',
            project_title: 'E-commerce Platform Redesign',
            project_description: 'Complete redesign of an e-commerce platform with improved UX and 40% higher conversion rates. Implemented modern design patterns and optimized checkout flow.',
            heroTitle: 'Modern Shopping Experience',
            heroSubtitle: 'Redesigned e-commerce platform with improved UX and performance',
            overviewDescription: 'A comprehensive redesign project that transformed an outdated e-commerce platform into a modern, user-friendly shopping experience.',
            status: 'published',
            featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 'cs_complete_002',
            project_title: 'Mobile Banking Application',
            project_description: 'Secure mobile banking app with biometric authentication, real-time notifications, and comprehensive account management features.',
            heroTitle: 'Secure Digital Banking',
            heroSubtitle: 'Native mobile app for secure and convenient banking',
            overviewDescription: 'Development of a secure mobile banking application that prioritizes user security and convenience.',
            status: 'published',
            featured: false,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 'cs_complete_003',
            project_title: 'SaaS Analytics Dashboard',
            project_description: 'Real-time analytics dashboard with interactive data visualization, custom reporting, and predictive insights for business intelligence.',
            heroTitle: 'Data-Driven Insights',
            heroSubtitle: 'Real-time analytics dashboard with interactive visualizations',
            overviewDescription: 'Built a comprehensive analytics dashboard for a SaaS platform to help users understand their data and make informed decisions.',
            status: 'draft',
            featured: false,
            created_at: new Date(Date.now() - 172800000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 'cs_complete_004',
            project_title: 'Healthcare Management System',
            project_description: 'Comprehensive healthcare management system for clinics and hospitals with patient management, scheduling, and electronic health records.',
            heroTitle: 'Streamlined Healthcare',
            heroSubtitle: 'Complete healthcare management solution',
            overviewDescription: 'Developed a complete healthcare management system to streamline patient care and administrative processes.',
            status: 'published',
            featured: true,
            created_at: new Date(Date.now() - 259200000).toISOString(),
            updated_at: new Date(Date.now() - 259200000).toISOString()
        }
    ];
    
    // Initialize when DOM is ready
    function initializeWhenReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
    }
    
    function initialize() {
        if (isInitialized) return;
        
        console.log('🚀 Initializing Complete Case Studies Fix...');
        
        // Setup navigation
        setupNavigation();
        
        // Load case studies data
        loadCaseStudiesData();
        
        // Override existing functions
        overrideExistingFunctions();
        
        // Set up periodic refresh
        setInterval(loadCaseStudiesData, 30000);
        
        isInitialized = true;
        console.log('✅ Complete Case Studies Fix initialized successfully');
    }
    
    function setupNavigation() {
        console.log('🔧 Setting up navigation...');
        
        // Find and setup case studies navigation link
        const caseStudiesLink = document.querySelector('a[href="#case-studies"]');
        if (caseStudiesLink) {
            // Remove existing event listeners by cloning the element
            const newLink = caseStudiesLink.cloneNode(true);
            caseStudiesLink.parentNode.replaceChild(newLink, caseStudiesLink);
            
            // Add new event listener
            newLink.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔗 Case studies navigation clicked');
                showCaseStudiesView();
            });
            
            console.log('✅ Navigation setup complete');
        } else {
            console.warn('⚠️ Case studies navigation link not found');
        }
    }
    
    function showCaseStudiesView() {
        console.log('👁️ Showing case studies view...');
        
        try {
            // Hide all page views
            const pageViews = document.querySelectorAll('.page-view');
            pageViews.forEach(view => {
                view.classList.add('hidden');
            });
            
            // Show case studies view
            const caseStudiesView = document.getElementById('case-studiesView');
            if (caseStudiesView) {
                caseStudiesView.classList.remove('hidden');
                console.log('✅ Case studies view shown');
                
                // Load case studies when view is shown
                loadCaseStudiesData();
            } else {
                console.error('❌ Case studies view element not found');
                return;
            }
            
            // Update page title
            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                pageTitle.textContent = 'Case Studies';
            }
            
            // Update active navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeNav = document.querySelector('a[href="#case-studies"]');
            if (activeNav) {
                activeNav.classList.add('active');
            }
            
        } catch (error) {
            console.error('❌ Error showing case studies view:', error);
        }
    }
    
    function loadCaseStudiesData() {
        console.log('📖 Loading case studies data...');
        
        try {
            // Get case studies from localStorage
            let caseStudies = getCaseStudiesFromStorage();
            
            // If no case studies exist, create sample data
            if (caseStudies.length === 0) {
                console.log('📝 No case studies found, creating sample data...');
                caseStudies = createSampleData();
            }
            
            console.log(`📚 Loaded ${caseStudies.length} case studies`);
            
            // Display the case studies
            displayCaseStudies(caseStudies);
            
            // Update metrics
            updateDashboardMetrics(caseStudies);
            
        } catch (error) {
            console.error('❌ Error loading case studies:', error);
            displayCaseStudies([]);
        }
    }
    
    function getCaseStudiesFromStorage() {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            return storedData ? JSON.parse(storedData) : [];
        } catch (error) {
            console.error('❌ Error reading from localStorage:', error);
            return [];
        }
    }
    
    function saveCaseStudiesToStorage(caseStudies) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(caseStudies));
            console.log('💾 Case studies saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }
    
    function createSampleData() {
        console.log('🧪 Creating sample case studies...');
        
        try {
            saveCaseStudiesToStorage(SAMPLE_CASE_STUDIES);
            console.log('✅ Sample data created and saved');
            return SAMPLE_CASE_STUDIES;
        } catch (error) {
            console.error('❌ Error creating sample data:', error);
            return [];
        }
    }
    
    function displayCaseStudies(caseStudies) {
        console.log(`🎨 Displaying ${caseStudies.length} case studies...`);
        
        // Find the container
        const container = document.querySelector('#case-studiesView .grid');
        if (!container) {
            console.error('❌ Case studies container not found');
            return;
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        if (caseStudies.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-6 text-center col-span-full">
                    <i class="fas fa-file-alt text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">No Case Studies Yet</h3>
                    <p class="text-gray-600 mb-4">Create your first case study to showcase your work</p>
                    <div class="flex justify-center space-x-3">
                        <button onclick="window.open('case_study_editor_complete.html', '_blank')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                            <i class="fas fa-plus mr-2"></i>Create Case Study
                        </button>
                        <button onclick="window.createSampleCaseStudies()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-magic mr-2"></i>Add Sample Data
                        </button>
                    </div>
                </div>
            `;
            console.log('📝 Displayed "no case studies" message');
            return;
        }
        
        // Create case study cards
        const caseStudyCards = caseStudies.map(caseStudy => {
            const title = caseStudy.project_title || caseStudy.caseStudyTitle || 'Untitled Case Study';
            const description = caseStudy.project_description || caseStudy.heroSubtitle || caseStudy.overviewDescription || 'No description available';
            const status = caseStudy.status || 'draft';
            const featured = caseStudy.featured || false;
            const createdAt = new Date(caseStudy.created_at || Date.now()).toLocaleDateString();
            
            return `
                <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow card-hover">
                    <div class="flex items-start justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex-1 mr-2 line-clamp-2">
                            ${escapeHtml(title)}
                        </h3>
                        <div class="flex items-center space-x-2 flex-shrink-0">
                            <span class="px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(status)}">
                                ${status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                            ${featured ? '<i class="fas fa-star text-yellow-500" title="Featured"></i>' : ''}
                        </div>
                    </div>
                    
                    <p class="text-gray-600 text-sm mb-4 line-clamp-3">
                        ${escapeHtml(description.substring(0, 150))}${description.length > 150 ? '...' : ''}
                    </p>
                    
                    <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>Created: ${createdAt}</span>
                        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            ID: ${caseStudy.id.substring(0, 8)}...
                        </span>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button onclick="window.editCaseStudy('${caseStudy.id}')" class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </button>
                        <button onclick="window.viewCaseStudy('${caseStudy.id}')" class="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                        <button onclick="window.deleteCaseStudy('${caseStudy.id}')" class="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = caseStudyCards;
        console.log('✅ Case study cards displayed successfully');
    }
    
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-800';
            case 'draft':
                return 'bg-yellow-100 text-yellow-800';
            case 'archived':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function updateDashboardMetrics(caseStudies) {
        console.log('📊 Updating dashboard metrics...');
        
        try {
            const total = caseStudies.length;
            const published = caseStudies.filter(cs => cs.status === 'published').length;
            const draft = caseStudies.filter(cs => cs.status === 'draft').length;
            const featured = caseStudies.filter(cs => cs.featured).length;
            
            // Update total case studies
            const totalElement = document.getElementById('totalCaseStudies');
            if (totalElement) {
                totalElement.textContent = total;
            }
            
            // Update total projects (same as case studies for now)
            const projectsElement = document.getElementById('totalProjects');
            if (projectsElement) {
                projectsElement.textContent = total;
            }
            
            console.log(`📊 Metrics updated: ${total} total, ${published} published, ${draft} drafts, ${featured} featured`);
            
        } catch (error) {
            console.error('❌ Error updating metrics:', error);
        }
    }
    
    function overrideExistingFunctions() {
        console.log('🔄 Overriding existing functions...');
        
        // Override the adminDashboard loadCaseStudiesData if it exists
        if (window.adminDashboard && typeof window.adminDashboard.loadCaseStudiesData === 'function') {
            window.adminDashboard.loadCaseStudiesData = loadCaseStudiesData;
            console.log('✅ Overrode adminDashboard.loadCaseStudiesData');
        }
        
        // Create global functions for case study actions
        window.editCaseStudy = function(id) {
            console.log('✏️ Editing case study:', id);
            window.open(`case_study_editor_complete.html?id=${id}`, '_blank');
        };
        
        window.viewCaseStudy = function(id) {
            console.log('👁️ Viewing case study:', id);
            const caseStudies = getCaseStudiesFromStorage();
            const caseStudy = caseStudies.find(cs => cs.id === id);
            
            if (caseStudy) {
                alert(`Case Study: ${caseStudy.project_title}\n\nDescription: ${caseStudy.project_description || 'No description'}\n\nStatus: ${caseStudy.status}\n\nThis would open the case study in view mode.`);
            } else {
                alert('Case study not found.');
            }
        };
        
        window.deleteCaseStudy = function(id) {
            console.log('🗑️ Deleting case study:', id);
            
            if (confirm('Are you sure you want to delete this case study? This action cannot be undone.')) {
                try {
                    let caseStudies = getCaseStudiesFromStorage();
                    const originalLength = caseStudies.length;
                    
                    caseStudies = caseStudies.filter(cs => cs.id !== id);
                    
                    if (caseStudies.length < originalLength) {
                        saveCaseStudiesToStorage(caseStudies);
                        console.log('✅ Case study deleted successfully');
                        
                        // Refresh display
                        loadCaseStudiesData();
                        
                        // Show success message
                        showNotification('Case study deleted successfully', 'success');
                    } else {
                        console.warn('⚠️ Case study not found for deletion');
                        showNotification('Case study not found', 'error');
                    }
                } catch (error) {
                    console.error('❌ Error deleting case study:', error);
                    showNotification('Error deleting case study', 'error');
                }
            }
        };
        
        window.createSampleCaseStudies = function() {
            console.log('🧪 Creating sample case studies...');
            createSampleData();
            loadCaseStudiesData();
            showNotification('Sample case studies created!', 'success');
        };
        
        console.log('✅ Global functions created');
    }
    
    function showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Listen for storage changes (from other tabs)
    window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY) {
            console.log('🔄 Storage updated from another tab, refreshing...');
            loadCaseStudiesData();
        }
    });
    
    // Initialize immediately and also when DOM is ready
    initializeWhenReady();
    
    // Also initialize after a delay to ensure everything is loaded
    setTimeout(initialize, 2000);
    
    console.log('✅ COMPLETE Case Studies Fix loaded successfully');
    
})();