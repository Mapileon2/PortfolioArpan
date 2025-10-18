/**
 * Front Page Carousel Integration
 * Connects admin-managed carousel slides to the front page display
 */

class FrontCarouselIntegration {
    constructor() {
        this.slides = [];
        this.currentSlide = 0;
        this.swiper = null;
        this.autoplayInterval = null;
        this.init();
    }

    async init() {
        console.log('🎠 Initializing Front Carousel Integration...');
        
        // Load slides from admin system
        await this.loadSlides();
        
        // Initialize carousel display
        this.initializeCarousel();
        
        // Setup auto-refresh
        this.setupAutoRefresh();
        
        console.log('✅ Front Carousel Integration ready with', this.slides.length, 'slides');
    }

    async loadSlides() {
        try {
            // Try multiple sources for slides
            this.slides = await this.getSlidesFromMultipleSources();
            
            if (this.slides.length === 0) {
                console.warn('No carousel slides found, using fallback');
                this.slides = this.getFallbackSlides();
            }
            
            console.log('📸 Loaded', this.slides.length, 'carousel slides');
        } catch (error) {
            console.error('Failed to load carousel slides:', error);
            this.slides = this.getFallbackSlides();
        }
    }

    async getSlidesFromMultipleSources() {
        // Try localStorage first (updated by admin)
        const localSlides = this.getLocalStorageSlides();
        if (localSlides.length > 0) {
            console.log('📸 Using slides from localStorage (admin managed)');
            return localSlides;
        }

        // Try admin integration system
        if (window.carouselAdminIntegration) {
            try {
                const adminSlides = window.carouselAdminIntegration.getActiveSlides();
                if (adminSlides.length > 0) {
                    console.log('📸 Using slides from admin integration');
                    return adminSlides;
                }
            } catch (error) {
                console.warn('Failed to load from admin integration:', error);
            }
        }

        // Try Supabase if available
        if (window.workingSupabaseClient) {
            try {
                const supabaseSlides = await window.workingSupabaseClient.getCarouselSlides();
                if (supabaseSlides.length > 0) {
                    return supabaseSlides.filter(slide => slide.is_active);
                }
            } catch (error) {
                console.warn('Failed to load from Supabase:', error);
            }
        }

        // Try API endpoint (only works with server)
        if (window.location.protocol !== 'file:') {
            try {
                const response = await fetch('/api/carousel-slides');
                if (response.ok) {
                    const apiSlides = await response.json();
                    return apiSlides.filter(slide => slide.is_active);
                }
            } catch (error) {
                console.warn('Failed to load from API:', error);
            }
        }

        return [];
    }

    getLocalStorageSlides() {
        try {
            const stored = localStorage.getItem('carouselSlides');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to parse localStorage slides:', error);
            return [];
        }
    }

    initializeCarousel() {
        // Check if Swiper is available
        if (typeof Swiper !== 'undefined') {
            this.initializeSwiperCarousel();
        } else {
            this.initializeBasicCarousel();
        }
    }

    initializeSwiperCarousel() {
        // Update slides in existing Swiper container
        this.updateSwiperSlides();
        
        // Initialize or reinitialize Swiper
        const swiperContainer = document.querySelector('.swiper-magical');
        if (swiperContainer) {
            // Destroy existing Swiper if it exists
            if (this.swiper) {
                this.swiper.destroy(true, true);
            }
            
            // Create new Swiper instance
            this.swiper = new Swiper('.swiper-magical', {
                loop: true,
                autoplay: {
                    delay: 5000,
                    disableOnInteraction: false,
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                effect: 'fade',
                fadeEffect: {
                    crossFade: true
                },
                on: {
                    slideChange: () => {
                        this.currentSlide = this.swiper.realIndex;
                        this.trackSlideView();
                    }
                }
            });
            
            console.log('✅ Swiper carousel initialized');
        }
    }

    updateSwiperSlides() {
        const swiperWrapper = document.querySelector('.swiper-wrapper');
        if (!swiperWrapper) return;

        // Clear existing slides
        swiperWrapper.innerHTML = '';

        // Add new slides
        this.slides.forEach((slide, index) => {
            const slideElement = this.createSwiperSlide(slide, index);
            swiperWrapper.appendChild(slideElement);
        });
    }

    createSwiperSlide(slide, index) {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'swiper-slide';
        slideDiv.innerHTML = `
            <img src="${slide.image_url}" 
                 alt="${slide.title}" 
                 class="w-full h-full object-cover"
                 onerror="this.src='https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=600&fit=crop'; this.classList.add('fallback-image');"
                 loading="${index === 0 ? 'eager' : 'lazy'}">
            
            <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                <h3 class="text-white text-2xl font-bold ghibli-font mb-2">${slide.title}</h3>
                ${slide.description ? `<p class="text-white text-opacity-90 mb-3">${slide.description}</p>` : ''}
                ${slide.link_url ? `
                    <a href="${slide.link_url}" 
                       class="inline-flex items-center text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors backdrop-blur-sm"
                       onclick="window.frontCarousel.trackSlideClick('${slide.id}')">
                        <span class="mr-2">Learn More</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                ` : ''}
            </div>
        `;
        return slideDiv;
    }

    initializeBasicCarousel() {
        // Fallback for when Swiper is not available
        const carouselContainer = document.querySelector('.carousel-container') || this.createBasicCarouselContainer();
        this.updateBasicCarousel(carouselContainer);
        this.startAutoplay();
    }

    createBasicCarouselContainer() {
        const container = document.createElement('div');
        container.className = 'carousel-container relative w-full h-96 overflow-hidden rounded-2xl shadow-2xl';
        container.innerHTML = `
            <div class="carousel-track flex transition-transform duration-500 ease-in-out h-full"></div>
            <div class="carousel-controls absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2"></div>
            <button class="carousel-prev absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="carousel-next absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition-colors">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        // Insert into magical journeys section
        const magicalSection = document.querySelector('#magical-journeys') || document.querySelector('.magical-journeys');
        if (magicalSection) {
            const existingCarousel = magicalSection.querySelector('.swiper-magical');
            if (existingCarousel) {
                existingCarousel.parentNode.replaceChild(container, existingCarousel);
            } else {
                magicalSection.appendChild(container);
            }
        }
        
        return container;
    }

    updateBasicCarousel(container) {
        const track = container.querySelector('.carousel-track');
        const controls = container.querySelector('.carousel-controls');
        
        if (!track || !controls) return;

        // Clear existing content
        track.innerHTML = '';
        controls.innerHTML = '';

        // Add slides
        this.slides.forEach((slide, index) => {
            // Create slide
            const slideElement = document.createElement('div');
            slideElement.className = 'carousel-slide flex-shrink-0 w-full h-full relative';
            slideElement.innerHTML = `
                <img src="${slide.image_url}" 
                     alt="${slide.title}" 
                     class="w-full h-full object-cover"
                     onerror="this.src='https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=600&fit=crop';">
                
                <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                    <h3 class="text-white text-2xl font-bold ghibli-font mb-2">${slide.title}</h3>
                    ${slide.description ? `<p class="text-white text-opacity-90 mb-3">${slide.description}</p>` : ''}
                    ${slide.link_url ? `
                        <a href="${slide.link_url}" 
                           class="inline-flex items-center text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors backdrop-blur-sm">
                            <span class="mr-2">Learn More</span>
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    ` : ''}
                </div>
            `;
            track.appendChild(slideElement);

            // Create control dot
            const dot = document.createElement('button');
            dot.className = `carousel-dot w-3 h-3 rounded-full transition-colors ${index === 0 ? 'bg-white' : 'bg-white/50'}`;
            dot.onclick = () => this.goToSlide(index);
            controls.appendChild(dot);
        });

        // Setup navigation
        const prevBtn = container.querySelector('.carousel-prev');
        const nextBtn = container.querySelector('.carousel-next');
        
        if (prevBtn) prevBtn.onclick = () => this.previousSlide();
        if (nextBtn) nextBtn.onclick = () => this.nextSlide();
    }

    goToSlide(index) {
        if (this.swiper) {
            this.swiper.slideToLoop(index);
        } else {
            this.currentSlide = index;
            this.updateBasicCarouselPosition();
        }
        this.trackSlideView();
    }

    nextSlide() {
        if (this.swiper) {
            this.swiper.slideNext();
        } else {
            this.currentSlide = (this.currentSlide + 1) % this.slides.length;
            this.updateBasicCarouselPosition();
        }
        this.trackSlideView();
    }

    previousSlide() {
        if (this.swiper) {
            this.swiper.slidePrev();
        } else {
            this.currentSlide = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
            this.updateBasicCarouselPosition();
        }
        this.trackSlideView();
    }

    updateBasicCarouselPosition() {
        const track = document.querySelector('.carousel-track');
        const dots = document.querySelectorAll('.carousel-dot');
        
        if (track) {
            track.style.transform = `translateX(-${this.currentSlide * 100}%)`;
        }
        
        dots.forEach((dot, index) => {
            dot.className = `carousel-dot w-3 h-3 rounded-full transition-colors ${
                index === this.currentSlide ? 'bg-white' : 'bg-white/50'
            }`;
        });
    }

    startAutoplay() {
        this.stopAutoplay();
        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, 5000);
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }

    setupAutoRefresh() {
        // Listen for storage changes (when admin updates slides)
        window.addEventListener('storage', (e) => {
            if (e.key === 'carouselSlides') {
                console.log('🔄 Carousel slides updated, refreshing...');
                this.loadSlides().then(() => {
                    this.initializeCarousel();
                });
            }
        });

        // Periodic refresh every 5 minutes
        setInterval(() => {
            this.loadSlides().then(() => {
                if (this.hasSlideChanges()) {
                    console.log('🔄 Detected slide changes, refreshing carousel...');
                    this.initializeCarousel();
                }
            });
        }, 5 * 60 * 1000);
    }

    hasSlideChanges() {
        const currentSlideIds = this.slides.map(s => s.id).sort();
        const newSlides = this.getLocalStorageSlides();
        const newSlideIds = newSlides.map(s => s.id).sort();
        
        return JSON.stringify(currentSlideIds) !== JSON.stringify(newSlideIds);
    }

    // ==================== ANALYTICS & TRACKING ====================

    trackSlideView() {
        const slide = this.slides[this.currentSlide];
        if (!slide) return;

        // Track slide view
        this.sendAnalyticsEvent('carousel_slide_view', {
            slide_id: slide.id,
            slide_title: slide.title,
            slide_position: this.currentSlide + 1,
            total_slides: this.slides.length
        });
    }

    trackSlideClick(slideId) {
        const slide = this.slides.find(s => s.id === slideId);
        if (!slide) return;

        // Track slide click
        this.sendAnalyticsEvent('carousel_slide_click', {
            slide_id: slide.id,
            slide_title: slide.title,
            link_url: slide.link_url
        });
    }

    sendAnalyticsEvent(event, data) {
        try {
            // Send to analytics service if available
            if (window.gtag) {
                window.gtag('event', event, data);
            }
            
            // Send to custom analytics
            if (window.saasFeatures) {
                window.saasFeatures.sendAnalyticsEvent(event, data);
            }
            
            console.log('📊 Analytics event:', event, data);
        } catch (error) {
            console.error('Failed to send analytics event:', error);
        }
    }

    // ==================== FALLBACK DATA ====================

    getFallbackSlides() {
        return [
            {
                id: 'fallback-1',
                title: 'Welcome to My Portfolio',
                description: 'Discover my journey in product management and consulting',
                image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=600&fit=crop',
                link_url: '#about',
                order_index: 0,
                is_active: true
            },
            {
                id: 'fallback-2',
                title: 'Featured Projects',
                description: 'Explore my latest work and achievements',
                image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=600&fit=crop',
                link_url: '#projects',
                order_index: 1,
                is_active: true
            },
            {
                id: 'fallback-3',
                title: 'Case Studies',
                description: 'Deep dive into my problem-solving approach',
                image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop',
                link_url: '#case-studies',
                order_index: 2,
                is_active: true
            }
        ];
    }

    // ==================== PUBLIC API ====================

    // Method called by admin system to update slides
    updateSlides(newSlides) {
        this.slides = newSlides.filter(slide => slide.is_active);
        this.initializeCarousel();
        console.log('✅ Carousel updated with', this.slides.length, 'slides');
    }

    // Get current slide info
    getCurrentSlide() {
        return this.slides[this.currentSlide];
    }

    // Get all slides
    getAllSlides() {
        return [...this.slides];
    }

    // Refresh slides from source
    async refresh() {
        await this.loadSlides();
        this.initializeCarousel();
    }
}

// Global function for admin system to update carousel
window.updateCarouselSlides = function(slides) {
    if (window.frontCarousel) {
        window.frontCarousel.updateSlides(slides);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other scripts are loaded
    setTimeout(() => {
        window.frontCarousel = new FrontCarouselIntegration();
    }, 1000);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FrontCarouselIntegration;
}