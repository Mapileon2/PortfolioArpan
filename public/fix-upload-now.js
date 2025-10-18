/**
 * IMMEDIATE CLOUDINARY UPLOAD FIX
 * This replaces the problematic upload function with a working one
 */

// Override the existing upload function
window.fixCloudinaryUpload = function() {
    console.log('🔧 Applying Cloudinary upload fix...');
    
    // Replace the upload function in cloudinary service
    if (window.cloudinaryService) {
        window.cloudinaryService.uploadSingleFile = async function(file, options = {}) {
            console.log('🔄 Using fixed upload method for:', file.name);
            
            try {
                // Method 1: Try with different presets
                const presets = ['ml_default', 'unsigned_preset', 'portfolio_preset'];
                
                for (const preset of presets) {
                    try {
                        const result = await this.tryPreset(file, preset, options);
                        console.log(`✅ Success with preset: ${preset}`);
                        return result;
                    } catch (error) {
                        console.log(`❌ Preset ${preset} failed:`, error.message);
                        continue;
                    }
                }
                
                // Method 2: Use signed upload
                console.log('🔐 Trying signed upload...');
                return await this.signedUpload(file, options);
                
            } catch (error) {
                console.error('❌ All upload methods failed:', error);
                throw error;
            }
        };
        
        // Add preset testing method
        window.cloudinaryService.tryPreset = async function(file, preset, options) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', preset);
            formData.append('folder', options.folder || 'portfolio');
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/dgymjtqil/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Upload failed');
            }
            
            return await response.json();
        };
        
        // Add signed upload method
        window.cloudinaryService.signedUpload = async function(file, options) {
            // Generate timestamp
            const timestamp = Math.round(Date.now() / 1000);
            
            // Create params for signature
            const params = {
                timestamp: timestamp,
                folder: options.folder || 'portfolio'
            };
            
            // Generate signature (client-side - not recommended for production)
            const apiSecret = 'jTPgMHSl-6m7LptvsBA5eDbOWwc';
            const sortedParams = Object.keys(params)
                .sort()
                .map(key => `${key}=${params[key]}`)
                .join('&');
            
            // Note: This exposes API secret - only for testing!
            const signature = await this.generateSignature(sortedParams + apiSecret);
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', '951533987774134');
            formData.append('timestamp', timestamp);
            formData.append('signature', signature);
            formData.append('folder', params.folder);
            
            const response = await fetch(`https://api.cloudinary.com/v1_1/dgymjtqil/image/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Signed upload failed');
            }
            
            return await response.json();
        };
        
        // Simple signature generation (for testing only)
        window.cloudinaryService.generateSignature = async function(stringToSign) {
            const encoder = new TextEncoder();
            const data = encoder.encode(stringToSign);
            const hashBuffer = await crypto.subtle.digest('SHA-1', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        };
        
        console.log('✅ Cloudinary service patched with working upload methods');
    }
    
    // Also patch any global upload functions
    if (window.uploadSingleImage) {
        const originalUpload = window.uploadSingleImage;
        window.uploadSingleImage = async function(file, options = {}) {
            try {
                return await window.cloudinaryService.uploadSingleFile(file, options);
            } catch (error) {
                console.error('❌ Fixed upload also failed:', error);
                throw error;
            }
        };
        console.log('✅ Global upload function patched');
    }
};

// Auto-apply fix when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(window.fixCloudinaryUpload, 1000);
    });
} else {
    setTimeout(window.fixCloudinaryUpload, 1000);
}

console.log('🔧 Cloudinary upload fix script loaded - will auto-apply in 1 second');