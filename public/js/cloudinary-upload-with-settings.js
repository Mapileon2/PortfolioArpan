/**
 * Cloudinary Upload with Custom Settings
 * Uses the specific settings you provided
 */

class CloudinaryUploadWithSettings {
    constructor() {
        this.config = {
            cloudName: 'dgymjtqil',
            apiKey: '951533987774134',
            apiSecret: 'jTPgMHSl-6m7LptvsBA5eDbOWwc'
        };
        
        // Your specified settings
        this.uploadSettings = {
            overwrite: false,
            use_filename: false,
            unique_filename: false,
            use_filename_as_display_name: true,
            use_asset_folder_as_public_id_prefix: false,
            type: 'upload',
            asset_folder: 'portfolio'
        };
    }

    async uploadImage(file, options = {}) {
        console.log('🔄 Uploading with your custom settings...');
        
        try {
            // Try unsigned upload first with your settings
            const result = await this.uploadUnsigned(file, options);
            console.log('✅ Upload successful!');
            return result;
        } catch (error) {
            console.log('❌ Unsigned upload failed, trying signed upload...');
            // Fallback to signed upload
            return await this.uploadSigned(file, options);
        }
    }

    async uploadUnsigned(file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default');
        
        // Apply your custom settings
        formData.append('overwrite', this.uploadSettings.overwrite);
        formData.append('use_filename', this.uploadSettings.use_filename);
        formData.append('unique_filename', this.uploadSettings.unique_filename);
        formData.append('use_filename_as_display_name', this.uploadSettings.use_filename_as_display_name);
        formData.append('use_asset_folder_as_public_id_prefix', this.uploadSettings.use_asset_folder_as_public_id_prefix);
        formData.append('type', this.uploadSettings.type);
        formData.append('asset_folder', this.uploadSettings.asset_folder);
        
        // Additional options
        if (options.folder) {
            formData.append('folder', options.folder);
        } else {
            formData.append('folder', 'portfolio');
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

        return await response.json();
    }

    async uploadSigned(file, options = {}) {
        const timestamp = Math.round(Date.now() / 1000);
        
        // Create parameters for signature
        const params = {
            timestamp: timestamp,
            overwrite: this.uploadSettings.overwrite,
            use_filename: this.uploadSettings.use_filename,
            unique_filename: this.uploadSettings.unique_filename,
            use_filename_as_display_name: this.uploadSettings.use_filename_as_display_name,
            use_asset_folder_as_public_id_prefix: this.uploadSettings.use_asset_folder_as_public_id_prefix,
            type: this.uploadSettings.type,
            asset_folder: this.uploadSettings.asset_folder,
            folder: options.folder || 'portfolio'
        };
        
        if (options.tags) {
            params.tags = options.tags;
        }

        // Generate signature
        const signature = await this.generateSignature(params);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', this.config.apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        
        // Add all parameters
        Object.keys(params).forEach(key => {
            if (key !== 'timestamp') {
                formData.append(key, params[key]);
            }
        });

        const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Signed upload failed');
        }

        return await response.json();
    }

    async generateSignature(params) {
        // Sort parameters and create string for signing
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const stringToSign = sortedParams + this.config.apiSecret;
        
        // Generate SHA-1 hash
        const encoder = new TextEncoder();
        const data = encoder.encode(stringToSign);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Method to create the unsigned preset with your settings
    async createCustomPreset(presetName = 'ml_default') {
        console.log(`🔧 Creating preset with your custom settings: ${presetName}`);
        
        const presetConfig = {
            name: presetName,
            unsigned: true,
            ...this.uploadSettings,
            // Additional settings for the preset
            tags: 'auto-upload',
            context: 'source=case_study_editor',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            max_file_size: 10485760, // 10MB
            quality: 'auto:good',
            fetch_format: 'auto'
        };

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${this.config.cloudName}/upload_presets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(this.config.apiKey + ':' + this.config.apiSecret)}`
                },
                body: JSON.stringify(presetConfig)
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Created preset with your settings: ${presetName}`);
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

// Export for global use
window.CloudinaryUploadWithSettings = CloudinaryUploadWithSettings;
window.cloudinaryUploadWithSettings = new CloudinaryUploadWithSettings();

// Override existing upload functions
window.addEventListener('load', () => {
    setTimeout(() => {
        // Replace the upload function in existing services
        if (window.cloudinaryService && window.cloudinaryService.uploadSingleFile) {
            const originalUpload = window.cloudinaryService.uploadSingleFile;
            window.cloudinaryService.uploadSingleFile = async function(file, options = {}) {
                console.log('🔄 Using custom settings upload...');
                return await window.cloudinaryUploadWithSettings.uploadImage(file, options);
            };
            console.log('✅ Cloudinary service updated with your custom settings');
        }

        // Replace global upload functions
        if (window.uploadSingleImage) {
            window.uploadSingleImage = async function(file, options = {}) {
                return await window.cloudinaryUploadWithSettings.uploadImage(file, options);
            };
            console.log('✅ Global upload function updated with your custom settings');
        }
    }, 1000);
});

console.log('🔧 Cloudinary Upload with Custom Settings loaded!');
console.log('📋 Settings:', {
    overwrite: false,
    use_filename: false,
    unique_filename: false,
    use_filename_as_display_name: true,
    use_asset_folder_as_public_id_prefix: false,
    type: 'upload',
    asset_folder: 'portfolio'
});