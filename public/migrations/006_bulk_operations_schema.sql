-- Bulk Operations System Database Schema
-- Migration 006: Create bulk operations, job queue, and progress tracking tables
-- This migration implements the complete bulk operations management system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bulk operations jobs table
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Operation details
    operation_type VARCHAR(50) NOT NULL, -- update, import, export, delete
    operation_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Target information
    target_type VARCHAR(50) NOT NULL, -- case_studies, templates, users
    target_ids UUID[] DEFAULT '{}', -- Array of target IDs
    target_filter JSONB, -- Filter criteria for dynamic targeting
    
    -- Operation configuration
    operation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    batch_size INTEGER DEFAULT 10,
    
    -- Progress tracking
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Timing information
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    
    -- Results and logging
    results JSONB DEFAULT '{}'::jsonb,
    error_log JSONB DEFAULT '[]'::jsonb,
    success_log JSONB DEFAULT '[]'::jsonb,
    
    -- File handling for import/export
    input_file_url TEXT,
    output_file_url TEXT,
    file_format VARCHAR(20), -- csv, json, xlsx, xml
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_operation_type CHECK (operation_type IN ('update', 'import', 'export', 'delete', 'duplicate', 'archive')),
    CONSTRAINT valid_target_type CHECK (target_type IN ('case_studies', 'templates', 'users', 'carousel_items')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused')),
    CONSTRAINT valid_file_format CHECK (file_format IN ('csv', 'json', 'xlsx', 'xml', 'zip')),
    CONSTRAINT valid_progress CHECK (
        processed_items >= 0 AND 
        successful_items >= 0 AND 
        failed_items >= 0 AND
        processed_items = successful_items + failed_items
    )
);

-- Create bulk operation items table for detailed tracking
CREATE TABLE IF NOT EXISTS bulk_operation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bulk_operation_id UUID NOT NULL REFERENCES bulk_operations(id) ON DELETE CASCADE,
    
    -- Item details
    item_id UUID, -- ID of the item being processed
    item_type VARCHAR(50) NOT NULL,
    item_data JSONB, -- Original item data
    
    -- Processing details
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, skipped
    processing_order INTEGER,
    
    -- Operation results
    result_data JSONB, -- Processed/updated item data
    error_message TEXT,
    warning_messages TEXT[],
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_item_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped'))
);

-- Create bulk operation templates table for reusable operations
CREATE TABLE IF NOT EXISTS bulk_operation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template details
    name VARCHAR(200) NOT NULL,
    description TEXT,
    operation_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    
    -- Template configuration
    config_template JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_batch_size INTEGER DEFAULT 10,
    
    -- Template metadata
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_template_operation_type CHECK (operation_type IN ('update', 'import', 'export', 'delete', 'duplicate', 'archive')),
    CONSTRAINT valid_template_target_type CHECK (target_type IN ('case_studies', 'templates', 'users', 'carousel_items'))
);

-- Create bulk operation schedules table for recurring operations
CREATE TABLE IF NOT EXISTS bulk_operation_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Schedule details
    name VARCHAR(200) NOT NULL,
    description TEXT,
    operation_template_id UUID REFERENCES bulk_operation_templates(id) ON DELETE CASCADE,
    
    -- Schedule configuration
    cron_expression VARCHAR(100) NOT NULL, -- Cron expression for scheduling
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    
    -- Execution tracking
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Schedule metadata
    max_runs INTEGER, -- Maximum number of runs (NULL for unlimited)
    expires_at TIMESTAMP WITH TIME ZONE, -- Schedule expiration
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_timezone CHECK (timezone ~ '^[A-Za-z_/]+$')
);

-- Create bulk operation notifications table
CREATE TABLE IF NOT EXISTS bulk_operation_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bulk_operation_id UUID NOT NULL REFERENCES bulk_operations(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL, -- started, progress, completed, failed
    title VARCHAR(200) NOT NULL,
    message TEXT,
    
    -- Notification targeting
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    notification_channels TEXT[] DEFAULT '{"email"}', -- email, sms, push, webhook
    
    -- Delivery tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Notification metadata
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    is_read BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_notification_type CHECK (notification_type IN ('started', 'progress', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_operation_type ON bulk_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_target_type ON bulk_operations(target_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_by ON bulk_operations(created_by);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_at ON bulk_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_started_at ON bulk_operations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_completed_at ON bulk_operations(completed_at DESC);

-- Bulk operation items indexes
CREATE INDEX IF NOT EXISTS idx_bulk_operation_items_bulk_operation_id ON bulk_operation_items(bulk_operation_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_items_status ON bulk_operation_items(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_items_item_id ON bulk_operation_items(item_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_items_processing_order ON bulk_operation_items(processing_order);

-- Bulk operation templates indexes
CREATE INDEX IF NOT EXISTS idx_bulk_operation_templates_operation_type ON bulk_operation_templates(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_templates_target_type ON bulk_operation_templates(target_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_templates_is_public ON bulk_operation_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_templates_created_by ON bulk_operation_templates(created_by);

-- Bulk operation schedules indexes
CREATE INDEX IF NOT EXISTS idx_bulk_operation_schedules_is_active ON bulk_operation_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_schedules_next_run_at ON bulk_operation_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_schedules_operation_template_id ON bulk_operation_schedules(operation_template_id);

-- Bulk operation notifications indexes
CREATE INDEX IF NOT EXISTS idx_bulk_operation_notifications_bulk_operation_id ON bulk_operation_notifications(bulk_operation_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_notifications_user_id ON bulk_operation_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_notifications_is_read ON bulk_operation_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_notifications_created_at ON bulk_operation_notifications(created_at DESC);

-- JSONB indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_bulk_operations_target_filter ON bulk_operations USING GIN(target_filter);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_operation_config ON bulk_operations USING GIN(operation_config);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_results ON bulk_operations USING GIN(results);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_templates_config_template ON bulk_operation_templates USING GIN(config_template);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_bulk_operations_search ON bulk_operations USING GIN(
    to_tsvector('english', operation_name || ' ' || COALESCE(description, ''))
);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_bulk_operations_updated_at 
    BEFORE UPDATE ON bulk_operations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_operation_templates_updated_at 
    BEFORE UPDATE ON bulk_operation_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_operation_schedules_updated_at 
    BEFORE UPDATE ON bulk_operation_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update bulk operation progress
CREATE OR REPLACE FUNCTION update_bulk_operation_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update progress counters when item status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        UPDATE bulk_operations 
        SET 
            processed_items = (
                SELECT COUNT(*) 
                FROM bulk_operation_items 
                WHERE bulk_operation_id = NEW.bulk_operation_id 
                AND status IN ('completed', 'failed', 'skipped')
            ),
            successful_items = (
                SELECT COUNT(*) 
                FROM bulk_operation_items 
                WHERE bulk_operation_id = NEW.bulk_operation_id 
                AND status = 'completed'
            ),
            failed_items = (
                SELECT COUNT(*) 
                FROM bulk_operation_items 
                WHERE bulk_operation_id = NEW.bulk_operation_id 
                AND status = 'failed'
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.bulk_operation_id;
        
        -- Update operation status if all items are processed
        UPDATE bulk_operations 
        SET status = CASE 
            WHEN processed_items >= total_items AND failed_items = 0 THEN 'completed'
            WHEN processed_items >= total_items AND failed_items > 0 THEN 'completed'
            ELSE status
        END,
        completed_at = CASE 
            WHEN processed_items >= total_items THEN CURRENT_TIMESTAMP
            ELSE completed_at
        END
        WHERE id = NEW.bulk_operation_id AND processed_items >= total_items;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for progress updates
CREATE TRIGGER trigger_update_bulk_operation_progress
    AFTER UPDATE ON bulk_operation_items
    FOR EACH ROW EXECUTE FUNCTION update_bulk_operation_progress();

-- Create function to update template usage count
CREATE OR REPLACE FUNCTION update_bulk_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE bulk_operation_templates 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.operation_template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for template usage updates
CREATE TRIGGER trigger_update_bulk_template_usage_count
    AFTER INSERT ON bulk_operations
    FOR EACH ROW 
    WHEN (NEW.operation_config->>'template_id' IS NOT NULL)
    EXECUTE FUNCTION update_bulk_template_usage_count();

-- Create function to calculate estimated completion time
CREATE OR REPLACE FUNCTION calculate_estimated_completion()
RETURNS TRIGGER AS $$
DECLARE
    avg_processing_time INTERVAL;
    remaining_items INTEGER;
BEGIN
    IF NEW.status = 'running' AND OLD.status != 'running' THEN
        -- Calculate average processing time from completed items
        SELECT AVG(processing_time_ms * INTERVAL '1 millisecond')
        INTO avg_processing_time
        FROM bulk_operation_items
        WHERE bulk_operation_id = NEW.id AND status = 'completed';
        
        -- Calculate remaining items
        remaining_items := NEW.total_items - NEW.processed_items;
        
        -- Update estimated completion if we have data
        IF avg_processing_time IS NOT NULL AND remaining_items > 0 THEN
            UPDATE bulk_operations
            SET estimated_completion = CURRENT_TIMESTAMP + (avg_processing_time * remaining_items)
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for estimated completion updates
CREATE TRIGGER trigger_calculate_estimated_completion
    AFTER UPDATE ON bulk_operations
    FOR EACH ROW EXECUTE FUNCTION calculate_estimated_completion();

-- Create RLS (Row Level Security) policies
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_notifications ENABLE ROW LEVEL SECURITY;

-- Bulk operations policies
CREATE POLICY "Users can view their own bulk operations" ON bulk_operations
    FOR SELECT USING (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Users can create bulk operations" ON bulk_operations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Users can update their own bulk operations" ON bulk_operations
    FOR UPDATE USING (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Admins can view all bulk operations" ON bulk_operations
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Bulk operation items policies
CREATE POLICY "Users can view items from their operations" ON bulk_operation_items
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM bulk_operations bo 
            WHERE bo.id = bulk_operation_id AND bo.created_by = auth.uid()
        )
    );

CREATE POLICY "System can manage bulk operation items" ON bulk_operation_items
    FOR ALL USING (auth.role() = 'service_role');

-- Bulk operation templates policies
CREATE POLICY "Public templates are viewable by all authenticated users" ON bulk_operation_templates
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            is_public = true OR 
            created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own operation templates" ON bulk_operation_templates
    FOR ALL USING (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Bulk operation schedules policies
CREATE POLICY "Users can manage their own schedules" ON bulk_operation_schedules
    FOR ALL USING (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Bulk operation notifications policies
CREATE POLICY "Users can view their own notifications" ON bulk_operation_notifications
    FOR SELECT USING (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "System can create notifications" ON bulk_operation_notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can update their notification read status" ON bulk_operation_notifications
    FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = auth.uid())
    WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Insert default bulk operation templates
INSERT INTO bulk_operation_templates (name, description, operation_type, target_type, config_template, is_public) VALUES
    (
        'Update Case Study Status',
        'Bulk update the status of multiple case studies',
        'update',
        'case_studies',
        '{"fields": {"status": "published"}, "validation": {"required": ["status"]}}',
        true
    ),
    (
        'Export Case Studies to CSV',
        'Export selected case studies to CSV format',
        'export',
        'case_studies',
        '{"format": "csv", "fields": ["project_title", "project_description", "status", "created_at"], "include_sections": false}',
        true
    ),
    (
        'Archive Old Case Studies',
        'Archive case studies older than specified date',
        'archive',
        'case_studies',
        '{"archive_older_than_days": 365, "update_status": "archived", "preserve_data": true}',
        true
    ),
    (
        'Duplicate Templates',
        'Create copies of selected templates',
        'duplicate',
        'templates',
        '{"name_suffix": " (Copy)", "reset_usage_stats": true, "copy_versions": false}',
        true
    ),
    (
        'Import Case Studies from JSON',
        'Import case studies from JSON file format',
        'import',
        'case_studies',
        '{"format": "json", "validation": {"required": ["project_title"]}, "default_status": "draft", "create_versions": true}',
        true
    )
ON CONFLICT (name) DO NOTHING;

-- Create helpful views for common queries
CREATE OR REPLACE VIEW bulk_operations_summary AS
SELECT 
    bo.id,
    bo.operation_name,
    bo.operation_type,
    bo.target_type,
    bo.status,
    bo.total_items,
    bo.processed_items,
    bo.successful_items,
    bo.failed_items,
    CASE 
        WHEN bo.total_items > 0 THEN ROUND((bo.processed_items::DECIMAL / bo.total_items) * 100, 2)
        ELSE 0
    END as progress_percentage,
    CASE 
        WHEN bo.total_items > 0 THEN ROUND((bo.successful_items::DECIMAL / bo.total_items) * 100, 2)
        ELSE 0
    END as success_percentage,
    bo.started_at,
    bo.completed_at,
    bo.estimated_completion,
    CASE 
        WHEN bo.completed_at IS NOT NULL AND bo.started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (bo.completed_at - bo.started_at))
        ELSE NULL
    END as duration_seconds,
    bo.created_at,
    up.full_name as creator_name,
    up.avatar_url as creator_avatar
FROM bulk_operations bo
LEFT JOIN user_profiles up ON bo.created_by = up.id;

-- Create view for active operations
CREATE OR REPLACE VIEW active_bulk_operations AS
SELECT *
FROM bulk_operations_summary
WHERE status IN ('pending', 'running', 'paused')
ORDER BY created_at DESC;

-- Create materialized view for bulk operation analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS bulk_operation_analytics AS
SELECT 
    operation_type,
    target_type,
    COUNT(*) as total_operations,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_operations,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_operations,
    AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (completed_at - started_at)) END) as avg_duration_seconds,
    AVG(total_items) as avg_items_per_operation,
    SUM(successful_items) as total_successful_items,
    SUM(failed_items) as total_failed_items,
    DATE_TRUNC('month', created_at) as operation_month
FROM bulk_operations
GROUP BY operation_type, target_type, DATE_TRUNC('month', created_at);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_bulk_operation_analytics_operation_type ON bulk_operation_analytics(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_analytics_target_type ON bulk_operation_analytics(target_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_analytics_operation_month ON bulk_operation_analytics(operation_month);

-- Create function for bulk operation cleanup (remove old completed operations)
CREATE OR REPLACE FUNCTION cleanup_old_bulk_operations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed operations older than 90 days
    DELETE FROM bulk_operations 
    WHERE status IN ('completed', 'failed') 
    AND completed_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Refresh analytics materialized view
    REFRESH MATERIALIZED VIEW bulk_operation_analytics;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE bulk_operations IS 'Bulk operations for batch processing of content';
COMMENT ON TABLE bulk_operation_items IS 'Individual items within bulk operations for detailed tracking';
COMMENT ON TABLE bulk_operation_templates IS 'Reusable templates for common bulk operations';
COMMENT ON TABLE bulk_operation_schedules IS 'Scheduled recurring bulk operations';
COMMENT ON TABLE bulk_operation_notifications IS 'Notifications for bulk operation events';

COMMENT ON COLUMN bulk_operations.target_ids IS 'Array of specific item IDs to process';
COMMENT ON COLUMN bulk_operations.target_filter IS 'JSONB filter criteria for dynamic item selection';
COMMENT ON COLUMN bulk_operations.operation_config IS 'Configuration parameters for the specific operation';
COMMENT ON COLUMN bulk_operations.results IS 'Final results and summary data from the operation';
COMMENT ON COLUMN bulk_operations.error_log IS 'Array of error messages and details';
COMMENT ON COLUMN bulk_operations.success_log IS 'Array of success messages and details';

-- Migration completion
SELECT 'Bulk Operations Schema Migration 006 completed successfully' as status;