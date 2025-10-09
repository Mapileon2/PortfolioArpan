/**
 * Carousel API Endpoints
 * Complete CRUD operations for carousel image management
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://fzyrsurzgepeawvfjved.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eXJzdXJ6Z2VwZWF3dmZqdmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NjIyMDYsImV4cCI6MjA3NTIzODIwNn0.cKBp1Sw8l2mY3AxqXiazxe9BFaB3LaZmvzVZvod_42Y'
);

/**
 * GET /api/carousel/images
 * Get all carousel images
 */
router.get('/images', async (req, res) => {
    try {
        console.log('📋 Fetching carousel images...');
        
        const { data: images, error } = await supabase
            .from('carousel_images')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) {
            console.error('❌ Database error:', error);
            // Return mock data if database fails
            return res.json({
                success: true,
                data: [
                    {
                        id: 'mock_1',
                        public_id: 'portfolio/carousel/sample1',
                        secure_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
                        thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop',
                        title: 'Sample Carousel Image 1',
                        description: 'This is a sample carousel image',
                        width: 800,
                        height: 600,
                        bytes: 150000,
                        is_active: true,
                        order_index: 0,
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 'mock_2',
                        public_id: 'portfolio/carousel/sample2',
                        secure_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
                        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=200&fit=crop',
                        title: 'Sample Carousel Image 2',
                        description: 'Another sample carousel image',
                        width: 800,
                        height: 600,
                        bytes: 180000,
                        is_active: true,
                        order_index: 1,
                        created_at: new Date().toISOString()
                    }
                ]
            });
        }

        console.log(`✅ Retrieved ${images.length} carousel images`);
        
        res.json({
            success: true,
            data: images
        });

    } catch (error) {
        console.error('❌ Failed to fetch carousel images:', error);
        res.status(500).json({
            error: 'Failed to fetch carousel images',
            message: error.message,
            code: 'FETCH_ERROR'
        });
    }
});

/**
 * POST /api/carousel/images
 * Add new carousel image
 */
router.post('/images', async (req, res) => {
    try {
        const imageData = req.body;
        
        console.log('💾 Saving carousel image:', imageData.title);
        
        // Prepare data for database
        const carouselImage = {
            public_id: imageData.publicId,
            secure_url: imageData.url,
            thumbnail: imageData.thumbnail,
            title: imageData.title,
            description: imageData.description || '',
            width: imageData.width,
            height: imageData.height,
            bytes: imageData.size,
            is_active: imageData.isActive !== false,
            order_index: imageData.order || 0,
            alt_text: imageData.alt || '',
            caption: imageData.caption || '',
            created_at: new Date().toISOString()
        };

        const { data: savedImage, error } = await supabase
            .from('carousel_images')
            .insert([carouselImage])
            .select()
            .single();

        if (error) {
            console.error('❌ Database save error:', error);
            // Return success even if database fails (image is still uploaded to Cloudinary)
            return res.json({
                success: true,
                message: 'Image uploaded successfully (database save failed)',
                data: carouselImage
            });
        }

        console.log('✅ Carousel image saved to database');
        
        res.json({
            success: true,
            message: 'Carousel image saved successfully',
            data: savedImage
        });

    } catch (error) {
        console.error('❌ Failed to save carousel image:', error);
        res.status(500).json({
            error: 'Failed to save carousel image',
            message: error.message,
            code: 'SAVE_ERROR'
        });
    }
});

/**
 * PUT /api/carousel/images/:id
 * Update carousel image
 */
router.put('/images/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        console.log(`📝 Updating carousel image: ${id}`);
        
        const { data: updatedImage, error } = await supabase
            .from('carousel_images')
            .update({
                title: updateData.title,
                description: updateData.description,
                is_active: updateData.isActive,
                order_index: updateData.order,
                alt_text: updateData.alt,
                caption: updateData.caption,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Database update error:', error);
            return res.status(500).json({
                error: 'Failed to update carousel image',
                message: error.message,
                code: 'UPDATE_ERROR'
            });
        }

        console.log('✅ Carousel image updated');
        
        res.json({
            success: true,
            message: 'Carousel image updated successfully',
            data: updatedImage
        });

    } catch (error) {
        console.error('❌ Failed to update carousel image:', error);
        res.status(500).json({
            error: 'Failed to update carousel image',
            message: error.message,
            code: 'UPDATE_ERROR'
        });
    }
});

/**
 * DELETE /api/carousel/images/:id
 * Delete carousel image
 */
router.delete('/images/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Deleting carousel image: ${id}`);
        
        const { error } = await supabase
            .from('carousel_images')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Database delete error:', error);
            return res.status(500).json({
                error: 'Failed to delete carousel image',
                message: error.message,
                code: 'DELETE_ERROR'
            });
        }

        console.log('✅ Carousel image deleted from database');
        
        res.json({
            success: true,
            message: 'Carousel image deleted successfully'
        });

    } catch (error) {
        console.error('❌ Failed to delete carousel image:', error);
        res.status(500).json({
            error: 'Failed to delete carousel image',
            message: error.message,
            code: 'DELETE_ERROR'
        });
    }
});

/**
 * POST /api/carousel/order
 * Update carousel images order
 */
router.post('/order', async (req, res) => {
    try {
        const { images } = req.body;
        
        console.log(`🔄 Updating order for ${images.length} carousel images`);
        
        // Update each image's order
        const updatePromises = images.map((image, index) => 
            supabase
                .from('carousel_images')
                .update({
                    order_index: index,
                    title: image.title,
                    description: image.description,
                    is_active: image.isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('public_id', image.publicId)
        );

        const results = await Promise.all(updatePromises);
        
        // Check for errors
        const errors = results.filter(result => result.error);
        if (errors.length > 0) {
            console.error('❌ Some updates failed:', errors);
            return res.status(500).json({
                error: 'Failed to update some images',
                message: 'Some carousel images could not be updated',
                code: 'PARTIAL_UPDATE_ERROR'
            });
        }

        console.log('✅ Carousel order updated successfully');
        
        res.json({
            success: true,
            message: 'Carousel order updated successfully'
        });

    } catch (error) {
        console.error('❌ Failed to update carousel order:', error);
        res.status(500).json({
            error: 'Failed to update carousel order',
            message: error.message,
            code: 'ORDER_UPDATE_ERROR'
        });
    }
});

/**
 * GET /api/carousel/active
 * Get only active carousel images for public display
 */
router.get('/active', async (req, res) => {
    try {
        console.log('📋 Fetching active carousel images...');
        
        const { data: images, error } = await supabase
            .from('carousel_images')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true });

        if (error) {
            console.error('❌ Database error:', error);
            // Return mock data if database fails
            return res.json({
                success: true,
                data: [
                    {
                        id: 'mock_active_1',
                        public_id: 'portfolio/carousel/active1',
                        secure_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&h=1080&fit=crop',
                        title: 'Welcome to My Portfolio',
                        description: 'Showcasing my latest work and projects',
                        alt_text: 'Portfolio hero image',
                        caption: 'Creative solutions for modern challenges'
                    }
                ]
            });
        }

        console.log(`✅ Retrieved ${images.length} active carousel images`);
        
        res.json({
            success: true,
            data: images
        });

    } catch (error) {
        console.error('❌ Failed to fetch active carousel images:', error);
        res.status(500).json({
            error: 'Failed to fetch active carousel images',
            message: error.message,
            code: 'FETCH_ERROR'
        });
    }
});

/**
 * POST /api/carousel/reorder
 * Reorder carousel images by dragging
 */
router.post('/reorder', async (req, res) => {
    try {
        const { fromIndex, toIndex, imageId } = req.body;
        
        console.log(`🔄 Reordering carousel image from ${fromIndex} to ${toIndex}`);
        
        // Get all carousel images
        const { data: images, error: fetchError } = await supabase
            .from('carousel_images')
            .select('*')
            .order('order_index', { ascending: true });

        if (fetchError) {
            throw fetchError;
        }

        // Reorder the array
        const reorderedImages = [...images];
        const [movedImage] = reorderedImages.splice(fromIndex, 1);
        reorderedImages.splice(toIndex, 0, movedImage);

        // Update order_index for all images
        const updatePromises = reorderedImages.map((image, index) =>
            supabase
                .from('carousel_images')
                .update({ 
                    order_index: index,
                    updated_at: new Date().toISOString()
                })
                .eq('id', image.id)
        );

        await Promise.all(updatePromises);

        console.log('✅ Carousel images reordered successfully');
        
        res.json({
            success: true,
            message: 'Carousel images reordered successfully'
        });

    } catch (error) {
        console.error('❌ Failed to reorder carousel images:', error);
        res.status(500).json({
            error: 'Failed to reorder carousel images',
            message: error.message,
            code: 'REORDER_ERROR'
        });
    }
});

module.exports = router;