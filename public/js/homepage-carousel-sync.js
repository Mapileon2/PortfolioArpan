/**
 * Homepage Carousel Sync
 * Listens for carousel updates from admin and updates the homepage carousel
 */

class HomepageCarouselSync {
    constructor() {
        this.swiperInstance = null;
        this.init();
    }

    init() {
        console.log('🔄 Initializing Homepage Carousel Sync...');
        
        // Listen for carousel updates from admin
        window.addEventListener('carouselDataUpdated', (event) => {
            console.log('📡 Received carousel update event:', event.detail);
            this.updateCarousel(event.detail.items);
        });
        
        // Wait for existing Swiper to be initialized first
        this.waitForExistingSwiper(() => {
            // Check for stored carousel data on page load
            this.loadStoredCarouselData();
        });
        
        console.log('✅ Homepage Carousel Sync ready');
    }

    waitForExistingSwiper(callback) {
        const checkSwiper = () => {
            const swiperContainer = document.querySelector('.swiper-magical');
            if (swiperContainer && swiperContainer.swiper) {
                console.log('✅ Found existing Swiper instance');
                this.swiperInstance = swiperContainer.swiper;
                callback();
            } else {
                console.log('⏳ Waiting for existing Swiper...');
                setTimeout(checkSwiper, 200);
            }
        };
        checkSwiper();
    }

    loadStoredCarouselData() {
        try {
            const storedData = localStorage.getItem('homepageCarouselData');
            if (storedData) {
                const items = JSON.parse(storedData);
                console.log('📦 Found stored carousel data:', items.length, 'items');
                this.updateCarousel(items);
                return true;
            } else {
                console.log('📦 No stored carousel data found, using default slides');
                this.showDefaultSlides();
                return false;
            }
        } catch (error) {
            console.error('Error loading stored carousel data:', error);
            this.showDefaultSlides();
            return false;
        }
    }

    updateCarousel(items) {
        console.log('🔄 Updating homepage carousel with', items.length, 'items');
        
        const swiperWrapper = document.querySelector('.swiper-wrapper');
        if (!swiperWrapper) {
            console.warn('Swiper wrapper not found');
            return;
        }

        // Clear existing slides
        swiperWrapper.innerHTML = '';

        // Add new slides from admin data
        if (items && items.length > 0) {
            items.forEach((item, index) => {
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                slide.innerHTML = `
                    <img src="${item.url}" alt="${item.alt || item.title}" 
                         onerror="this.src='https://picsum.photos/800/400?random=${index + 1}'; this.classList.add('fallback-image');">
                    <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                        <h3 class="text-white text-2xl font-bold ghibli-font">${item.title}</h3>
                        <p class="text-white/90">${item.description || 'Magical journey step ' + (index + 1)}</p>
                    </div>
                `;
                swiperWrapper.appendChild(slide);
            });
            
            console.log('✅ Added', items.length, 'slides from carousel manager');
        } else {
            // If no items, show default content
            this.showDefaultSlides();
        }

        // Reinitialize or update swiper
        this.reinitializeSwiper();
        
        // Show success message
        if (items && items.length > 0) {
            this.showUpdateNotification(items.length);
        }
    }

    showDefaultSlides() {
        const swiperWrapper = document.querySelector('.swiper-wrapper');
        if (!swiperWrapper) return;

        // Default slides as fallback
        const defaultSlides = [
            {
                src: 'images/Image carousel/IMG_20220904_104615.jpg',
                title: 'Journey Step 1',
                fallback: 'https://picsum.photos/800/400?random=1'
            },
            {
                src: 'images/Image carousel/IMG_1078.jpg',
                title: 'Journey Step 2',
                fallback: 'https://picsum.photos/800/400?random=2'
            },
            {
                src: 'images/Image carousel/1000010842.jpg',
                title: 'Journey Step 3',
                fallback: 'https://picsum.photos/800/400?random=3'
            }
        ];

        swiperWrapper.innerHTML = defaultSlides.map((slide, index) => `
            <div class="swiper-slide">
                <img src="${slide.src}" alt="${slide.title}" 
                     onerror="this.src='${slide.fallback}'; this.classList.add('fallback-image');">
                <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                    <h3 class="text-white text-2xl font-bold ghibli-font">${slide.title}</h3>
                </div>
            </div>
        `).join('');
    }

    initializeSwiper() {
        // This method is no longer needed since we use the existing Swiper
        // The existing Swiper is found in waitForExistingSwiper()
        console.log('✅ Using existing Swiper instance from homepage');
    }

    reinitializeSwiper() {
        if (this.swiperInstance) {
            try {
                // Destroy and recreate to ensure proper slide recognition
                this.swiperInstance.destroy(true, true);
                
                // Wait a moment then recreate
                setTimeout(() => {
                    const swiperContainer = document.querySelector('.swiper-magical');
                    if (swiperContainer) {
                        // Use the same options as the original Swiper
                        this.swiperInstance = new Swiper('.swiper-magical', {
                            effect: "slide",
                            grabCursor: true,
                            centeredSlides: false,
                            slidesPerView: 1,
                            spaceBetween: 30,
                            loop: true,
                            pagination: {
                                el: ".swiper-pagination",
                                clickable: true
                            },
                            navigation: {
                                nextEl: ".swiper-button-next",
                                prevEl: ".swiper-button-prev",
                            },
                            autoplay: {
                                delay: 5000,
                                disableOnInteraction: false,
                            },
                            speed: 800,
                            observer: true,
                            observeParents: true,
                        });
                        
                        console.log('🔄 Swiper recreated with new slides');
                    }
                }, 100);
            } catch (error) {
                console.error('❌ Error reinitializing Swiper:', error);
            }
        }
    }

    showUpdateNotification(itemCount) {
        // Create a subtle notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300';
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-sync-alt"></i>
                <span>Carousel updated with ${itemCount} items</span>
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
}

// Initialize after the existing Swiper is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on homepage (not admin pages)
    if (document.querySelector('.swiper-magical')) {
        // Wait longer for the existing Swiper to be fully initialized
        setTimeout(() => {
            console.log('🚀 Starting Homepage Carousel Sync initialization...');
            new HomepageCarouselSync();
        }, 1500); // Increased delay to ensure existing Swiper is ready
    }
});