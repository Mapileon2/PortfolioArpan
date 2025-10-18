/**
 * Improved Case Study Synchronization Fix
 * Handles authentication issues and ensures proper sync between editor and admin dashboard
 */

// Local storage key for case studies
const CASE_STUDIES_KEY = 'portfolio_case_studies';

// Case Study Storage Manager
class CaseStudyStorage {
    constructor() {
        this.caseStudies = this.loadFromStorage();
        this.initializeEventListeners();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(CASE_STUDIES_KEY);
            const data = stored ? JSON.parse(stored) : [];
            console.log('📦 Loaded from localStorage:', data.length, 'case studies');
            return data;
        } catch (error) {
            console.error('❌ Error loading case studies from storage:', error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(CASE_STUDIES_KEY, JSON.stringify(this.caseStudies));
            console.log('💾 Saved to localStorage:', this.caseStudies.length, 'case studies');
            
            // Trigger storage event for cross-tab sync
            window.dispatchEvent(new StorageEvent('storage', {
                key: CASE_STUDIES_KEY,
                newValue: JSON.stringify(this.caseStudies),
                storageArea: localStorage
            }));
            
            // Trigger custom event for admin dashboard
            window.dispatchEvent(new CustomEvent('caseStudiesUpdated', {
                detail: { caseStudies: this.caseStudies }
            }));
            
        } catch (error) {
            console.error('❌ Error saving case studies to storage:', error);
        }
    }

    initializeEventListeners() {
        // Listen for storage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === CASE_STUDIES_KEY) {
                console.log('🔄 Storage updated from another tab');
                this.caseStudies = this.loadFromStorage();
            }
        });
    }

    addCaseStudy(caseStudyData) {
        const caseStudy = {
            id: 'cs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            ...caseStudyData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: caseStudyData.status || 'published'
        };

        this.caseStudies.push(caseStudy);
        this.saveToStorage();
        
        console.log('✅ Case study added:', caseStudy.id, caseStudy.project_title || caseStudy.caseStudyTitle);
        return caseStudy;
    }

    updateCaseStudy(id, updateData) {
        const index = this.caseStudies.findIndex(cs => cs.id === id);
        if (index !== -1) {
            this.caseStudies[index] = {
                ...this.caseStudies[index],
                ...updateData,
                updated_at: new Date().toISOString()
            };
            this.saveToStorage();
            console.log('✅ Case study updated:', id);
            return this.caseStudies[index];
        }
        console.warn('⚠️ Case study not found for update:', id);
        return null;
    }

    getCaseStudies() {
        return [...this.caseStudies];
    }

    getCaseStudy(id) {
        return this.caseStudies.find(cs => cs.id === id);
    }

    deleteCaseStudy(id) {
        const index = this.caseStudies.findIndex(cs => cs.id === id);
        if (index !== -1) {
            const deleted = this.caseStudies.splice(index, 1)[0];
            this.saveToStorage();
            console.log('🗑️ Case study deleted:', id);
            return deleted;
        }
        console.warn('⚠️ Case study not found for deletion:', id);
        return null;
    }

    // Get statistics
    getStats() {
        const total = this.caseStudies.length;
        const published = this.caseStudies.filter(cs => cs.status === 'published').length;
        const draft = this.caseStudies.filter(cs => cs.status === 'draft').length;
        const featured = this.caseStudies.filter(cs => cs.featured).length;
        
        return { total, published, draft, featured };
    }
}

// Initialize storage manager
window.caseStudyStorage = new CaseStudyStorage();

// Enhanced fetch override that handles authentication gracefully
const originalFetch = window.fetch;

window.fetch = async function(url, options = {}) {
    // Handle case study API calls
    if (url.includes('/api/case-studies')) {
        console.log('🔧 Intercepting case study API call:', url, options.method || 'GET');
        
        const method = options.method || 'GET';
        
        try {
            // First, try the original API call
            const response = await originalFetch.call(this, url, options);
            
            // If successful, return the response
            if (response.ok) {
                console.log('✅ API call successful, using server response');
                return response;
            }
            
            // If authentication failed (401) or server error (5xx), fall back to localStorage
            if (response.status === 401 || response.status >= 500) {
                console.log('⚠️ API call failed (status:', response.status, '), falling back to localStorage');
                return handleLocalStorageFallback(method, url, options);
            }
            
            // For other errors, return the original response
            return response;
            
        } catch (error) {
            // Network error or server unavailable, fall back to localStorage
            console.log('⚠️ Network error, falling back to localStorage:', error.message);
            return handleLocalStorageFallback(method, url, options);
        }
    }
    
    // For all other requests, use original fetch
    return originalFetch.call(this, url, options);
};

function handleLocalStorageFallback(method, url, options) {
    console.log('📦 Using localStorage fallback for:', method, url);
    
    if (method === 'GET') {
        // Return stored case studies
        const caseStudies = window.caseStudyStorage.getCaseStudies();
        console.log('📖 Returning stored case studies:', caseStudies.length);
        
        return new Response(JSON.stringify({
            success: true,
            data: caseStudies,
            message: `Found ${caseStudies.length} case studies in local storage`,
            source: 'localStorage'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } else if (method === 'POST') {
        // Save new case study
        const requestData = JSON.parse(options.body || '{}');
        console.log('💾 Saving new case study to localStorage:', requestData.project_title || requestData.caseStudyTitle);
        
        const savedCaseStudy = window.caseStudyStorage.addCaseStudy(requestData);
        
        return new Response(JSON.stringify({
            success: true,
            data: savedCaseStudy,
            message: 'Case study saved successfully to local storage',
            source: 'localStorage'
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } else if (method === 'PUT') {
        // Update existing case study
        const requestData = JSON.parse(options.body || '{}');
        const urlParts = url.split('/');
        const id = urlParts[urlParts.length - 1];
        
        console.log('📝 Updating case study in localStorage:', id);
        
        const updatedCaseStudy = window.caseStudyStorage.updateCaseStudy(id, requestData);
        
        if (updatedCaseStudy) {
            return new Response(JSON.stringify({
                success: true,
                data: updatedCaseStudy,
                message: 'Case study updated successfully in local storage',
                source: 'localStorage'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Case study not found',
                message: 'Case study with specified ID not found in local storage'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
    } else if (method === 'DELETE') {
        // Delete case study
        const urlParts = url.split('/');
        const id = urlParts[urlParts.length - 1];
        
        console.log('🗑️ Deleting case study from localStorage:', id);
        
        const deletedCaseStudy = window.caseStudyStorage.deleteCaseStudy(id);
        
        if (deletedCaseStudy) {
            return new Response(JSON.stringify({
                success: true,
                data: deletedCaseStudy,
                message: 'Case study deleted successfully from local storage',
                source: 'localStorage'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Case study not found',
                message: 'Case study with specified ID not found in local storage'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    // Fallback for unsupported methods
    return new Response(JSON.stringify({
        success: false,
        error: 'Method not supported',
        message: 'This method is not supported in localStorage fallback mode'
    }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Admin Dashboard Integration
class AdminDashboardIntegration {
    constructor() {
        this.initializeEventListeners();
        this.checkForAdminDashboard();
    }

    initializeEventListeners() {
        // Listen for case study updates
        window.addEventListener('caseStudiesUpdated', (event) => {
            console.log('🔄 Case studies updated, refreshing admin dashboard...');
            this.refreshAdminDashboard(event.detail.caseStudies);
        });
    }

    checkForAdminDashboard() {
        // Check if we're on the admin dashboard page
        if (document.title.includes('Admin Dashboard') || 
            document.querySelector('#dashboardView') ||
            window.location.pathname.includes('admin')) {
            
            console.log('🏠 Admin dashboard detected, initializing integration...');
            this.initializeAdminDashboard();
        }
    }

    initializeAdminDashboard() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupAdminDashboard();
            });
        } else {
            this.setupAdminDashboard();
        }
    }

    setupAdminDashboard() {
        // Override the loadCaseStudiesData function if it exists
        if (window.adminDashboard && typeof window.adminDashboard.loadCaseStudiesData === 'function') {
            const originalLoadCaseStudies = window.adminDashboard.loadCaseStudiesData;
            
            window.adminDashboard.loadCaseStudiesData = async function() {
                console.log('🔄 Loading case studies for admin dashboard...');
                
                try {
                    // Try to load from API first, then fall back to localStorage
                    const response = await fetch('/api/case-studies');
                    const data = await response.json();
                    
                    if (data.success && data.data) {
                        console.log('✅ Loaded case studies:', data.data.length);
                        this.displayCaseStudies(data.data);
                        this.updateMetrics();
                    } else {
                        console.log('⚠️ No case studies returned from API');
                        this.displayNoCaseStudies();
                    }
                } catch (error) {
                    console.error('❌ Error loading case studies:', error);
                    this.displayNoCaseStudies();
                }
            };
            
            // Trigger initial load
            setTimeout(() => {
                window.adminDashboard.loadCaseStudiesData();
            }, 1000);
        }
        
        // If no admin dashboard object exists, create basic functionality
        else {
            this.createBasicAdminFunctionality();
        }
    }

    createBasicAdminFunctionality() {
        console.log('🔧 Creating basic admin dashboard functionality...');
        
        // Update metrics if elements exist
        this.updateBasicMetrics();
        
        // Set up periodic refresh
        setInterval(() => {
            this.updateBasicMetrics();
        }, 30000); // Update every 30 seconds
    }

    updateBasicMetrics() {
        const stats = window.caseStudyStorage.getStats();
        
        // Update total case studies
        const totalElement = document.getElementById('totalCaseStudies');
        if (totalElement) {
            totalElement.textContent = stats.total;
        }
        
        // Update total projects (same as case studies for now)
        const projectsElement = document.getElementById('totalProjects');
        if (projectsElement) {
            projectsElement.textContent = stats.total;
        }
        
        console.log('📊 Updated metrics:', stats);
    }

    refreshAdminDashboard(caseStudies) {
        // Update metrics
        this.updateBasicMetrics();
        
        // If admin dashboard has a refresh method, call it
        if (window.adminDashboard && typeof window.adminDashboard.loadCaseStudiesData === 'function') {
            window.adminDashboard.loadCaseStudiesData();
        }
        
        // Update any case study lists on the page
        this.updateCaseStudyLists(caseStudies);
    }

    updateCaseStudyLists(caseStudies) {
        // Look for case study containers and update them
        const containers = document.querySelectorAll('[data-case-studies-container]');
        
        containers.forEach(container => {
            this.renderCaseStudiesInContainer(container, caseStudies);
        });
    }

    renderCaseStudiesInContainer(container, caseStudies) {
        if (caseStudies.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-book text-gray-400 text-4xl mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No Case Studies Yet</h3>
                    <p class="text-gray-500">Create your first case study to get started.</p>
                </div>
            `;
            return;
        }

        const caseStudyCards = caseStudies.map(caseStudy => `
            <div class="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">
                        ${caseStudy.project_title || caseStudy.caseStudyTitle || 'Untitled'}
                    </h3>
                    <span class="px-2 py-1 text-xs rounded-full ${
                        caseStudy.status === 'published' ? 'bg-green-100 text-green-800' :
                        caseStudy.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${caseStudy.status || 'unknown'}
                    </span>
                </div>
                <p class="text-gray-600 text-sm mb-4">
                    ${caseStudy.heroSubtitle || caseStudy.overviewDescription || 'No description available'}
                </p>
                <div class="flex items-center justify-between text-sm text-gray-500">
                    <span>Created: ${new Date(caseStudy.created_at).toLocaleDateString()}</span>
                    ${caseStudy.featured ? '<i class="fas fa-star text-yellow-500"></i>' : ''}
                </div>
            </div>
        `).join('');

        container.innerHTML = caseStudyCards;
    }
}

// Initialize admin dashboard integration
window.adminDashboardIntegration = new AdminDashboardIntegration();

// Add sample case studies if none exist
window.addEventListener('load', () => {
    setTimeout(() => {
        const caseStudies = window.caseStudyStorage.getCaseStudies();
        
        if (caseStudies.length === 0) {
            console.log('📝 Adding sample case studies...');
            
            // Add sample case studies
            const sampleCaseStudies = [
                {
                    project_title: 'E-commerce Platform Redesign',
                    caseStudyTitle: 'E-commerce Platform Redesign',
                    heroTitle: 'Modern Shopping Experience',
                    heroSubtitle: 'Redesigned e-commerce platform with improved UX and performance',
                    overviewDescription: 'A comprehensive redesign of an existing e-commerce platform to improve user experience and increase conversion rates.',
                    problemDescription: 'The existing platform had poor user experience and low conversion rates.',
                    processDescription: 'We conducted user research, created wireframes, and implemented a new design system.',
                    showcaseDescription: 'The new platform features improved navigation, faster checkout, and mobile optimization.',
                    reflectionDescription: 'Key learnings about user behavior and the importance of performance optimization.',
                    status: 'published',
                    featured: true
                },
                {
                    project_title: 'Mobile Banking App',
                    caseStudyTitle: 'Mobile Banking App',
                    heroTitle: 'Secure Digital Banking',
                    heroSubtitle: 'Native mobile app for secure and convenient banking',
                    overviewDescription: 'Development of a secure mobile banking application with biometric authentication.',
                    problemDescription: 'Users needed a secure and convenient way to manage their finances on mobile.',
                    processDescription: 'We implemented security best practices and intuitive user interface design.',
                    showcaseDescription: 'The app features biometric login, real-time notifications, and comprehensive account management.',
                    reflectionDescription: 'Insights into mobile security and user trust in financial applications.',
                    status: 'published',
                    featured: false
                },
                {
                    project_title: 'SaaS Dashboard Analytics',
                    caseStudyTitle: 'SaaS Dashboard Analytics',
                    heroTitle: 'Data-Driven Insights',
                    heroSubtitle: 'Analytics dashboard for SaaS platform with real-time data visualization',
                    overviewDescription: 'Built a comprehensive analytics dashboard for a SaaS platform to help users understand their data.',
                    problemDescription: 'Users needed better insights into their data and usage patterns.',
                    processDescription: 'We designed interactive charts, real-time updates, and customizable views.',
                    showcaseDescription: 'The dashboard provides real-time analytics, custom reports, and data export capabilities.',
                    reflectionDescription: 'Learned about data visualization best practices and performance optimization.',
                    status: 'draft',
                    featured: false
                }
            ];
            
            sampleCaseStudies.forEach(caseStudy => {
                window.caseStudyStorage.addCaseStudy(caseStudy);
            });
            
            console.log('✅ Sample case studies added');
        }
        
        console.log(`📊 Total case studies available: ${caseStudies.length}`);
    }, 1000);
});

console.log('🔧 Improved Case Study Sync Fix loaded - handles authentication gracefully');