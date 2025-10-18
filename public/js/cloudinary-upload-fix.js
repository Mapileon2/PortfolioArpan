/**
 * Cloudinary Upload Fix
 * Handles the upload preset issue by using signed uploads
 */

class CloudinaryUploadFix {
    constructor() {
        this.config = {
            cloudName: 'dgymjtqil',
            apiKey: '951533987774134'
        };
        
        // Try multiple preset options
        this.presetOptions = [
            'ml_default',
            'unsigned_preset', 
            'portfolio_preset',
            'default'
        ];
    }

    async uploadImage(file, options = {}) {
        console.log('🔄 Attempting image upload with fallback presets...');
        
        // Try unsigned upload with different presets
        for (const preset of this.presetOptions) {
            try {
                const result = await this.tryUnsignedUpload(file, preset, options);
                if (result.success) {
                    console.log(`✅ Upload successful with preset: ${preset}`);
                    return result;
                }
            } catch (error) {
                console.log(`❌ Preset ${preset} failed:`, error.message);
                continue;
            }
        }

        // If all unsigned uploads fail, try signed upload
        console.log('🔐 Trying signed upload as fallback...');
        return await this.trySignedUpload(file, options);
    }

    async tryUnsignedUpload(file, preset, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);
        
        if (options.folder) {
            formData.append('folder', options.folder);
        }
        
        if (options.tags) {
            formData.append('tags', options.tags);
        }

        const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        const result = await response.json();
        return {
            success: true,
            data: result,
            method: 'unsigned',
            preset: preset
        };
    }

    async trySignedUpload(file, options = {}) {
        try {
            // Get signature from server
            const timestamp = Math.round(Date.now() / 1000);
            const signatureParams = {
                timestamp: timestamp,
                folder: options.folder || 'portfolio'
            };

            if (options.tags) {
                signatureParams.tags = options.tags;
            }

            const signatureResponse = await fetch('/api/cloudinary/signature', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signatureParams)
            });

            if (!signatureResponse.ok) {
                throw new Error('Failed to get signature from server');
            }

            const signatureData = await signatureResponse.json();

            // Upload with signature
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', signatureData.api_key);
            formData.append('timestamp', signatureData.timestamp);
            formData.append('signature', signatureData.signature);
            formData.append('folder', options.folder || 'portfolio');
            
            if (options.tags) {
                formData.append('tags', options.tags);
            }

            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Signed upload failed');
            }

            const result = await response.json();
            return {
                success: true,
                data: result,
                method: 'signed'
            };

        } catch (error) {
            console.error('❌ Signed upload failed:', error);
            throw new Error(`Signed upload failed: ${error.message}`);
        }
    }

    // Helper method to create unsigned preset via API (requires admin API key)
    async createUnsignedPreset(presetName = 'ml_default') {
        console.log(`🔧 Attempting to create unsigned preset: ${presetName}`);
        
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/upload_presets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(this.config.apiKey + ':' + 'jTPgMHSl-6m7LptvsBA5eDbOWwc')}`
                },
                body: JSON.stringify({
                    name: presetName,
                    unsigned: true,
                    folder: 'portfolio',
                    use_filename: true,
                    unique_filename: true,
                    overwrite: false,
                    tags: 'auto-upload'
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Created unsigned preset: ${presetName}`);
                return result;
            } else {
                const error = await response.json();
                console.log(`❌ Failed to create preset: ${error.error?.message}`);
                return null;
            }
        } catch (error) {
            console.log(`❌ Error creating preset: ${error.message}`);
            return null;
        }
    }
}

// Export for use in other files
window.CloudinaryUploadFix = CloudinaryUploadFix;

// Auto-initialize
window.cloudinaryUploadFix = new CloudinaryUploadFix();

console.log('🔧 Cloudinary Upload Fix loaded and ready!');