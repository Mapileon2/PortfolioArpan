/**
 * IMMEDIATE CASE STUDY DISPLAY FIX
 * Forces homepage to display case studies with proper titles and data
 */

(function() {
    console.log('🚨 IMMEDIATE CASE STUDY DISPLAY FIX LOADING...');

    function fixCaseStudyDisplay() {
        console.log('🔄 Fixing case study display...');
        
        const projectsGrid = document.getElementById('projectsGrid');
        const projectsLoading = document.getElementById('projectsLoading');
        const projectsError = document.getElementById('projectsError');
        
        if (!projectsGrid) {
            console.log('📄 Not on homepage, skipping fix');
            return false;
        }

        // Show loading
        if (projectsLoading) projectsLoading.classList.remove('hidden');
        if (projectsError) projectsError.classList.add('hidden');
        if (projectsGrid) projectsGrid.classList.add('hidden');

        // Fetch case studies and fix display
        fetch('/api/case-studies')
            .then(response => response.json())
            .then(caseStudies => {
                console.log('📦 Loaded case studies for fix:', caseStudies.length);
                
                // Hide loading
                if (projectsLoading) projectsLoading.classList.add('hidden');
                
                if (caseStudies.length === 0) {
                    if (projectsError) {
                        projectsError.querySelector('p').textContent = 'No magical projects available yet.';
                        projectsError.classList.remove('hidden');
                    }
                    return;
                }

                // Clear existing content
                projectsGrid.innerHTML = '';

                // Process each case study with proper data mapping
                caseStudies.forEach((cs, index) => {
                    // NORMALIZE DATA - Convert snake_case to camelCase and extract from sections
                    const normalizedCs = {
                        id: cs.id,
                        projectTitle: cs.project_title || cs.projectTitle || extractTitle(cs) || `Project ${index + 1}`,
                        projectDescription: cs.project_description || cs.projectDescription || extractDescription(cs) || 'Explore this amazing project.',
                        projectImageUrl: cs.project_image_url || cs.projectImageUrl || extractImage(cs) || 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop',
                        projectCategory: cs.project_category || cs.projectCategory || 'Project',
                        projectRating: cs.project_rating || cs.projectRating || 5,
                        projectAchievement: cs.project_achievement || cs.projectAchievement || 'Successfully completed',
                        sections: cs.sections || {}
                    };

                    console.log(`✅ Fixed case study: "${normalizedCs.projectTitle}"`);

                    // Create card with fixed data
                    const card = document.createElement('div');
                    card.className = 'project-book';
                    card.innerHTML = `
                        <div class="relative h-full">
                            <div class="book-inner bg-white rounded-xl shadow-xl overflow-hidden h-full dark:bg-gray-800">
                                <img src="${normalizedCs.projectImageUrl}" 
                                     alt="${normalizedCs.projectTitle}" 
                                     class="w-full h-48 object-cover"
                                     onerror="this.src='https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop'">
                                <div class="p-6">
                                    <h3 class="ghibli-font text-2xl dark:text-gray-200 mb-2">${normalizedCs.projectTitle}</h3>
                                    <p class="text-gray-600 dark:text-gray-400 mb-4">${normalizedCs.projectDescription}</p>
                                    <div class="flex items-center mb-4">
                                        <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">${normalizedCs.projectCategory}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <span class="text-yellow-500">${'★'.repeat(normalizedCs.projectRating)}${'☆'.repeat(5-normalizedCs.projectRating)}</span>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">${normalizedCs.projectAchievement}</p>
                                        </div>
                                        <a href="case_study.html?caseId=${normalizedCs.id}" class="text-blue-600 dark:text-blue-400 hover:underline">Read Story</a>
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
                showFixNotification(caseStudies.length);
                
                console.log('🎉 CASE STUDY DISPLAY FIX COMPLETE!');
            })
            .catch(error => {
                console.error('❌ Fix failed:', error);
                if (projectsLoading) projectsLoading.classList.add('hidden');
                if (projectsError) projectsError.classList.remove('hidden');
            });

        return true;
    }

    function extractTitle(cs) {
        if (cs.sections) {
            if (cs.sections.hero) {
                return cs.sections.hero.title || cs.sections.hero.headline;
            }
        }
        return null;
    }

    function extractDescription(cs) {
        if (cs.sections) {
            if (cs.sections.hero) {
                if (cs.sections.hero.description) return cs.sections.hero.description;
                if (cs.sections.hero.subtitle) return cs.sections.hero.subtitle;
            }
            if (cs.sections.overview) {
                if (cs.sections.overview.summary) return cs.sections.overview.summary;
                if (cs.sections.overview.content) {
                    const contentText = cs.sections.overview.content.replace(/<[^>]*>/g, '');
                    return contentText.substring(0, 150) + (contentText.length > 150 ? '...' : '');
                }
            }
        }
        return null;
    }

    function extractImage(cs) {
        if (cs.sections) {
            if (cs.sections.hero && cs.sections.hero.image) {
                return cs.sections.hero.image;
            }
            if (cs.sections.gallery && cs.sections.gallery.images && cs.sections.gallery.images.length > 0) {
                return cs.sections.gallery.images[0].url;
            }
        }
        return null;
    }

    function showFixNotification(itemCount) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg';
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="text-2xl">✅</span>
                <div>
                    <div class="font-bold">Case Studies Fixed!</div>
                    <div class="text-sm">${itemCount} projects now showing properly</div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Try to fix multiple times to ensure it works
    function attemptFix() {
        let attempts = 0;
        const maxAttempts = 5;
        
        const tryFix = () => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} to fix case study display...`);
            
            if (fixCaseStudyDisplay()) {
                console.log('🎉 CASE STUDY DISPLAY FIX SUCCESSFUL!');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryFix, 2000);
            } else {
                console.error('❌ Failed to fix case study display after', maxAttempts, 'attempts');
            }
        };
        
        tryFix();
    }

    // Start the fix process
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(attemptFix, 3000); // Wait for other scripts
        });
    } else {
        setTimeout(attemptFix, 3000);
    }

    console.log('✅ IMMEDIATE CASE STUDY DISPLAY FIX LOADED');
})();