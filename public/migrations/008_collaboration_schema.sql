-- Content Collaboration System Database Schema
-- Migration 008: Create comprehensive collaboration and real-time editing tables
-- This migration implements the complete collaboration system for CMS Enhancement

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create collaboration sessions table for active editing sessions
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session identification
    session_id VARCHAR(100) NOT NULL UNIQUE,
    session_name VARCHAR(200),
    session_type VARCHAR(50) DEFAULT 'editing', -- editing, reviewing, commenting
    
    -- Content reference
    content_type VARCHAR(50) NOT NULL, -- case_study, template, page
    content_id UUID NOT NULL,
    content_title VARCHAR(500),
    
    -- Session owner and participants
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    participants UUID[] DEFAULT '{}', -- Array of user IDs
    max_participants INTEGER DEFAULT 10,
    
    -- Session status and metadata
    status VARCHAR(20) DEFAULT 'active', -- active, paused, ended, archived
    is_public BOOLEAN DEFAULT false,
    allow_anonymous BOOLEAN DEFAULT false,
    
    -- Collaboration settings
    permissions JSONB DEFAULT '{
        "can_edit": true,
        "can_comment": true,
        "can_suggest": true,
        "can_approve": false
    }'::jsonb,
    
    -- Session timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Real-time collaboration data
    current_editors UUID[] DEFAULT '{}', -- Currently active editors
    cursor_positions JSONB DEFAULT '{}'::jsonb, -- User cursor positions
    selection_ranges JSONB DEFAULT '{}'::jsonb, -- User text selections
    
    -- Version control integration
    base_version INTEGER DEFAULT 1,
    current_version INTEGER DEFAULT 1,
    
    -- Session metadata
    session_data JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_session_type CHECK (session_type IN ('editing', 'reviewing', 'commenting', 'presentation')),
    CONSTRAINT valid_session_status CHECK (status IN ('active', 'paused', 'ended', 'archived')),
    CONSTRAINT valid_content_type CHECK (content_type IN ('case_study', 'template', 'page', 'component'))
);-- Cre
ate content comments table for inline commenting and discussions
CREATE TABLE IF NOT EXISTS content_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Comment identification
    comment_id VARCHAR(100) NOT NULL UNIQUE,
    parent_comment_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
    thread_id UUID, -- Root comment ID for threading
    
    -- Content reference
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    content_version INTEGER DEFAULT 1,
    
    -- Comment positioning and context
    anchor_type VARCHAR(20) DEFAULT 'text', -- text, element, range, general
    anchor_data JSONB DEFAULT '{}'::jsonb, -- Position, element ID, text range, etc.
    context_before TEXT, -- Text before the comment anchor
    context_after TEXT, -- Text after the comment anchor
    
    -- Comment content
    comment_text TEXT NOT NULL,
    comment_html TEXT, -- Rich text HTML version
    comment_type VARCHAR(20) DEFAULT 'comment', -- comment, suggestion, question, approval
    
    -- Comment metadata
    is_resolved BOOLEAN DEFAULT false,
    is_suggestion BOOLEAN DEFAULT false,
    suggestion_data JSONB, -- Original text, suggested text, etc.
    
    -- Author and collaboration
    author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES collaboration_sessions(id) ON DELETE SET NULL,
    
    -- Visibility and permissions
    visibility VARCHAR(20) DEFAULT 'public', -- public, private, team, reviewers
    mentioned_users UUID[] DEFAULT '{}',
    
    -- Reactions and engagement
    reactions JSONB DEFAULT '{}'::jsonb, -- {like: [user_ids], dislike: [user_ids]}
    reply_count INTEGER DEFAULT 0,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, archived, deleted
    resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_anchor_type CHECK (anchor_type IN ('text', 'element', 'range', 'general', 'line')),
    CONSTRAINT valid_comment_type CHECK (comment_type IN ('comment', 'suggestion', 'question', 'approval', 'note')),
    CONSTRAINT valid_comment_visibility CHECK (visibility IN ('public', 'private', 'team', 'reviewers', 'collaborators')),
    CONSTRAINT valid_comment_status CHECK (status IN ('active', 'resolved', 'archived', 'deleted'))
);

-- Create collaboration events table for tracking all collaboration activities
CREATE TABLE IF NOT EXISTS collaboration_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_type VARCHAR(50) NOT NULL, -- join, leave, edit, comment, cursor_move, etc.
    event_action VARCHAR(50) NOT NULL, -- create, update, delete, move, etc.
    
    -- Session and user context
    session_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Content reference
    content_type VARCHAR(50),
    content_id UUID,
    
    -- Event data
    event_data JSONB DEFAULT '{}'::jsonb, -- Event-specific data
    before_state JSONB, -- State before the event
    after_state JSONB, -- State after the event
    
    -- Change tracking
    change_type VARCHAR(20), -- insert, delete, replace, format, move
    change_position INTEGER, -- Character position in content
    change_length INTEGER, -- Length of change
    change_content TEXT, -- The actual change content
    
    -- Conflict resolution
    conflicts_with UUID[], -- Array of conflicting event IDs
    resolution_strategy VARCHAR(20), -- merge, overwrite, manual, ignore
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'session_join', 'session_leave', 'content_edit', 'comment_add', 
        'cursor_move', 'selection_change', 'format_change', 'conflict_detected'
    )),
    CONSTRAINT valid_change_type CHECK (change_type IN ('insert', 'delete', 'replace', 'format', 'move')),
    CONSTRAINT valid_resolution_strategy CHECK (resolution_strategy IN ('merge', 'overwrite', 'manual', 'ignore'))
);-- Cre
ate real-time presence table for tracking active users
CREATE TABLE IF NOT EXISTS collaboration_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and session identification
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    
    -- Presence status
    status VARCHAR(20) DEFAULT 'active', -- active, idle, away, offline
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- User activity data
    cursor_position JSONB, -- Current cursor position
    selection_range JSONB, -- Current text selection
    viewport_position JSONB, -- Current scroll position
    
    -- User context
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),
    
    -- Activity tracking
    actions_count INTEGER DEFAULT 0,
    keystrokes_count INTEGER DEFAULT 0,
    last_action_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_presence_status CHECK (status IN ('active', 'idle', 'away', 'offline')),
    UNIQUE(user_id, session_id)
);

-- Create collaboration permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS collaboration_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Permission context
    session_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'collaborator',
    
    -- Permission settings
    can_edit BOOLEAN DEFAULT true,
    can_comment BOOLEAN DEFAULT true,
    can_suggest BOOLEAN DEFAULT true,
    can_approve BOOLEAN DEFAULT false,
    can_resolve_comments BOOLEAN DEFAULT false,
    can_manage_session BOOLEAN DEFAULT false,
    can_invite_users BOOLEAN DEFAULT false,
    
    -- Content-specific permissions
    editable_sections TEXT[] DEFAULT '{}', -- Array of section IDs that user can edit
    restricted_sections TEXT[] DEFAULT '{}', -- Array of section IDs that user cannot edit
    
    -- Time-based permissions
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Permission metadata
    granted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    permission_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_collaboration_role CHECK (role IN ('owner', 'editor', 'reviewer', 'commenter', 'viewer')),
    UNIQUE(session_id, user_id)
);

-- Create conflict resolution table for handling simultaneous edits
CREATE TABLE IF NOT EXISTS collaboration_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Conflict identification
    conflict_id VARCHAR(100) NOT NULL UNIQUE,
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    
    -- Conflicting events
    event_1_id UUID NOT NULL REFERENCES collaboration_events(id) ON DELETE CASCADE,
    event_2_id UUID NOT NULL REFERENCES collaboration_events(id) ON DELETE CASCADE,
    
    -- Conflict details
    conflict_type VARCHAR(20) NOT NULL, -- edit_overlap, simultaneous_edit, version_mismatch
    conflict_severity VARCHAR(10) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Content context
    content_position INTEGER,
    content_length INTEGER,
    conflicting_content_1 TEXT,
    conflicting_content_2 TEXT,
    
    -- Resolution
    resolution_status VARCHAR(20) DEFAULT 'pending', -- pending, resolved, ignored, escalated
    resolution_strategy VARCHAR(20), -- auto_merge, manual_merge, user_choice, latest_wins
    resolved_content TEXT,
    resolved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Auto-resolution attempts
    auto_resolution_attempted BOOLEAN DEFAULT false,
    auto_resolution_successful BOOLEAN DEFAULT false,
    auto_resolution_method VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_conflict_type CHECK (conflict_type IN ('edit_overlap', 'simultaneous_edit', 'version_mismatch', 'permission_conflict')),
    CONSTRAINT valid_conflict_severity CHECK (conflict_severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_resolution_status CHECK (resolution_status IN ('pending', 'resolved', 'ignored', 'escalated')),
    CONSTRAINT valid_resolution_strategy CHECK (resolution_strategy IN ('auto_merge', 'manual_merge', 'user_choice', 'latest_wins', 'oldest_wins'))
);--
 Create indexes for optimal collaboration performance

-- Collaboration sessions indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_owner_id ON collaboration_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_content ON collaboration_sessions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_status ON collaboration_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions(status, last_activity_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_participants ON collaboration_sessions USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_current_editors ON collaboration_sessions USING GIN(current_editors);

-- Content comments indexes
CREATE INDEX IF NOT EXISTS idx_content_comments_content ON content_comments(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_author_id ON content_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_session_id ON content_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_parent ON content_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_thread ON content_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_status ON content_comments(status);
CREATE INDEX IF NOT EXISTS idx_content_comments_created_at ON content_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_comments_resolved ON content_comments(is_resolved, resolved_at);
CREATE INDEX IF NOT EXISTS idx_content_comments_mentions ON content_comments USING GIN(mentioned_users);

-- Collaboration events indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_events_session_id ON collaboration_events(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_user_id ON collaboration_events(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_type ON collaboration_events(event_type);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_content ON collaboration_events(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_created_at ON collaboration_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_conflicts ON collaboration_events USING GIN(conflicts_with);

-- Collaboration presence indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_user_session ON collaboration_presence(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_session_id ON collaboration_presence(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_status ON collaboration_presence(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_last_seen ON collaboration_presence(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_presence_active ON collaboration_presence(status, last_seen_at) WHERE status IN ('active', 'idle');

-- Collaboration permissions indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_permissions_session_id ON collaboration_permissions(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_permissions_user_id ON collaboration_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_permissions_role ON collaboration_permissions(role);
CREATE INDEX IF NOT EXISTS idx_collaboration_permissions_granted_by ON collaboration_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_collaboration_permissions_valid ON collaboration_permissions(valid_from, valid_until);

-- Collaboration conflicts indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_session_id ON collaboration_conflicts(session_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_events ON collaboration_conflicts(event_1_id, event_2_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_status ON collaboration_conflicts(resolution_status);
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_severity ON collaboration_conflicts(conflict_severity);
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_resolved_by ON collaboration_conflicts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_collaboration_conflicts_created_at ON collaboration_conflicts(created_at DESC);

-- JSONB indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_permissions ON collaboration_sessions USING GIN(permissions);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_cursor_positions ON collaboration_sessions USING GIN(cursor_positions);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_session_data ON collaboration_sessions USING GIN(session_data);
CREATE INDEX IF NOT EXISTS idx_content_comments_anchor_data ON content_comments USING GIN(anchor_data);
CREATE INDEX IF NOT EXISTS idx_content_comments_reactions ON content_comments USING GIN(reactions);
CREATE INDEX IF NOT EXISTS idx_collaboration_events_event_data ON collaboration_events USING GIN(event_data);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_collaboration_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_collaboration_sessions_updated_at 
    BEFORE UPDATE ON collaboration_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_collaboration_updated_at_column();

CREATE TRIGGER update_content_comments_updated_at 
    BEFORE UPDATE ON content_comments 
    FOR EACH ROW EXECUTE FUNCTION update_collaboration_updated_at_column();

CREATE TRIGGER update_collaboration_presence_updated_at 
    BEFORE UPDATE ON collaboration_presence 
    FOR EACH ROW EXECUTE FUNCTION update_collaboration_updated_at_column();

CREATE TRIGGER update_collaboration_permissions_updated_at 
    BEFORE UPDATE ON collaboration_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_collaboration_updated_at_column();

CREATE TRIGGER update_collaboration_conflicts_updated_at 
    BEFORE UPDATE ON collaboration_conflicts 
    FOR EACH ROW EXECUTE FUNCTION update_collaboration_updated_at_column();-- Create fu
nctions for collaboration management

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last activity time for the session
    UPDATE collaboration_sessions 
    SET last_activity_at = CURRENT_TIMESTAMP
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session activity updates
CREATE TRIGGER trigger_update_session_activity
    AFTER INSERT ON collaboration_events
    FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- Function to manage comment threading
CREATE OR REPLACE FUNCTION manage_comment_threading()
RETURNS TRIGGER AS $$
BEGIN
    -- Set thread_id to the root comment ID
    IF NEW.parent_comment_id IS NOT NULL THEN
        -- Get the thread_id from parent comment
        SELECT COALESCE(thread_id, id) INTO NEW.thread_id
        FROM content_comments 
        WHERE id = NEW.parent_comment_id;
        
        -- Update reply count for parent comment
        UPDATE content_comments 
        SET reply_count = reply_count + 1
        WHERE id = NEW.parent_comment_id;
    ELSE
        -- This is a root comment, set thread_id to its own id
        NEW.thread_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment threading
CREATE TRIGGER trigger_manage_comment_threading
    BEFORE INSERT ON content_comments
    FOR EACH ROW EXECUTE FUNCTION manage_comment_threading();

-- Function to clean up inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Mark sessions as ended if no activity for more than 24 hours
    UPDATE collaboration_sessions 
    SET 
        status = 'ended',
        ended_at = CURRENT_TIMESTAMP
    WHERE 
        status = 'active' 
        AND last_activity_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Clean up old presence records
    DELETE FROM collaboration_presence 
    WHERE last_seen_at < CURRENT_TIMESTAMP - INTERVAL '48 hours';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to detect and create conflict records
CREATE OR REPLACE FUNCTION detect_edit_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflicting_event_id UUID;
    conflict_exists BOOLEAN := false;
BEGIN
    -- Only check for conflicts on content edit events
    IF NEW.event_type = 'content_edit' THEN
        -- Look for overlapping edits in the same session within the last 5 seconds
        SELECT id INTO conflicting_event_id
        FROM collaboration_events
        WHERE 
            session_id = NEW.session_id
            AND event_type = 'content_edit'
            AND user_id != NEW.user_id
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '5 seconds'
            AND ABS(change_position - NEW.change_position) < GREATEST(change_length, NEW.change_length)
            AND id != NEW.id
        LIMIT 1;
        
        -- If conflicting event found, create conflict record
        IF conflicting_event_id IS NOT NULL THEN
            INSERT INTO collaboration_conflicts (
                session_id,
                event_1_id,
                event_2_id,
                conflict_type,
                conflict_severity,
                content_position,
                content_length,
                conflicting_content_1,
                conflicting_content_2
            ) VALUES (
                NEW.session_id,
                conflicting_event_id,
                NEW.id,
                'edit_overlap',
                'medium',
                NEW.change_position,
                NEW.change_length,
                (SELECT change_content FROM collaboration_events WHERE id = conflicting_event_id),
                NEW.change_content
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conflict detection
CREATE TRIGGER trigger_detect_edit_conflicts
    AFTER INSERT ON collaboration_events
    FOR EACH ROW EXECUTE FUNCTION detect_edit_conflicts();

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
    p_user_id UUID,
    p_session_id UUID,
    p_status VARCHAR(20) DEFAULT 'active',
    p_cursor_position JSONB DEFAULT NULL,
    p_selection_range JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO collaboration_presence (
        user_id,
        session_id,
        status,
        cursor_position,
        selection_range,
        last_seen_at
    ) VALUES (
        p_user_id,
        p_session_id,
        p_status,
        p_cursor_position,
        p_selection_range,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, session_id)
    DO UPDATE SET
        status = EXCLUDED.status,
        cursor_position = EXCLUDED.cursor_position,
        selection_range = EXCLUDED.selection_range,
        last_seen_at = EXCLUDED.last_seen_at,
        actions_count = collaboration_presence.actions_count + 1,
        last_action_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;-- Create R
LS (Row Level Security) policies for collaboration tables

-- Enable RLS on all collaboration tables
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_conflicts ENABLE ROW LEVEL SECURITY;

-- Collaboration sessions policies
CREATE POLICY "Users can view sessions they own or participate in" ON collaboration_sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            owner_id = auth.uid() OR 
            auth.uid() = ANY(participants) OR
            is_public = true
        )
    );

CREATE POLICY "Users can create collaboration sessions" ON collaboration_sessions
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND owner_id = auth.uid()
    );

CREATE POLICY "Session owners can update their sessions" ON collaboration_sessions
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND owner_id = auth.uid()
    );

CREATE POLICY "Session owners can delete their sessions" ON collaboration_sessions
    FOR DELETE USING (
        auth.role() = 'authenticated' AND owner_id = auth.uid()
    );

-- Content comments policies
CREATE POLICY "Users can view comments in sessions they participate in" ON content_comments
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            author_id = auth.uid() OR
            session_id IN (
                SELECT id FROM collaboration_sessions 
                WHERE owner_id = auth.uid() OR auth.uid() = ANY(participants) OR is_public = true
            ) OR
            visibility = 'public'
        )
    );

CREATE POLICY "Authenticated users can create comments" ON content_comments
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND author_id = auth.uid()
    );

CREATE POLICY "Comment authors can update their comments" ON content_comments
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND author_id = auth.uid()
    );

CREATE POLICY "Comment authors and session owners can delete comments" ON content_comments
    FOR DELETE USING (
        auth.role() = 'authenticated' AND (
            author_id = auth.uid() OR
            session_id IN (
                SELECT id FROM collaboration_sessions WHERE owner_id = auth.uid()
            )
        )
    );

-- Collaboration events policies
CREATE POLICY "Users can view events from their sessions" ON collaboration_events
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            user_id = auth.uid() OR
            session_id IN (
                SELECT id FROM collaboration_sessions 
                WHERE owner_id = auth.uid() OR auth.uid() = ANY(participants)
            )
        )
    );

CREATE POLICY "Authenticated users can create collaboration events" ON collaboration_events
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND user_id = auth.uid()
    );

-- Collaboration presence policies
CREATE POLICY "Users can view presence in their sessions" ON collaboration_presence
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            user_id = auth.uid() OR
            session_id IN (
                SELECT id FROM collaboration_sessions 
                WHERE owner_id = auth.uid() OR auth.uid() = ANY(participants)
            )
        )
    );

CREATE POLICY "Users can manage their own presence" ON collaboration_presence
    FOR ALL USING (
        auth.role() = 'authenticated' AND user_id = auth.uid()
    );

-- Collaboration permissions policies
CREATE POLICY "Users can view permissions for their sessions" ON collaboration_permissions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            user_id = auth.uid() OR
            session_id IN (
                SELECT id FROM collaboration_sessions WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "Session owners can manage permissions" ON collaboration_permissions
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        session_id IN (
            SELECT id FROM collaboration_sessions WHERE owner_id = auth.uid()
        )
    );

-- Collaboration conflicts policies
CREATE POLICY "Users can view conflicts in their sessions" ON collaboration_conflicts
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        session_id IN (
            SELECT id FROM collaboration_sessions 
            WHERE owner_id = auth.uid() OR auth.uid() = ANY(participants)
        )
    );

CREATE POLICY "Session participants can resolve conflicts" ON collaboration_conflicts
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        session_id IN (
            SELECT id FROM collaboration_sessions 
            WHERE owner_id = auth.uid() OR auth.uid() = ANY(participants)
        )
    );

-- Admin policies for all collaboration tables
CREATE POLICY "Admins can manage all collaboration data" ON collaboration_sessions
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can manage all comments" ON content_comments
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can view all collaboration events" ON collaboration_events
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Create initial data and configuration

-- Insert default collaboration settings
INSERT INTO site_settings (key, value, description, category) VALUES
    ('collaboration_max_sessions_per_user', '5', 'Maximum number of active collaboration sessions per user', 'collaboration'),
    ('collaboration_session_timeout', '86400', 'Session timeout in seconds (24 hours)', 'collaboration'),
    ('collaboration_max_participants', '10', 'Maximum number of participants per session', 'collaboration'),
    ('collaboration_auto_save_interval', '30', 'Auto-save interval in seconds', 'collaboration'),
    ('collaboration_conflict_resolution', 'auto_merge', 'Default conflict resolution strategy', 'collaboration'),
    ('collaboration_enable_anonymous', 'false', 'Allow anonymous users in public sessions', 'collaboration'),
    ('collaboration_comment_moderation', 'false', 'Enable comment moderation', 'collaboration'),
    ('collaboration_presence_timeout', '300', 'User presence timeout in seconds (5 minutes)', 'collaboration')
ON CONFLICT (key) DO NOTHING;

-- Create sample collaboration session for testing
INSERT INTO collaboration_sessions (
    session_id,
    session_name,
    session_type,
    content_type,
    content_id,
    owner_id,
    status,
    is_public,
    permissions
) VALUES (
    'demo-collaboration-session',
    'Demo Collaboration Session',
    'editing',
    'case_study',
    '00000000-0000-0000-0000-000000000001',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1),
    'active',
    true,
    '{
        "can_edit": true,
        "can_comment": true,
        "can_suggest": true,
        "can_approve": false
    }'::jsonb
) ON CONFLICT (session_id) DO NOTHING;

-- Create sample comments for testing
INSERT INTO content_comments (
    comment_id,
    content_type,
    content_id,
    anchor_type,
    anchor_data,
    comment_text,
    comment_type,
    author_id,
    visibility
) VALUES (
    'demo-comment-1',
    'case_study',
    '00000000-0000-0000-0000-000000000001',
    'text',
    '{"position": 150, "text": "sample text", "element": "paragraph-1"}'::jsonb,
    'This is a sample comment for testing the collaboration system.',
    'comment',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1),
    'public'
) ON CONFLICT (comment_id) DO NOTHING;

-- Create views for easier querying

-- View for active collaboration sessions with participant details
CREATE OR REPLACE VIEW active_collaboration_sessions AS
SELECT 
    cs.*,
    up.full_name as owner_name,
    up.email as owner_email,
    (
        SELECT COUNT(*) 
        FROM collaboration_presence cp 
        WHERE cp.session_id = cs.id AND cp.status IN ('active', 'idle')
    ) as active_participants_count,
    (
        SELECT COUNT(*) 
        FROM content_comments cc 
        WHERE cc.session_id = cs.id AND cc.status = 'active'
    ) as comments_count,
    (
        SELECT COUNT(*) 
        FROM collaboration_conflicts ccf 
        WHERE ccf.session_id = cs.id AND ccf.resolution_status = 'pending'
    ) as pending_conflicts_count
FROM collaboration_sessions cs
JOIN user_profiles up ON cs.owner_id = up.id
WHERE cs.status = 'active';

-- View for comment threads with reply counts
CREATE OR REPLACE VIEW comment_threads AS
SELECT 
    cc.*,
    up.full_name as author_name,
    up.email as author_email,
    up.avatar_url as author_avatar,
    (
        SELECT COUNT(*) 
        FROM content_comments replies 
        WHERE replies.thread_id = cc.thread_id AND replies.id != cc.id
    ) as total_replies,
    (
        SELECT COUNT(*) 
        FROM content_comments unresolved 
        WHERE unresolved.thread_id = cc.thread_id AND unresolved.is_resolved = false
    ) as unresolved_count
FROM content_comments cc
JOIN user_profiles up ON cc.author_id = up.id
WHERE cc.parent_comment_id IS NULL -- Only root comments
ORDER BY cc.created_at DESC;

-- View for user collaboration activity
CREATE OR REPLACE VIEW user_collaboration_activity AS
SELECT 
    up.id as user_id,
    up.full_name,
    up.email,
    COUNT(DISTINCT cs.id) as sessions_owned,
    COUNT(DISTINCT cp.session_id) as sessions_participated,
    COUNT(DISTINCT cc.id) as comments_made,
    COUNT(DISTINCT ce.id) as events_generated,
    MAX(cp.last_seen_at) as last_collaboration_activity
FROM user_profiles up
LEFT JOIN collaboration_sessions cs ON up.id = cs.owner_id
LEFT JOIN collaboration_presence cp ON up.id = cp.user_id
LEFT JOIN content_comments cc ON up.id = cc.author_id
LEFT JOIN collaboration_events ce ON up.id = ce.user_id
GROUP BY up.id, up.full_name, up.email
ORDER BY last_collaboration_activity DESC NULLS LAST;

-- Create notification triggers for real-time updates

-- Function to notify about new comments
CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification to session participants
    PERFORM pg_notify(
        'collaboration_comment_' || NEW.session_id::text,
        json_build_object(
            'type', 'new_comment',
            'comment_id', NEW.id,
            'author_id', NEW.author_id,
            'content_type', NEW.content_type,
            'content_id', NEW.content_id,
            'comment_text', NEW.comment_text,
            'created_at', NEW.created_at
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment notifications
CREATE TRIGGER trigger_notify_new_comment
    AFTER INSERT ON content_comments
    FOR EACH ROW EXECUTE FUNCTION notify_new_comment();

-- Function to notify about collaboration events
CREATE OR REPLACE FUNCTION notify_collaboration_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification to session participants
    PERFORM pg_notify(
        'collaboration_event_' || NEW.session_id::text,
        json_build_object(
            'type', NEW.event_type,
            'action', NEW.event_action,
            'user_id', NEW.user_id,
            'event_data', NEW.event_data,
            'created_at', NEW.created_at
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for collaboration event notifications
CREATE TRIGGER trigger_notify_collaboration_event
    AFTER INSERT ON collaboration_events
    FOR EACH ROW EXECUTE FUNCTION notify_collaboration_event();

-- Create cleanup job (would be run by a scheduler)
-- This is a placeholder for a scheduled job that would run periodically
COMMENT ON FUNCTION cleanup_inactive_sessions() IS 'Run this function periodically to clean up inactive sessions and old presence records';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;