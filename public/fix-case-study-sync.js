/**
 * Fix Case Study Synchronization
 * Ensures case studies saved in editor appear in admin dashboard
 */

// Local storage key for case studies
const CASE_STUDIES_KEY = 'portfolio_case_studies';

// Case Study Storage Manager
class CaseStudyStorage {
    constructor() {
        this.caseStudies = this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(CASE_STUDIES_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading case studies from storage:', error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(CASE_STUDIES_KEY, JSON.stringify(this.caseStudies));
            console.log('✅ Case studies saved to localStorage:', this.caseStudies.length);
        } catch (error) {
            console.error('Error saving case studies to storage:', error);
        }
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
        
        console.log('📝 Case study added:', caseStudy.id, caseStudy.project_title || caseStudy.caseStudyTitle);
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
            console.log('📝 Case study updated:', id);
            return this.caseStudies[index];
        }
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
        return null;
    }
}

// Initialize storage manager
window.caseStudyStorage = new CaseStudyStorage();

// Enhanced fetch override that uses localStorage
const originalFetch = window.fetch;

window.fetch = async function(url, options = {}) {
    // Handle case study API calls with localStorage
    if (url.includes('/api/case-studies')) {
        console.log('🔧 Intercepting case study API call:', url, options.method || 'GET');
        
        const method = options.method || 'GET';
        
        if (method === 'GET') {
            // Return stored case studies
            const caseStudies = window.caseStudyStorage.getCaseStudies();
            console.log('📖 Returning stored case studies:', caseStudies.length);
            
            return new Response(JSON.stringify({
                success: true,
                data: caseStudies,
                message: `Found ${caseStudies.length} case studies in local storage`
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else if (method === 'POST') {
            // Save new case study
            const requestData = JSON.parse(options.body || '{}');
            console.log('💾 Saving new case study:', requestData);
            
            const savedCaseStudy = window.caseStudyStorage.addCaseStudy(requestData);
            
            // Trigger refresh in admin dashboard if it exists
            if (window.adminDashboard && typeof window.adminDashboard.loadCaseStudiesData === 'function') {
                setTimeout(() => {
                    console.log('🔄 Refreshing admin dashboard case studies...');
                    window.adminDashboard.loadCaseStudiesData();
                }, 500);
            }
            
            return new Response(JSON.stringify({
                success: true,
                data: savedCaseStudy,
                message: 'Case study saved successfully to local storage'
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else if (method === 'PUT') {
            // Update existing case study
            const requestData = JSON.parse(options.body || '{}');
            const urlParts = url.split('/');
            const id = urlParts[urlParts.length - 1];
            
            console.log('📝 Updating case study:', id, requestData);
            
            const updatedCaseStudy = window.caseStudyStorage.updateCaseStudy(id, requestData);
            
            if (updatedCaseStudy) {
                // Trigger refresh in admin dashboard if it exists
                if (window.adminDashboard && typeof window.adminDashboard.loadCaseStudiesData === 'function') {
                    setTimeout(() => {
                        console.log('🔄 Refreshing admin dashboard case studies...');
                        window.adminDashboard.loadCaseStudiesData();
                    }, 500);
                }
                
                return new Response(JSON.stringify({
                    success: true,
                    data: updatedCaseStudy,
                    message: 'Case study updated successfully'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Case study not found',
                    message: 'Case study with specified ID not found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
        } else if (method === 'DELETE') {
            // Delete case study
            const urlParts = url.split('/');
            const id = urlParts[urlParts.length - 1];
            
            console.log('🗑️ Deleting case study:', id);
            
            const deletedCaseStudy = window.caseStudyStorage.deleteCaseStudy(id);
            
            if (deletedCaseStudy) {
                // Trigger refresh in admin dashboard if it exists
                if (window.adminDashboard && typeof window.adminDashboard.loadCaseStudiesData === 'function') {
                    setTimeout(() => {
                        console.log('🔄 Refreshing admin dashboard case studies...');
                        window.adminDashboard.loadCaseStudiesData();
                    }, 500);
                }
                
                return new Response(JSON.stringify({
                    success: true,
                    data: deletedCaseStudy,
                    message: 'Case study deleted successfully'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Case study not found',
                    message: 'Case study with specified ID not found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
    }
    
    // For all other requests (like Cloudinary), use original fetch
    return originalFetch.call(this, url, options);
};

// Add sample case studies if none exist
window.addEventListener('load', () => {
    setTimeout(() => {
        const caseStudies = window.caseStudyStorage.getCaseStudies();
        
        if (caseStudies.length === 0) {
            console.log('📝 Adding sample case studies...');
            
            // Add a sample case study
            window.caseStudyStorage.addCaseStudy({
                project_title: 'Sample E-commerce Platform',
                caseStudyTitle: 'Sample E-commerce Platform',
                heroTitle: 'Revolutionary Shopping Experience',
                heroSubtitle: 'Modern e-commerce solution with React and Node.js',
                overviewTitle: 'Project Overview',
                overviewDescription: 'A comprehensive e-commerce platform built with modern technologies.',
                problemTitle: 'The Challenge',
                problemDescription: 'Creating a seamless shopping experience for modern consumers.',
                processTitle: 'Our Process',
                processDescription: 'We followed an agile development methodology.',
                showcaseTitle: 'Final Solution',
                showcaseDescription: 'A fully functional e-commerce platform.',
                reflectionTitle: 'Key Learnings',
                reflectionDescription: 'Important insights gained during development.',
                status: 'published',
                featured: true
            });
            
            console.log('✅ Sample case study added');
        }
        
        // Notify about localStorage usage
        if (window.caseStudyEditor) {
            window.caseStudyEditor.showNotification('info', 'Local Storage', 
                `Case studies are stored locally. ${caseStudies.length} case studies available.`);
        }
    }, 1000);
});

console.log('🔧 Case Study Sync Fix loaded - case studies will sync between editor and dashboard');