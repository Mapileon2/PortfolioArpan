-- Migration: 001_cms_enhancement_setup.sql
-- Description: Initial setup for CMS enhancement features
-- Date: 2024-10-18
-- Dependencies: Requires main supabase-schema.sql to be run first

-- Check if migration has already been run
DO $migration$
BEGIN
    -- Create migrations tracking table if it doesn't exist
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        description TEXT
    );
    
    -- Check if this migration has already been applied
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001_cms_enhancement_setup') THEN
        RAISE NOTICE 'Migration 001_cms_enhancement_setup has already been applied. Skipping.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Applying migration: 001_cms_enhancement_setup';
END $migration$;

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

-- Content Analytics Table
CREATE TABLE IF NOT EXISTS content_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'edit', 'share', 'download', 'comment')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Summaries Table
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

-- Search Index Table
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

-- Record that this migration has been applied
INSERT INTO schema_migrations (version, description) 
VALUES ('001_cms_enhancement_setup', 'Initial CMS enhancement tables and structure');

RAISE NOTICE 'Migration 001_cms_enhancement_setup completed successfully!';