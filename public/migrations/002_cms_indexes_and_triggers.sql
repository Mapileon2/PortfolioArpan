-- Migration: 002_cms_indexes_and_triggers.sql
-- Description: Add indexes, triggers, and functions for CMS enhancement
-- Date: 2024-10-18
-- Dependencies: 001_cms_enhancement_setup.sql

-- Check if migration has already been run
DO $migration$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '002_cms_indexes_and_triggers') THEN
        RAISE NOTICE 'Migration 002_cms_indexes_and_triggers has already been applied. Skipping.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Applying migration: 002_cms_indexes_and_triggers';
END $migration$;

-- ============================================================================
-- COMPREHENSIVE INDEXING STRATEGY
-- ============================================================================

-- Version Control Indexes
CREATE INDEX IF NOT EXISTS idx_case_study_versions_case_study_id ON case_study_versions(case_study_id);
CREATE INDEX IF NOT EXISTS idx_case_study_versions_version_number ON case_study_versions(case_study_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_case_study_versions_created_at ON case_study_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_study_versions_is_current ON case_study_versions(case_study_id, is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_version_comments_version_id ON version_comments(version_id);
CREATE INDEX IF NOT EXISTS idx_version_comments_user_id ON version_comments(user_id);

-- Template System Indexes
CREATE INDEX IF NOT EXISTS idx_content_templates_category_id ON content_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_content_templates_is_public ON content_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_content_templates_created_by ON content_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_content_templates_usage_count ON content_templates(usage_count DESC);

-- Workflow System Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_instances_case_study_id ON workflow_instances(case_study_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_definition_id ON workflow_instances(workflow_definition_id);

CREATE INDEX IF NOT EXISTS idx_workflow_actions_workflow_instance_id ON workflow_actions(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_user_id ON workflow_actions(user_id);

-- Scheduling System Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_content_case_study_id ON scheduled_content(case_study_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_scheduled_for ON scheduled_content(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_status ON scheduled_content(status);

-- Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_content_analytics_case_study_id ON content_analytics(case_study_id);
CREATE INDEX IF NOT EXISTS idx_content_analytics_event_type ON content_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_content_analytics_created_at ON content_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_analytics_user_id ON content_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_summaries_case_study_id ON analytics_summaries(case_study_id);
CREATE INDEX IF NOT EXISTS idx_analytics_summaries_date ON analytics_summaries(date DESC);

-- Collaboration Indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_case_study_id ON collaboration_sessions(case_study_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user_id ON collaboration_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_is_active ON collaboration_sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_content_comments_case_study_id ON content_comments(case_study_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_user_id ON content_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_parent_id ON content_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_is_resolved ON content_comments(is_resolved);

-- Search Indexes
CREATE INDEX IF NOT EXISTS idx_search_index_content_type ON search_index(content_type);
CREATE INDEX IF NOT EXISTS idx_search_index_content_id ON search_index(content_id);
CREATE INDEX IF NOT EXISTS idx_search_index_search_vector ON search_index USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_index_tags ON search_index USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_is_public ON saved_searches(is_public) WHERE is_public = true;

-- Bulk Operations Indexes
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_by ON bulk_operations(created_by);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_at ON bulk_operations(created_at DESC);

-- ============================================================================
-- ADVANCED FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically create version on case study update
CREATE OR REPLACE FUNCTION create_case_study_version()
RETURNS TRIGGER AS $
BEGIN
    -- Only create version if content actually changed
    IF OLD.sections IS DISTINCT FROM NEW.sections OR 
       OLD.project_title IS DISTINCT FROM NEW.project_title OR
       OLD.project_description IS DISTINCT FROM NEW.project_description THEN
        
        -- Mark previous version as not current
        UPDATE case_study_versions 
        SET is_current = false 
        WHERE case_study_id = NEW.id AND is_current = true;
        
        -- Create new version
        INSERT INTO case_study_versions (
            case_study_id,
            version_number,
            content,
            created_by,
            is_current
        ) VALUES (
            NEW.id,
            COALESCE((
                SELECT MAX(version_number) + 1 
                FROM case_study_versions 
                WHERE case_study_id = NEW.id
            ), 1),
            jsonb_build_object(
                'project_title', NEW.project_title,
                'project_description', NEW.project_description,
                'sections', NEW.sections,
                'metadata', NEW.metadata
            ),
            auth.uid(), -- Use current authenticated user
            true
        );
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic version creation
DROP TRIGGER IF EXISTS case_study_version_trigger ON case_studies;
CREATE TRIGGER case_study_version_trigger
    AFTER UPDATE ON case_studies
    FOR EACH ROW
    EXECUTE FUNCTION create_case_study_version();

-- Function to update search index
CREATE OR REPLACE FUNCTION update_search_index()
RETURNS TRIGGER AS $
BEGIN
    -- Delete existing search index entry
    DELETE FROM search_index 
    WHERE content_type = 'case_study' AND content_id = NEW.id;
    
    -- Insert new search index entry
    INSERT INTO search_index (
        content_type,
        content_id,
        title,
        content,
        tags,
        search_vector
    ) VALUES (
        'case_study',
        NEW.id,
        NEW.project_title,
        CONCAT(
            COALESCE(NEW.project_title, ''), ' ',
            COALESCE(NEW.project_description, ''), ' ',
            COALESCE(NEW.sections::text, '')
        ),
        ARRAY[]::text[], -- Can be extended to extract tags from content
        to_tsvector('english', CONCAT(
            COALESCE(NEW.project_title, ''), ' ',
            COALESCE(NEW.project_description, ''), ' ',
            COALESCE(NEW.sections::text, '')
        ))
    );
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for search index updates
DROP TRIGGER IF EXISTS case_study_search_index_trigger ON case_studies;
CREATE TRIGGER case_study_search_index_trigger
    AFTER INSERT OR UPDATE ON case_studies
    FOR EACH ROW
    EXECUTE FUNCTION update_search_index();

-- Function to update analytics summaries
CREATE OR REPLACE FUNCTION update_analytics_summary()
RETURNS TRIGGER AS $
BEGIN
    INSERT INTO analytics_summaries (
        case_study_id,
        date,
        views,
        unique_views,
        edits,
        shares
    ) VALUES (
        NEW.case_study_id,
        DATE(NEW.created_at),
        CASE WHEN NEW.event_type = 'view' THEN 1 ELSE 0 END,
        CASE WHEN NEW.event_type = 'view' THEN 1 ELSE 0 END, -- Simplified for now
        CASE WHEN NEW.event_type = 'edit' THEN 1 ELSE 0 END,
        CASE WHEN NEW.event_type = 'share' THEN 1 ELSE 0 END
    )
    ON CONFLICT (case_study_id, date)
    DO UPDATE SET
        views = analytics_summaries.views + CASE WHEN NEW.event_type = 'view' THEN 1 ELSE 0 END,
        unique_views = analytics_summaries.unique_views + CASE WHEN NEW.event_type = 'view' THEN 1 ELSE 0 END,
        edits = analytics_summaries.edits + CASE WHEN NEW.event_type = 'edit' THEN 1 ELSE 0 END,
        shares = analytics_summaries.shares + CASE WHEN NEW.event_type = 'share' THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for analytics summary updates
DROP TRIGGER IF EXISTS content_analytics_summary_trigger ON content_analytics;
CREATE TRIGGER content_analytics_summary_trigger
    AFTER INSERT ON content_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_summary();

-- Function to clean up old collaboration sessions
CREATE OR REPLACE FUNCTION cleanup_old_collaboration_sessions()
RETURNS void AS $
BEGIN
    UPDATE collaboration_sessions 
    SET is_active = false 
    WHERE last_activity < NOW() - INTERVAL '1 hour' AND is_active = true;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at triggers for new tables
CREATE TRIGGER update_content_templates_updated_at BEFORE UPDATE ON content_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON template_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_comments_updated_at BEFORE UPDATE ON content_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_search_index_updated_at BEFORE UPDATE ON search_index FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Record that this migration has been applied
INSERT INTO schema_migrations (version, description) 
VALUES ('002_cms_indexes_and_triggers', 'CMS enhancement indexes, triggers, and functions');

RAISE NOTICE 'Migration 002_cms_indexes_and_triggers completed successfully!';