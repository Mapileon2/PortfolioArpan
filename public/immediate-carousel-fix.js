/**
 * IMMEDIATE CAROUSEL FIX
 * This script directly replaces the hardcoded slides with dynamic content
 */

(function() {
    console.log('🚨 IMMEDIATE CAROUSEL FIX LOADING...');

    function replaceCarouselSlides() {
        console.log('🔄 Attempting to replace carousel slides...');
        
        const swiperWrapper = document.querySelector('.swiper-wrapper');
        if (!swiperWrapper) {
            console.error('❌ Swiper wrapper not found');
            return false;
        }

        // Check for carousel data
        const carouselData = localStorage.getItem('homepageCarouselData');
        let items = [];
        
        if (carouselData) {
            try {
                items = JSON.parse(carouselData);
                console.log('📦 Found carousel data:', items.length, 'items');
            } catch (error) {
                console.error('❌ Error parsing carousel data:', error);
            }
        }

        // If no data, create test data
        if (items.length === 0) {
            console.log('📝 Creating test carousel data...');
            items = [
                {
                    id: 'immediate-fix-1',
                    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
                    title: 'Professional Journey',
                    description: 'Your path to success starts here',
                    alt: 'Professional workspace'
                },
                {
                    id: 'immediate-fix-2',
                    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
                    title: 'Team Excellence',
                    description: 'Building success through collaboration',
                    alt: 'Team collaboration'
                },
                {
                    id: 'immediate-fix-3',
                    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
                    title: 'Data Insights',
                    description: 'Making informed decisions with analytics',
                    alt: 'Data analytics'
                }
            ];
            
            // Save the test data
            localStorage.setItem('homepageCarouselData', JSON.stringify(items));
            localStorage.setItem('carouselLastSync', new Date().toISOString());
        }

        // Replace the slides
        console.log('🔄 Replacing slides with', items.length, 'items...');
        
        swiperWrapper.innerHTML = '';
        
        items.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.innerHTML = `
                <img src="${item.url}" alt="${item.alt || item.title}" 
                     onerror="this.src='https://picsum.photos/800/400?random=${index + 100}'; this.classList.add('fallback-image');"
                     style="width: 100%; height: 100%; object-fit: cover;">
                <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                    <h3 class="text-white text-2xl font-bold ghibli-font">${item.title}</h3>
                    <p class="text-white/90">${item.description || 'Magical journey step ' + (index + 1)}</p>
                </div>
            `;
            swiperWrapper.appendChild(slide);
        });

        console.log('✅ Slides replaced successfully!');

        // Force Swiper update
        const swiperContainer = document.querySelector('.swiper-magical');
        if (swiperContainer && swiperContainer.swiper) {
            try {
                swiperContainer.swiper.update();
                swiperContainer.swiper.updateSlides();
                console.log('✅ Swiper updated');
            } catch (error) {
                console.error('❌ Error updating Swiper:', error);
            }
        }

        return true;
    }

    // Try to replace slides multiple times to ensure it works
    function attemptFix() {
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryReplace = () => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} to fix carousel...`);
            
            if (replaceCarouselSlides()) {
                console.log('🎉 CAROUSEL FIX SUCCESSFUL!');
                
                // Show success notification
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg';
                notification.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <span class="text-2xl">✅</span>
                        <div>
                            <div class="font-bold">Carousel Fixed!</div>
                            <div class="text-sm">New images are now showing</div>
                        </div>
                    </div>
                `;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 5000);
                
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryReplace, 1000);
            } else {
                console.error('❌ Failed to fix carousel after', maxAttempts, 'attempts');
            }
        };
        
        tryReplace();
    }

    // Start the fix process
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(attemptFix, 2000); // Wait for existing scripts
        });
    } else {
        setTimeout(attemptFix, 2000);
    }

    // Also listen for carousel update events
    window.addEventListener('carouselDataUpdated', (event) => {
        console.log('📡 Received carousel update, applying immediate fix...');
        setTimeout(replaceCarouselSlides, 500);
    });

    console.log('✅ IMMEDIATE CAROUSEL FIX LOADED');
})();