/**
 * Case Study Homepage Sync
 * Ensures case studies created in admin dashboard appear on homepage
 */

class CaseStudyHomepageSync {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔄 Initializing Case Study Homepage Sync...');
        
        // Listen for case study updates from admin
        window.addEventListener('caseStudyDataUpdated', (event) => {
            console.log('📡 Received case study update event:', event.detail);
            this.syncToHomepage(event.detail.caseStudies);
        });
        
        // Check for stored case study data on page load
        this.loadStoredCaseStudyData();
        
        console.log('✅ Case Study Homepage Sync ready');
    }

    loadStoredCaseStudyData() {
        try {
            const storedData = localStorage.getItem('homepageCaseStudyData');
            if (storedData) {
                const caseStudies = JSON.parse(storedData);
                console.log('📦 Found stored case study data:', caseStudies.length, 'items');
                this.updateHomepageProjects(caseStudies);
                return true;
            } else {
                console.log('📦 No stored case study data found, loading from API...');
                this.loadFromAPI();
                return false;
            }
        } catch (error) {
            console.error('Error loading stored case study data:', error);
            this.loadFromAPI();
            return false;
        }
    }

    async loadFromAPI() {
        try {
            console.log('🔍 Loading case studies from API...');
            const response = await fetch('/api/case-studies');
            if (response.ok) {
                const caseStudies = await response.json();
                console.log('✅ Loaded', caseStudies.length, 'case studies from API');
                this.syncToHomepage(caseStudies);
            } else {
                console.warn('⚠️ Failed to load case studies from API');
            }
        } catch (error) {
            console.error('❌ Error loading case studies from API:', error);
        }
    }

    syncToHomepage(caseStudies) {
        try {
            // Normalize data format for homepage consumption
            const homepageData = caseStudies.map(cs => ({
                id: cs.id,
                projectTitle: cs.project_title || cs.projectTitle || 'Untitled Project',
                projectDescription: cs.project_description || cs.projectDescription || this.extractDescription(cs),
                projectImageUrl: cs.project_image_url || cs.projectImageUrl || this.extractImage(cs),
                projectCategory: cs.project_category || cs.projectCategory || 'Project',
                projectRating: cs.project_rating || cs.projectRating || 5,
                projectAchievement: cs.project_achievement || cs.projectAchievement || 'Successfully completed',
                status: cs.status || 'published',
                created_at: cs.created_at,
                updated_at: cs.updated_at,
                sections: cs.sections || {}
            }));

            // Save to localStorage for homepage consumption
            localStorage.setItem('homepageCaseStudyData', JSON.stringify(homepageData));
            localStorage.setItem('caseStudyLastSync', new Date().toISOString());

            // Update homepage if we're on it
            this.updateHomepageProjects(homepageData);

            // Dispatch custom event for real-time updates
            window.dispatchEvent(new CustomEvent('homepageProjectsUpdated', {
                detail: { caseStudies: homepageData, timestamp: new Date().toISOString() }
            }));

            console.log('✅ Case study homepage sync completed:', homepageData.length, 'items');
            
            return homepageData;
        } catch (error) {
            console.error('❌ Case study homepage sync failed:', error);
            return null;
        }
    }

    extractDescription(caseStudy) {
        // Try to extract description from sections if not provided
        if (caseStudy.sections) {
            if (caseStudy.sections.overview && caseStudy.sections.overview.content) {
                const contentText = caseStudy.sections.overview.content.replace(/<[^>]*>/g, '');
                return contentText.substring(0, 150) + (contentText.length > 150 ? '...' : '');
            }
            if (caseStudy.sections.hero && caseStudy.sections.hero.description) {
                return caseStudy.sections.hero.description;
            }
        }
        return 'Explore this amazing project and discover the journey behind its creation.';
    }

    extractImage(caseStudy) {
        // Try to extract image from sections if not provided
        if (caseStudy.sections) {
            if (caseStudy.sections.hero && caseStudy.sections.hero.image) {
                return caseStudy.sections.hero.image;
            }
            if (caseStudy.sections.gallery && caseStudy.sections.gallery.images && caseStudy.sections.gallery.images.length > 0) {
                return caseStudy.sections.gallery.images[0].url;
            }
        }
        return 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop';
    }

    updateHomepageProjects(caseStudies) {
        // Only update if we're on the homepage
        const projectsGrid = document.getElementById('projectsGrid');
        const projectsLoading = document.getElementById('projectsLoading');
        const projectsError = document.getElementById('projectsError');
        
        if (!projectsGrid) {
            console.log('📄 Not on homepage, skipping DOM update');
            return;
        }

        console.log('🔄 Updating homepage projects with', caseStudies.length, 'case studies');

        // Hide loading and error states
        if (projectsLoading) projectsLoading.classList.add('hidden');
        if (projectsError) projectsError.classList.add('hidden');

        // Clear existing content
        projectsGrid.innerHTML = '';

        if (caseStudies.length === 0) {
            if (projectsError) {
                projectsError.querySelector('p').textContent = 'No magical projects available yet.';
                projectsError.classList.remove('hidden');
            }
            return;
        }

        // Add case studies to homepage
        caseStudies.forEach(cs => {
            const card = document.createElement('div');
            card.className = 'project-book';
            card.innerHTML = `
                <div class="relative h-full">
                    <div class="book-inner bg-white rounded-xl shadow-xl overflow-hidden h-full dark:bg-gray-800">
                        <img src="${cs.projectImageUrl}" 
                             alt="${cs.projectTitle}" 
                             class="w-full h-48 object-cover"
                             onerror="this.src='https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop'">
                        <div class="p-6">
                            <h3 class="ghibli-font text-2xl dark:text-gray-200 mb-2">${cs.projectTitle}</h3>
                            <p class="text-gray-600 dark:text-gray-400 mb-4">${cs.projectDescription}</p>
                            <div class="flex items-center mb-4">
                                <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">${cs.projectCategory}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-yellow-500">${'★'.repeat(cs.projectRating)}${'☆'.repeat(5-cs.projectRating)}</span>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">${cs.projectAchievement}</p>
                                </div>
                                <a href="case_study.html?caseId=${cs.id}" class="text-blue-600 dark:text-blue-400 hover:underline">Read Story</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            projectsGrid.appendChild(card);
        });

        // Show the grid
        projectsGrid.classList.remove('hidden');

        // Show success notification
        this.showUpdateNotification(caseStudies.length);
    }

    showUpdateNotification(itemCount) {
        // Create a subtle notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300';
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-sync-alt"></i>
                <span>Projects updated with ${itemCount} case studies</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Fade out after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // Method to be called from admin dashboard when case studies are created/updated
    static triggerSync() {
        fetch('/api/case-studies')
            .then(response => response.json())
            .then(caseStudies => {
                // Dispatch event to notify homepage
                window.dispatchEvent(new CustomEvent('caseStudyDataUpdated', {
                    detail: { caseStudies, timestamp: new Date().toISOString() }
                }));
                
                console.log('✅ Case study sync triggered from admin dashboard');
            })
            .catch(error => {
                console.error('❌ Failed to trigger case study sync:', error);
            });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize on homepage
    if (document.getElementById('projectsGrid')) {
        new CaseStudyHomepageSync();
    }
});

// Make triggerSync available globally for admin dashboard
window.CaseStudyHomepageSync = CaseStudyHomepageSync;