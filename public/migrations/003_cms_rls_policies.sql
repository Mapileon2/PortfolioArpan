-- Migration: 003_cms_rls_policies.sql
-- Description: Row Level Security policies for CMS enhancement tables
-- Date: 2024-10-18
-- Dependencies: 001_cms_enhancement_setup.sql, 002_cms_indexes_and_triggers.sql

-- Check if migration has already been run
DO $migration$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '003_cms_rls_policies') THEN
        RAISE NOTICE 'Migration 003_cms_rls_policies has already been applied. Skipping.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Applying migration: 003_cms_rls_policies';
END $migration$;

-- ============================================================================
-- ROW LEVEL SECURITY FOR CMS TABLES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE case_study_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERSION CONTROL POLICIES
-- ============================================================================

-- Case Study Versions Policies
CREATE POLICY "Users can view versions of accessible case studies" ON case_study_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = case_study_versions.case_study_id 
            AND (cs.status = 'published' OR cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

CREATE POLICY "Editors can create versions" ON case_study_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('editor', 'admin', 'super_admin')
        )
    );

CREATE POLICY "System can create versions automatically" ON case_study_versions
    FOR INSERT WITH CHECK (true); -- Allow system triggers to create versions

-- Version Comments Policies
CREATE POLICY "Users can view comments on accessible versions" ON version_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_study_versions csv
            JOIN case_studies cs ON cs.id = csv.case_study_id
            WHERE csv.id = version_comments.version_id
            AND (cs.status = 'published' OR cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

CREATE POLICY "Authenticated users can add version comments" ON version_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own version comments" ON version_comments
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- TEMPLATE SYSTEM POLICIES
-- ============================================================================

-- Template Categories Policies
CREATE POLICY "Anyone can view template categories" ON template_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage template categories" ON template_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Content Templates Policies
CREATE POLICY "Anyone can view public templates" ON content_templates
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own templates" ON content_templates
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Admins can view all templates" ON content_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Editors can create templates" ON content_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('editor', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Users can update their own templates" ON content_templates
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Admins can update any template" ON content_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- WORKFLOW SYSTEM POLICIES
-- ============================================================================

-- Workflow Definitions Policies
CREATE POLICY "Authenticated users can view workflow definitions" ON workflow_definitions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage workflow definitions" ON workflow_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Workflow Instances Policies
CREATE POLICY "Users can view workflows for their content" ON workflow_instances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = workflow_instances.case_study_id 
            AND (cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

CREATE POLICY "Editors can create workflow instances" ON workflow_instances
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('editor', 'admin', 'super_admin')
        )
    );

CREATE POLICY "System can update workflow instances" ON workflow_instances
    FOR UPDATE USING (true); -- Allow system to update workflow status

-- Workflow Actions Policies
CREATE POLICY "Users can view workflow actions for accessible workflows" ON workflow_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workflow_instances wi
            JOIN case_studies cs ON cs.id = wi.case_study_id
            WHERE wi.id = workflow_actions.workflow_instance_id
            AND (cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

CREATE POLICY "Reviewers can create workflow actions" ON workflow_actions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('editor', 'admin', 'super_admin')
        )
    );

-- ============================================================================
-- SCHEDULING SYSTEM POLICIES
-- ============================================================================

CREATE POLICY "Users can view scheduled content for their case studies" ON scheduled_content
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = scheduled_content.case_study_id 
            AND (cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

CREATE POLICY "Editors can create scheduled content" ON scheduled_content
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('editor', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Users can update their own scheduled content" ON scheduled_content
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "System can update scheduled content status" ON scheduled_content
    FOR UPDATE USING (true); -- Allow system to update execution status

-- ============================================================================
-- ANALYTICS SYSTEM POLICIES
-- ============================================================================

-- Content Analytics Policies
CREATE POLICY "Anyone can insert analytics events" ON content_analytics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all analytics" ON content_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view analytics for their content" ON content_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = content_analytics.case_study_id 
            AND cs.created_by = auth.uid()
        )
    );

-- Analytics Summaries Policies
CREATE POLICY "Admins can view all analytics summaries" ON analytics_summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view analytics summaries for their content" ON analytics_summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = analytics_summaries.case_study_id 
            AND cs.created_by = auth.uid()
        )
    );

CREATE POLICY "System can manage analytics summaries" ON analytics_summaries
    FOR ALL USING (true); -- Allow system triggers to manage summaries

-- ============================================================================
-- COLLABORATION SYSTEM POLICIES
-- ============================================================================

-- Collaboration Sessions Policies
CREATE POLICY "Users can manage their own collaboration sessions" ON collaboration_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view collaboration sessions for accessible content" ON collaboration_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = collaboration_sessions.case_study_id 
            AND (cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

-- Content Comments Policies
CREATE POLICY "Users can view comments on accessible content" ON content_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = content_comments.case_study_id 
            AND (cs.status = 'published' OR cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

CREATE POLICY "Authenticated users can add comments" ON content_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments" ON content_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all comments" ON content_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- SEARCH SYSTEM POLICIES
-- ============================================================================

-- Search Index Policies
CREATE POLICY "Anyone can view search index for published content" ON search_index
    FOR SELECT USING (
        CASE 
            WHEN content_type = 'case_study' THEN
                EXISTS (
                    SELECT 1 FROM case_studies cs 
                    WHERE cs.id = search_index.content_id 
                    AND cs.status = 'published'
                )
            ELSE true
        END
    );

CREATE POLICY "Authenticated users can view all search index" ON search_index
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "System can manage search index" ON search_index
    FOR ALL USING (true); -- Allow system triggers to manage search index

-- Saved Searches Policies
CREATE POLICY "Users can manage their own saved searches" ON saved_searches
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Anyone can view public saved searches" ON saved_searches
    FOR SELECT USING (is_public = true);

-- ============================================================================
-- BULK OPERATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own bulk operations" ON bulk_operations
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Admins can view all bulk operations" ON bulk_operations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Editors can create bulk operations" ON bulk_operations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('editor', 'admin', 'super_admin')
        )
    );

CREATE POLICY "System can update bulk operations" ON bulk_operations
    FOR UPDATE USING (true); -- Allow system to update operation status

-- Record that this migration has been applied
INSERT INTO schema_migrations (version, description) 
VALUES ('003_cms_rls_policies', 'Row Level Security policies for CMS enhancement tables');

RAISE NOTICE 'Migration 003_cms_rls_policies completed successfully!';