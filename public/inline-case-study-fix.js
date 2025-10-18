/**
 * Inline Case Study Fix - Embedded directly in admin dashboard
 * This fixes the blank case studies issue by embedding everything inline
 */

(function() {
    'use strict';
    
    console.log('🔧 Inline Case Study Fix loading...');
    
    // Wait for DOM to be ready
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }
    
    ready(function() {
        console.log('📄 DOM ready, initializing case study fix...');
        
        // Initialize immediately
        initializeCaseStudyFix();
        
        // Also initialize after a delay to ensure everything is loaded
        setTimeout(initializeCaseStudyFix, 2000);
    });
    
    function initializeCaseStudyFix() {
        console.log('🚀 Initializing case study fix...');
        
        // Fix navigation
        setupNavigation();
        
        // Load case studies
        loadCaseStudies();
        
        // Set up periodic refresh
        setInterval(loadCaseStudies, 30000);
    }
    
    function setupNavigation() {
        console.log('🔧 Setting up navigation...');
        
        const caseStudiesLink = document.querySelector('a[href="#case-studies"]');
        if (caseStudiesLink) {
            caseStudiesLink.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔗 Case studies navigation clicked');
                showCaseStudiesView();
            });
            console.log('✅ Navigation setup complete');
        } else {
            console.error('❌ Case studies navigation link not found');
        }
    }
    
    function showCaseStudiesView() {
        console.log('👁️ Showing case studies view...');
        
        // Hide all views
        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.add('hidden');
        });
        
        // Show case studies view
        const caseStudiesView = document.getElementById('case-studiesView');
        if (caseStudiesView) {
            caseStudiesView.classList.remove('hidden');
            console.log('✅ Case studies view shown');
            
            // Load case studies when view is shown
            loadCaseStudies();
        } else {
            console.error('❌ Case studies view not found');
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
        const caseStudiesNav = document.querySelector('a[href="#case-studies"]');
        if (caseStudiesNav) {
            caseStudiesNav.classList.add('active');
        }
    }
    
    function loadCaseStudies() {
        console.log('📖 Loading case studies...');
        
        try {
            // Get case studies from localStorage
            let caseStudies = [];
            
            const storedData = localStorage.getItem('portfolio_case_studies');
            if (storedData) {
                caseStudies = JSON.parse(storedData);
                console.log('📦 Loaded from localStorage:', caseStudies.length, 'case studies');
            } else {
                console.log('📭 No case studies in localStorage, creating sample data...');
                caseStudies = createSampleData();
            }
            
            // Display the case studies
            displayCaseStudies(caseStudies);
            
            // Update metrics
            updateMetrics(caseStudies);
            
        } catch (error) {
            console.error('❌ Error loading case studies:', error);
            displayCaseStudies([]);
        }
    }
    
    function createSampleData() {
        console.log('🧪 Creating sample case studies...');
        
        const sampleCaseStudies = [
            {
                id: 'cs_sample_001',
                project_title: 'E-commerce Platform Redesign',
                heroSubtitle: 'Complete redesign of an e-commerce platform with improved UX and 40% higher conversion rates',
                status: 'published',
                featured: true,
                created_at: new Date().toISOString()
            },
            {
                id: 'cs_sample_002',
                project_title: 'Mobile Banking App',
                heroSubtitle: 'Native mobile app for secure and convenient banking with biometric authentication',
                status: 'published',
                featured: false,
                created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: 'cs_sample_003',
                project_title: 'SaaS Analytics Dashboard',
                heroSubtitle: 'Real-time analytics dashboard with interactive data visualization and custom reporting',
                status: 'draft',
                featured: false,
                created_at: new Date(Date.now() - 172800000).toISOString()
            }
        ];
        
        // Save to localStorage
        try {
            localStorage.setItem('portfolio_case_studies', JSON.stringify(sampleCaseStudies));
            console.log('✅ Sample data saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving sample data:', error);
        }
        
        return sampleCaseStudies;
    }
    
    function displayCaseStudies(caseStudies) {
        console.log('🎨 Displaying', caseStudies.length, 'case studies...');
        
        const container = document.querySelector('#case-studiesView .grid');
        if (!container) {
            console.error('❌ Case studies container not found');
            return;
        }
        
        if (caseStudies.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-6 text-center col-span-full">
                    <i class="fas fa-file-alt text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">No Case Studies Yet</h3>
                    <p class="text-gray-600 mb-4">Create your first case study to showcase your work</p>
                    <button onclick="window.open('create-test-case-studies-now.html', '_blank')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                        <i class="fas fa-plus mr-2"></i>Create Test Data
                    </button>
                </div>
            `;
            console.log('📝 Displayed "no case studies" message');
            return;
        }
        
        // Create case study cards
        const caseStudyCards = caseStudies.map(caseStudy => {
            const title = caseStudy.project_title || caseStudy.caseStudyTitle || 'Untitled Case Study';
            const description = caseStudy.heroSubtitle || caseStudy.overviewDescription || 'No description available';
            const status = caseStudy.status || 'draft';
            const featured = caseStudy.featured || false;
            const createdAt = new Date(caseStudy.created_at || Date.now()).toLocaleDateString();
            
            return `
                <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 flex-1 mr-2">
                            ${title}
                        </h3>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-1 text-xs rounded-full ${
                                status === 'published' ? 'bg-green-100 text-green-800' :
                                status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }">
                                ${status}
                            </span>
                            ${featured ? '<i class="fas fa-star text-yellow-500" title="Featured"></i>' : ''}
                        </div>
                    </div>
                    
                    <p class="text-gray-600 text-sm mb-4">
                        ${description}
                    </p>
                    
                    <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>Created: ${createdAt}</span>
                        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            ID: ${caseStudy.id ? caseStudy.id.substring(0, 8) + '...' : 'N/A'}
                        </span>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button onclick="editCaseStudy('${caseStudy.id}')" class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </button>
                        <button onclick="viewCaseStudy('${caseStudy.id}')" class="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                        <button onclick="deleteCaseStudy('${caseStudy.id}')" class="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = caseStudyCards;
        console.log('✅ Displayed', caseStudies.length, 'case study cards');
    }
    
    function updateMetrics(caseStudies) {
        console.log('📊 Updating metrics...');
        
        const total = caseStudies.length;
        
        // Update total case studies metric
        const totalElement = document.getElementById('totalCaseStudies');
        if (totalElement) {
            totalElement.textContent = total;
        }
        
        // Update total projects (same as case studies for now)
        const projectsElement = document.getElementById('totalProjects');
        if (projectsElement) {
            projectsElement.textContent = total;
        }
        
        console.log('📊 Metrics updated:', { total });
    }
    
    // Global functions for case study actions
    window.editCaseStudy = function(id) {
        console.log('✏️ Editing case study:', id);
        window.location.href = `case_study_editor_complete.html?id=${id}`;
    };
    
    window.viewCaseStudy = function(id) {
        console.log('👁️ Viewing case study:', id);
        alert(`View case study: ${id}\n\nThis would open the case study in view mode.`);
    };
    
    window.deleteCaseStudy = function(id) {
        console.log('🗑️ Deleting case study:', id);
        
        if (confirm('Are you sure you want to delete this case study? This action cannot be undone.')) {
            try {
                const storedData = localStorage.getItem('portfolio_case_studies');
                if (storedData) {
                    let caseStudies = JSON.parse(storedData);
                    caseStudies = caseStudies.filter(cs => cs.id !== id);
                    localStorage.setItem('portfolio_case_studies', JSON.stringify(caseStudies));
                    console.log('✅ Case study deleted from localStorage');
                    
                    // Refresh display
                    loadCaseStudies();
                }
            } catch (error) {
                console.error('❌ Error deleting case study:', error);
                alert('Error deleting case study. Please try again.');
            }
        }
    };
    
    console.log('✅ Inline Case Study Fix loaded');
})();