/**
 * Firebase Data Fallback
 * Provides fallback data when Firebase is not available or blocked
 */

(function() {
    'use strict';
    
    console.log('Firebase data fallback loaded');
    
    // Mock Firebase data structure
    window.firebaseFallbackData = {
        carouselImages: [
            {
                id: 'fallback-1',
                title: 'Welcome to My Portfolio',
                description: 'Discover my journey in product management and consulting',
                url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=600&fit=crop',
                order: 0,
                isActive: true
            },
            {
                id: 'fallback-2',
                title: 'Featured Projects',
                description: 'Explore my latest work and achievements',
                url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=600&fit=crop',
                order: 1,
                isActive: true
            },
            {
                id: 'fallback-3',
                title: 'Case Studies',
                description: 'Deep dive into my problem-solving approach',
                url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop',
                order: 2,
                isActive: true
            }
        ],
        
        projects: [
            {
                id: 'project-1',
                title: 'Strategic Consulting Project',
                description: 'Led digital transformation initiative for Fortune 500 company',
                image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop',
                tags: ['Strategy', 'Digital Transformation', 'Analytics']
            }
        ]
    };
    
    // Store fallback data in localStorage for carousel integration
    if (!localStorage.getItem('carouselSlides')) {
        localStorage.setItem('carouselSlides', JSON.stringify(window.firebaseFallbackData.carouselImages));
        console.log('Stored fallback carousel slides in localStorage');
    }
    
})();