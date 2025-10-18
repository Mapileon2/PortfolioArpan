-- CMS Enhancement Database Schema
-- This extends the existing portfolio SaaS schema with advanced CMS capabilities
-- Run this after the main supabase-schema.sql

-- Enable additional extensions for CMS features
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For advanced indexing

-- ============================================================================
-- VERSION CONTROL TABLES
-- ============================================================================

-- Case Study Versions Table
CREATE TABLE IF NOT EXISTS case_study_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL,
    change_summary TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_current BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Ensure unique version numbers per case study
    UNIQUE(case_study_id, version_number)
);

-- Version Comments Table
CREATE TABLE IF NOT EXISTS version_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    version_id UUID REFERENCES case_study_versions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONTENT TEMPLATES SYSTEM
-- ============================================================================

-- Template Categories Table
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Templates Table
CREATE TABLE IF NOT EXISTS content_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES template_categories(id) ON DELETE SET NULL,
    template_data JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- WORKFLOW MANAGEMENT SYSTEM
-- ============================================================================

-- Workflow Definitions Table
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Instances Table
CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE NOT NULL,
    workflow_definition_id UUID REFERENCES workflow_definitions(id) ON DELETE SET NULL,
    current_step INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Workflow Actions Table
CREATE TABLE IF NOT EXISTS workflow_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE NOT NULL,
    step_number INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('approve', 'reject', 'request_changes')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONTENT SCHEDULING SYSTEM
-- ============================================================================

-- Scheduled Content Table
CREATE TABLE IF NOT EXISTS scheduled_content (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE NOT NULL,
    scheduled_action VARCHAR(50) NOT NULL CHECK (scheduled_action IN ('publish', 'unpublish', 'archive')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    error_message TEXT
);

-- ============================================================================
-- ANALYTICS AND INSIGHTS SYSTEM
-- ============================================================================

-- Content Analytics Table (extends existing analytics_events)
CREATE TABLE IF NOT EXISTS content_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'edit', 'share', 'download', 'comment')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Summaries Table (for performance optimization)
CREATE TABLE IF NOT EXISTS analytics_summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    edits INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    avg_time_spent INTERVAL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique summary per case study per date
    UNIQUE(case_study_id, date)
);

-- ============================================================================
-- COLLABORATION SYSTEM
-- ============================================================================

-- Collaboration Sessions Table
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Comments Table
CREATE TABLE IF NOT EXISTS content_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    section_id VARCHAR(100), -- Which section of the case study
    position_data JSONB, -- Specific position within section
    comment_text TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    parent_comment_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SEARCH AND INDEXING SYSTEM
-- ============================================================================

-- Search Index Table (for advanced search capabilities)
CREATE TABLE IF NOT EXISTS search_index (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('case_study', 'project', 'template')),
    content_id UUID NOT NULL,
    title TEXT,
    content TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    search_vector tsvector,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Searches Table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    query_params JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BULK OPERATIONS SYSTEM
-- ============================================================================

-- Bulk Operations Table
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('update', 'delete', 'import', 'export')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    operation_data JSONB DEFAULT '{}'::jsonb,
    result_data JSONB DEFAULT '{}'::jsonb,
    error_log TEXT[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

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
            NEW.updated_at, -- Use updated_at as a proxy for who updated it
            true
        );
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger for automatic version creation
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
$ LANGUAGE plpgsql;

-- Trigger for search index updates
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
$ LANGUAGE plpgsql;

-- Trigger for analytics summary updates
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
$ LANGUAGE plpgsql;

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

-- Version Control Policies
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

-- Template Policies
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

-- Workflow Policies
CREATE POLICY "Users can view workflows for their content" ON workflow_instances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = workflow_instances.case_study_id 
            AND (cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

-- Analytics Policies
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

-- Collaboration Policies
CREATE POLICY "Users can manage their own collaboration sessions" ON collaboration_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view comments on accessible content" ON content_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_studies cs 
            WHERE cs.id = content_comments.case_study_id 
            AND (cs.status = 'published' OR cs.created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
        )
    );

-- ============================================================================
-- INITIAL DATA AND SETUP
-- ============================================================================

-- Insert default template categories
INSERT INTO template_categories (name, description, sort_order) VALUES
    ('Business', 'Business and corporate case study templates', 1),
    ('Technology', 'Technology and software project templates', 2),
    ('Design', 'Design and creative project templates', 3),
    ('Marketing', 'Marketing and campaign case study templates', 4),
    ('Research', 'Research and academic project templates', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert default workflow definition
INSERT INTO workflow_definitions (name, description, steps) VALUES
    ('Standard Review', 'Standard content review workflow', 
     '[
        {"step": 1, "name": "Draft Review", "assignee_role": "editor", "required": true},
        {"step": 2, "name": "Final Approval", "assignee_role": "admin", "required": true}
     ]'::jsonb)
ON CONFLICT DO NOTHING;

-- Create updated_at triggers for new tables
CREATE TRIGGER update_content_templates_updated_at BEFORE UPDATE ON content_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON template_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_comments_updated_at BEFORE UPDATE ON content_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_search_index_updated_at BEFORE UPDATE ON search_index FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE 'CMS Enhancement database schema has been successfully created!';
    RAISE NOTICE 'New features added:';
    RAISE NOTICE '- Version Control System for case studies';
    RAISE NOTICE '- Content Templates with categories';
    RAISE NOTICE '- Workflow Management System';
    RAISE NOTICE '- Content Scheduling System';
    RAISE NOTICE '- Advanced Analytics and Insights';
    RAISE NOTICE '- Real-time Collaboration Features';
    RAISE NOTICE '- Advanced Search and Indexing';
    RAISE NOTICE '- Bulk Operations Support';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run the API endpoint implementations';
    RAISE NOTICE '2. Set up background job processing for scheduling';
    RAISE NOTICE '3. Configure search indexing and full-text search';
    RAISE NOTICE '4. Implement real-time collaboration WebSocket handlers';
    RAISE NOTICE '5. Set up analytics data processing and aggregation';
END $;