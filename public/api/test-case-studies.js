/**
 * Test Case Studies API - Simple version for testing without authentication
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client with service key for admin access
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/test-case-studies
 * Get all case studies (no auth required for testing)
 */
router.get('/', async (req, res) => {
    try {
        const { data: caseStudies, error } = await supabase
            .from('case_studies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({
                error: 'Failed to fetch case studies',
                details: error.message
            });
        }

        res.json(caseStudies);

    } catch (error) {
        console.error('Get case studies error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * POST /api/test-case-studies
 * Create new case study (no auth required for testing)
 */
router.post('/', async (req, res) => {
    try {
        const {
            projectTitle,
            projectDescription,
            projectCategory,
            projectAchievement,
            projectRating,
            sections,
            status = 'published'
        } = req.body;

        // Create a test user ID if none exists
        const testUserId = '00000000-0000-0000-0000-000000000000';

        const caseStudyData = {
            project_title: projectTitle,
            project_description: projectDescription,
            project_category: projectCategory,
            project_achievement: projectAchievement,
            project_rating: projectRating || 5,
            sections: sections || {},
            status: status,
            featured: false,
            created_by: testUserId
        };

        console.log('Creating case study with data:', caseStudyData);

        const { data: caseStudy, error } = await supabase
            .from('case_studies')
            .insert([caseStudyData])
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({
                error: 'Failed to create case study',
                details: error.message
            });
        }

        res.status(201).json(caseStudy);

    } catch (error) {
        console.error('Create case study error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;