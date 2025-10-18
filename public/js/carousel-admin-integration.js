/**
 * Carousel Admin Integration
 * Connects admin panel carousel management with front page display
 * Works without server by using localStorage
 */

class CarouselAdminIntegration {
    constructor() {
        this.storageKey = 'adminCarouselSlides';
        this.frontStorageKey = 'carouselSlides';
        this.init();
    }

    init() {
        console.log('🎠 Initializing Carousel Admin Integration...');
        
        // Initialize with sample data if empty
        this.initializeSampleData();
        
        // Set up event listeners for admin panel
        this.setupAdminEventListeners();
        
        // Set up storage sync
        this.setupStorageSync();
        
        console.log('✅ Carousel Admin Integration ready');
    }

    initializeSampleData() {
        const existingSlides = this.getAdminSlides();
        
        if (existingSlides.length === 0) {
            const sampleSlides = [
                {
                    id: 'sample-1',
                    title: 'Welcome to My Portfolio',
                    description: 'Discover my journey in product management and consulting',
                    image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=600&fit=crop',
                    link_url: '#about',
                    order_index: 0,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 'sample-2',
                    title: 'Featured Case Studies',
                    description: 'Explore my problem-solving approach and strategic insights',
                    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop',
                    link_url: '#projects',
                    order_index: 1,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 'sample-3',
                    title: 'Strategic Consulting',
                    description: 'Transforming business challenges into growth opportunities',
                    image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=600&fit=crop',
                    link_url: '#contact',
                    order_index: 2,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
            
            this.saveAdminSlides(sampleSlides);
            this.syncToFrontPage();
            console.log('✅ Initialized with sample carousel slides');
        }
    }

    setupAdminEventListeners() {
        // Listen for admin panel updates
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                console.log('🔄 Admin slides updated, syncing to front page...');
                this.syncToFrontPage();
            }
        });
    }

    setupStorageSync() {
        // Sync admin slides to front page on page load
        this.syncToFrontPage();
        
        // Set up periodic sync (every 30 seconds)
        setInterval(() => {
            this.syncToFrontPage();
        }, 30000);
    }

    // ==================== ADMIN SLIDE MANAGEMENT ====================

    getAdminSlides() {
        try {
            const slides = localStorage.getItem(this.storageKey);
            return slides ? JSON.parse(slides) : [];
        } catch (error) {
            console.error('Failed to get admin slides:', error);
            return [];
        }
    }

    saveAdminSlides(slides) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(slides));
            this.syncToFrontPage();
            return true;
        } catch (error) {
            console.error('Failed to save admin slides:', error);
            return false;
        }
    }

    addSlide(slideData) {
        const slides = this.getAdminSlides();
        const newSlide = {
            id: Date.now().toString(),
            title: slideData.title,
            description: slideData.description,
            image_url: slideData.image_url,
            link_url: slideData.link_url || '',
            order_index: slides.length,
            is_active: slideData.is_active !== false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        slides.push(newSlide);
        this.saveAdminSlides(slides);
        
        console.log('✅ Added new slide:', newSlide.title);
        return newSlide;
    }

    updateSlide(slideId, updateData) {
        const slides = this.getAdminSlides();
        const slideIndex = slides.findIndex(s => s.id === slideId);
        
        if (slideIndex === -1) {
            console.error('Slide not found:', slideId);
            return null;
        }
        
        slides[slideIndex] = {
            ...slides[slideIndex],
            ...updateData,
            updated_at: new Date().toISOString()
        };
        
        this.saveAdminSlides(slides);
        
        console.log('✅ Updated slide:', slides[slideIndex].title);
        return slides[slideIndex];
    }

    deleteSlide(slideId) {
        const slides = this.getAdminSlides();
        const filteredSlides = slides.filter(s => s.id !== slideId);
        
        if (filteredSlides.length === slides.length) {
            console.error('Slide not found for deletion:', slideId);
            return false;
        }
        
        this.saveAdminSlides(filteredSlides);
        
        console.log('✅ Deleted slide:', slideId);
        return true;
    }

    reorderSlides(newOrder) {
        const slides = this.getAdminSlides();
        const reorderedSlides = newOrder.map((slideId, index) => {
            const slide = slides.find(s => s.id === slideId);
            if (slide) {
                slide.order_index = index;
                slide.updated_at = new Date().toISOString();
            }
            return slide;
        }).filter(Boolean);
        
        this.saveAdminSlides(reorderedSlides);
        
        console.log('✅ Reordered slides');
        return true;
    }

    // ==================== FRONT PAGE SYNC ====================

    syncToFrontPage() {
        const adminSlides = this.getAdminSlides();
        const activeSlides = adminSlides
            .filter(slide => slide.is_active)
            .sort((a, b) => a.order_index - b.order_index);
        
        // Convert to front page format
        const frontSlides = activeSlides.map(slide => ({
            id: slide.id,
            title: slide.title,
            description: slide.description,
            image_url: slide.image_url,
            link_url: slide.link_url,
            order_index: slide.order_index,
            is_active: slide.is_active
        }));
        
        // Save to front page storage
        try {
            localStorage.setItem(this.frontStorageKey, JSON.stringify(frontSlides));
            
            // Trigger front page carousel update
            if (window.frontCarousel && typeof window.frontCarousel.refresh === 'function') {
                window.frontCarousel.refresh();
            }
            
            // Dispatch custom event for other listeners
            window.dispatchEvent(new CustomEvent('carouselSlidesUpdated', {
                detail: { slides: frontSlides }
            }));
            
            console.log(`🔄 Synced ${frontSlides.length} active slides to front page`);
            return true;
        } catch (error) {
            console.error('Failed to sync to front page:', error);
            return false;
        }
    }

    // ==================== PUBLIC API ====================

    // Get slides for admin display
    getSlides() {
        return this.getAdminSlides();
    }

    // Get active slides for front page
    getActiveSlides() {
        return this.getAdminSlides()
            .filter(slide => slide.is_active)
            .sort((a, b) => a.order_index - b.order_index);
    }

    // Force sync to front page
    forcSync() {
        return this.syncToFrontPage();
    }

    // Clear all slides (for testing)
    clearAllSlides() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.frontStorageKey);
        console.log('🗑️ Cleared all carousel slides');
    }

    // Import slides from JSON
    importSlides(slidesData) {
        try {
            const slides = Array.isArray(slidesData) ? slidesData : JSON.parse(slidesData);
            this.saveAdminSlides(slides);
            console.log(`📥 Imported ${slides.length} slides`);
            return true;
        } catch (error) {
            console.error('Failed to import slides:', error);
            return false;
        }
    }

    // Export slides to JSON
    exportSlides() {
        const slides = this.getAdminSlides();
        return JSON.stringify(slides, null, 2);
    }
}

// Initialize the integration system
window.carouselAdminIntegration = new CarouselAdminIntegration();

// Global functions for admin panel
window.addCarouselSlide = function(slideData) {
    return window.carouselAdminIntegration.addSlide(slideData);
};

window.updateCarouselSlide = function(slideId, updateData) {
    return window.carouselAdminIntegration.updateSlide(slideId, updateData);
};

window.deleteCarouselSlide = function(slideId) {
    return window.carouselAdminIntegration.deleteSlide(slideId);
};

window.getCarouselSlides = function() {
    return window.carouselAdminIntegration.getSlides();
};

window.syncCarouselToFrontPage = function() {
    return window.carouselAdminIntegration.forcSync();
};

console.log('🎠 Carousel Admin Integration loaded and ready');