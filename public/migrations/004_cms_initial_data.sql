-- Migration: 004_cms_initial_data.sql
-- Description: Initial data and setup for CMS enhancement features
-- Date: 2024-10-18
-- Dependencies: 001_cms_enhancement_setup.sql, 002_cms_indexes_and_triggers.sql, 003_cms_rls_policies.sql

-- Check if migration has already been run
DO $migration$
BEGIN
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '004_cms_initial_data') THEN
        RAISE NOTICE 'Migration 004_cms_initial_data has already been applied. Skipping.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Applying migration: 004_cms_initial_data';
END $migration$;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default template categories
INSERT INTO template_categories (name, description, sort_order) VALUES
    ('Business', 'Business and corporate case study templates', 1),
    ('Technology', 'Technology and software project templates', 2),
    ('Design', 'Design and creative project templates', 3),
    ('Marketing', 'Marketing and campaign case study templates', 4),
    ('Research', 'Research and academic project templates', 5),
    ('Portfolio', 'Personal portfolio and showcase templates', 6),
    ('Education', 'Educational and training case study templates', 7),
    ('Healthcare', 'Healthcare and medical case study templates', 8),
    ('Finance', 'Financial services and fintech templates', 9),
    ('E-commerce', 'E-commerce and retail case study templates', 10)
ON CONFLICT (name) DO NOTHING;

-- Insert default workflow definitions
INSERT INTO workflow_definitions (name, description, steps) VALUES
    ('Standard Review', 'Standard content review workflow for case studies', 
     '[
        {"step": 1, "name": "Draft Review", "assignee_role": "editor", "required": true, "description": "Initial review of draft content"},
        {"step": 2, "name": "Final Approval", "assignee_role": "admin", "required": true, "description": "Final approval before publication"}
     ]'::jsonb),
    ('Quick Publish', 'Fast-track workflow for urgent content', 
     '[
        {"step": 1, "name": "Quick Review", "assignee_role": "admin", "required": true, "description": "Expedited review and approval"}
     ]'::jsonb),
    ('Comprehensive Review', 'Detailed review workflow for complex case studies', 
     '[
        {"step": 1, "name": "Content Review", "assignee_role": "editor", "required": true, "description": "Detailed content and structure review"},
        {"step": 2, "name": "Technical Review", "assignee_role": "editor", "required": true, "description": "Technical accuracy and implementation review"},
        {"step": 3, "name": "Final Approval", "assignee_role": "admin", "required": true, "description": "Final approval and publication authorization"}
     ]'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert sample content templates
INSERT INTO content_templates (name, description, category_id, template_data, is_public) VALUES
    ('Basic Case Study', 'Simple case study template with essential sections', 
     (SELECT id FROM template_categories WHERE name = 'Business' LIMIT 1),
     '{
        "sections": {
          "hero": {
            "title": "{{project_title}}",
            "subtitle": "{{project_subtitle}}",
            "text": "Brief overview of the project and its impact.",
            "image": ""
          },
          "overview": {
            "title": "Project Overview",
            "summary": "{{project_summary}}",
            "metrics": [
              {"label": "Duration", "value": "{{project_duration}}"},
              {"label": "Team Size", "value": "{{team_size}}"},
              {"label": "Budget", "value": "{{project_budget}}"}
            ]
          },
          "problem": {
            "title": "The Challenge",
            "description": "Describe the problem or challenge that needed to be solved."
          },
          "process": {
            "title": "Our Approach",
            "description": "Explain the methodology and process used to address the challenge.",
            "steps": [
              "Research and Analysis",
              "Strategy Development", 
              "Implementation",
              "Testing and Optimization"
            ]
          },
          "showcase": {
            "title": "Results",
            "description": "Showcase the outcomes and achievements of the project.",
            "features": []
          },
          "reflection": {
            "title": "Key Learnings",
            "content": "Share insights and lessons learned from the project."
          }
        }
      }'::jsonb, 
     true),
    ('Technology Project', 'Template for software and technology case studies', 
     (SELECT id FROM template_categories WHERE name = 'Technology' LIMIT 1),
     '{
        "sections": {
          "hero": {
            "title": "{{project_title}}",
            "subtitle": "{{tech_stack}}",
            "text": "{{project_description}}",
            "image": ""
          },
          "overview": {
            "title": "Technical Overview",
            "summary": "{{technical_summary}}",
            "metrics": [
              {"label": "Technology Stack", "value": "{{tech_stack}}"},
              {"label": "Development Time", "value": "{{dev_time}}"},
              {"label": "Team Size", "value": "{{team_size}}"},
              {"label": "Performance Improvement", "value": "{{performance_gain}}"}
            ]
          },
          "problem": {
            "title": "Technical Challenge",
            "description": "Describe the technical problem or requirement that needed to be addressed."
          },
          "process": {
            "title": "Development Process",
            "description": "Outline the development methodology and technical approach.",
            "steps": [
              "Requirements Analysis",
              "System Architecture Design",
              "Development & Implementation",
              "Testing & Quality Assurance",
              "Deployment & Monitoring"
            ]
          },
          "showcase": {
            "title": "Technical Implementation",
            "description": "Showcase the technical solution and its key features.",
            "features": []
          },
          "reflection": {
            "title": "Technical Insights",
            "content": "Share technical learnings, challenges overcome, and future improvements."
          }
        }
      }'::jsonb, 
     true),
    ('Design Portfolio', 'Template for design and creative projects', 
     (SELECT id FROM template_categories WHERE name = 'Design' LIMIT 1),
     '{
        "sections": {
          "hero": {
            "title": "{{project_title}}",
            "subtitle": "{{design_category}}",
            "text": "{{project_brief}}",
            "image": ""
          },
          "overview": {
            "title": "Design Brief",
            "summary": "{{design_summary}}",
            "metrics": [
              {"label": "Project Type", "value": "{{project_type}}"},
              {"label": "Duration", "value": "{{project_duration}}"},
              {"label": "Client", "value": "{{client_name}}"},
              {"label": "Tools Used", "value": "{{design_tools}}"}
            ]
          },
          "problem": {
            "title": "Design Challenge",
            "description": "Describe the design problem or creative brief that needed to be solved."
          },
          "process": {
            "title": "Design Process",
            "description": "Walk through the creative process and design methodology.",
            "steps": [
              "Research & Discovery",
              "Concept Development",
              "Design Exploration",
              "Refinement & Testing",
              "Final Implementation"
            ]
          },
          "showcase": {
            "title": "Design Solution",
            "description": "Present the final design solution and its key elements.",
            "features": []
          },
          "reflection": {
            "title": "Design Reflection",
            "content": "Reflect on the design decisions, challenges, and creative insights gained."
          }
        }
      }'::jsonb, 
     true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- UTILITY FUNCTIONS FOR CMS
-- ============================================================================

-- Function to get template usage statistics
CREATE OR REPLACE FUNCTION get_template_usage_stats()
RETURNS TABLE (
    template_id UUID,
    template_name TEXT,
    category_name TEXT,
    usage_count INTEGER,
    last_used TIMESTAMPTZ
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.name,
        tc.name,
        ct.usage_count,
        (SELECT MAX(cs.created_at) 
         FROM case_studies cs 
         WHERE cs.metadata->>'template_id' = ct.id::text)
    FROM content_templates ct
    LEFT JOIN template_categories tc ON tc.id = ct.category_id
    ORDER BY ct.usage_count DESC, ct.created_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get content analytics summary
CREATE OR REPLACE FUNCTION get_content_analytics_summary(
    p_case_study_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    case_study_id UUID,
    case_study_title TEXT,
    total_views INTEGER,
    total_edits INTEGER,
    total_shares INTEGER,
    avg_time_spent INTERVAL,
    last_activity TIMESTAMPTZ
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.project_title,
        COALESCE(SUM(asm.views), 0)::INTEGER,
        COALESCE(SUM(asm.edits), 0)::INTEGER,
        COALESCE(SUM(asm.shares), 0)::INTEGER,
        AVG(asm.avg_time_spent),
        MAX(asm.updated_at)
    FROM case_studies cs
    LEFT JOIN analytics_summaries asm ON asm.case_study_id = cs.id
    WHERE (p_case_study_id IS NULL OR cs.id = p_case_study_id)
    AND (p_start_date IS NULL OR asm.date >= p_start_date)
    AND (p_end_date IS NULL OR asm.date <= p_end_date)
    GROUP BY cs.id, cs.project_title
    ORDER BY COALESCE(SUM(asm.views), 0) DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search content with full-text search
CREATE OR REPLACE FUNCTION search_content(
    p_query TEXT,
    p_content_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    content_id UUID,
    content_type TEXT,
    title TEXT,
    content TEXT,
    rank REAL
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        si.content_id,
        si.content_type,
        si.title,
        si.content,
        ts_rank(si.search_vector, plainto_tsquery('english', p_query)) as rank
    FROM search_index si
    WHERE si.search_vector @@ plainto_tsquery('english', p_query)
    AND (p_content_type IS NULL OR si.content_type = p_content_type)
    ORDER BY rank DESC
    LIMIT p_limit OFFSET p_offset;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS FOR CMS FUNCTIONALITY
-- ============================================================================

-- View for active workflows
CREATE OR REPLACE VIEW active_workflows AS
SELECT 
    wi.id,
    wi.case_study_id,
    cs.project_title,
    wd.name as workflow_name,
    wi.current_step,
    wi.status,
    wi.started_at,
    (wd.steps->((wi.current_step - 1)::int))->>'name' as current_step_name,
    (wd.steps->((wi.current_step - 1)::int))->>'assignee_role' as assignee_role
FROM workflow_instances wi
JOIN case_studies cs ON cs.id = wi.case_study_id
JOIN workflow_definitions wd ON wd.id = wi.workflow_definition_id
WHERE wi.status IN ('pending', 'in_progress')
ORDER BY wi.started_at DESC;

-- View for pending scheduled content
CREATE OR REPLACE VIEW pending_scheduled_content AS
SELECT 
    sc.id,
    sc.case_study_id,
    cs.project_title,
    sc.scheduled_action,
    sc.scheduled_for,
    sc.timezone,
    sc.is_recurring,
    sc.status,
    sc.created_at
FROM scheduled_content sc
JOIN case_studies cs ON cs.id = sc.case_study_id
WHERE sc.status = 'pending' 
AND sc.scheduled_for <= NOW() + INTERVAL '24 hours'
ORDER BY sc.scheduled_for ASC;

-- View for collaboration activity
CREATE OR REPLACE VIEW collaboration_activity AS
SELECT 
    cs.id as case_study_id,
    cs.project_title,
    COUNT(DISTINCT cse.user_id) as active_collaborators,
    COUNT(cc.id) as total_comments,
    COUNT(cc.id) FILTER (WHERE cc.is_resolved = false) as unresolved_comments,
    MAX(GREATEST(cse.last_activity, cc.created_at)) as last_activity
FROM case_studies cs
LEFT JOIN collaboration_sessions cse ON cse.case_study_id = cs.id AND cse.is_active = true
LEFT JOIN content_comments cc ON cc.case_study_id = cs.id
GROUP BY cs.id, cs.project_title
HAVING COUNT(DISTINCT cse.user_id) > 0 OR COUNT(cc.id) > 0
ORDER BY last_activity DESC;

-- Record that this migration has been applied
INSERT INTO schema_migrations (version, description) 
VALUES ('004_cms_initial_data', 'Initial data, functions, and views for CMS enhancement');

RAISE NOTICE 'Migration 004_cms_initial_data completed successfully!';
RAISE NOTICE 'CMS Enhancement database setup is now complete!';
RAISE NOTICE '';
RAISE NOTICE 'Available features:';
RAISE NOTICE '- Version Control: Automatic versioning of case study changes';
RAISE NOTICE '- Content Templates: Pre-built templates in 10 categories';
RAISE NOTICE '- Workflow Management: 3 default workflow definitions';
RAISE NOTICE '- Content Scheduling: Schedule publish/unpublish actions';
RAISE NOTICE '- Analytics: Track views, edits, shares, and engagement';
RAISE NOTICE '- Collaboration: Real-time sessions and inline comments';
RAISE NOTICE '- Search: Full-text search with PostgreSQL tsvector';
RAISE NOTICE '- Bulk Operations: Mass content management capabilities';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Implement API endpoints for CMS features';
RAISE NOTICE '2. Set up background job processing for scheduling';
RAISE NOTICE '3. Build frontend interfaces for CMS functionality';
RAISE NOTICE '4. Configure real-time collaboration WebSocket handlers';