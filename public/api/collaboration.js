/**
 * Collaboration API Endpoints for CMS Enhancement System
 * 
 * This module provides comprehensive API endpoints for real-time collaboration including:
 * - WebSocket endpoints for real-time collaboration
 * - Session management endpoints
 * - Comment management endpoints
 * - Conflict resolution endpoints
 * - Presence tracking endpoints
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// WebSocket server for real-time collaboration
let wss = null;
const activeSessions = new Map(); // sessionId -> Set of WebSocket connections
const userSessions = new Map(); // userId -> Set of sessionIds

/**
 * Initialize WebSocket server for real-time collaboration
 * @param {http.Server} server - HTTP server instance
 */
function initializeWebSocketServer(server) {
    wss = new WebSocket.Server({ 
        server,
        path: '/ws/collaboration',
        verifyClient: async (info) => {
            try {
                // Extract token from query parameters
                const query = url.parse(info.req.url, true).query;
                const token = query.token;
                
                if (!token) return false;
                
                // Verify JWT token with Supabase
                const { data: { user }, error } = await supabase.auth.getUser(token);
                if (error || !user) return false;
                
                // Store user info for later use
                info.req.user = user;
                return true;
            } catch (error) {
                console.error('WebSocket verification error:', error);
                return false;
            }
        }
    });

    wss.on('connection', handleWebSocketConnection);
    console.log('WebSocket server initialized for collaboration');
}

/**
 * Handle new WebSocket connections
 * @param {WebSocket} ws - WebSocket connection
 * @param {http.IncomingMessage} req - HTTP request
 */
function handleWebSocketConnection(ws, req) {
    const user = req.user;
    let currentSessionId = null;
    
    console.log(`User ${user.id} connected to collaboration WebSocket`);
    
    // Handle incoming messages
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            await handleWebSocketMessage(ws, user, message);
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Invalid message format'
            }));
        }
    });
    
    // Handle connection close
    ws.on('close', async () => {
        console.log(`User ${user.id} disconnected from collaboration WebSocket`);
        
        if (currentSessionId) {
            await leaveCollaborationSession(user.id, currentSessionId);
            removeFromSession(ws, currentSessionId);
        }
    });
    
    // Store session reference
    ws.getCurrentSession = () => currentSessionId;
    ws.setCurrentSession = (sessionId) => {
        currentSessionId = sessionId;
    };
    ws.user = user;
}

/**
 * Handle WebSocket messages
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} user - User object
 * @param {Object} message - Parsed message
 */
async function handleWebSocketMessage(ws, user, message) {
    switch (message.type) {
        case 'join_session':
            await handleJoinSession(ws, user, message.sessionId);
            break;
            
        case 'leave_session':
            await handleLeaveSession(ws, user, message.sessionId);
            break;
            
        case 'content_edit':
            await handleContentEdit(ws, user, message);
            break;
            
        case 'cursor_update':
            await handleCursorUpdate(ws, user, message);
            break;
            
        case 'selection_update':
            await handleSelectionUpdate(ws, user, message);
            break;
            
        case 'comment_add':
            await handleCommentAdd(ws, user, message);
            break;
            
        case 'presence_update':
            await handlePresenceUpdate(ws, user, message);
            break;
            
        case 'heartbeat':
            ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
            break;
            
        default:
            ws.send(JSON.stringify({
                type: 'error',
                error: `Unknown message type: ${message.type}`
            }));
    }
}

/**
 * Handle user joining a collaboration session
 */
async function handleJoinSession(ws, user, sessionId) {
    try {
        // Verify session exists and user has permission
        const { data: session, error } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (error || !session) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Session not found'
            }));
            return;
        }
        
        // Check permissions
        if (!canJoinSession(user, session)) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Permission denied'
            }));
            return;
        }
        
        // Add to session
        addToSession(ws, sessionId);
        ws.setCurrentSession(sessionId);
        
        // Update session participants
        const updatedParticipants = [...new Set([...session.participants, user.id])];
        await supabase
            .from('collaboration_sessions')
            .update({ 
                participants: updatedParticipants,
                last_activity_at: new Date().toISOString()
            })
            .eq('id', session.id);
        
        // Update user presence
        await updateUserPresence(user.id, session.id, 'active');
        
        // Log join event
        await logCollaborationEvent(session.id, user.id, 'session_join', 'join', {
            session_id: sessionId,
            user_id: user.id
        });
        
        // Notify user of successful join
        ws.send(JSON.stringify({
            type: 'session_joined',
            sessionId,
            session
        }));
        
        // Notify other participants
        broadcastToSession(sessionId, {
            type: 'user_joined',
            userId: user.id,
            sessionId
        }, ws);
        
    } catch (error) {
        console.error('Error joining session:', error);
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to join session'
        }));
    }
}

/**
 * Handle user leaving a collaboration session
 */
async function handleLeaveSession(ws, user, sessionId) {
    try {
        await leaveCollaborationSession(user.id, sessionId);
        removeFromSession(ws, sessionId);
        ws.setCurrentSession(null);
        
        ws.send(JSON.stringify({
            type: 'session_left',
            sessionId
        }));
        
        // Notify other participants
        broadcastToSession(sessionId, {
            type: 'user_left',
            userId: user.id,
            sessionId
        }, ws);
        
    } catch (error) {
        console.error('Error leaving session:', error);
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to leave session'
        }));
    }
}

/**
 * Handle content edit operations
 */
async function handleContentEdit(ws, user, message) {
    try {
        const sessionId = ws.getCurrentSession();
        if (!sessionId) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Not in a collaboration session'
            }));
            return;
        }
        
        // Get session info
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (!session) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Session not found'
            }));
            return;
        }
        
        // Log the edit event
        await logCollaborationEvent(session.id, user.id, 'content_edit', 'edit', {
            operation: message.operation,
            position: message.operation.position,
            content: message.operation.content,
            version: message.operation.version
        });
        
        // Broadcast to other participants
        broadcastToSession(sessionId, {
            type: 'remote_edit',
            userId: user.id,
            operation: message.operation,
            timestamp: Date.now()
        }, ws);
        
        // Update session activity
        await supabase
            .from('collaboration_sessions')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', session.id);
            
    } catch (error) {
        console.error('Error handling content edit:', error);
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to process edit'
        }));
    }
}

/**
 * Handle cursor position updates
 */
async function handleCursorUpdate(ws, user, message) {
    try {
        const sessionId = ws.getCurrentSession();
        if (!sessionId) return;
        
        // Update presence with cursor position
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('id')
            .eq('session_id', sessionId)
            .single();
            
        if (session) {
            await updateUserPresence(user.id, session.id, 'active', {
                cursorPosition: message.position,
                timestamp: Date.now()
            });
            
            // Broadcast cursor position to other participants
            broadcastToSession(sessionId, {
                type: 'remote_cursor',
                userId: user.id,
                position: message.position,
                timestamp: Date.now()
            }, ws);
        }
        
    } catch (error) {
        console.error('Error handling cursor update:', error);
    }
}

/**
 * Handle text selection updates
 */
async function handleSelectionUpdate(ws, user, message) {
    try {
        const sessionId = ws.getCurrentSession();
        if (!sessionId) return;
        
        // Update presence with selection range
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('id')
            .eq('session_id', sessionId)
            .single();
            
        if (session) {
            await updateUserPresence(user.id, session.id, 'active', {
                selectionRange: message.selection,
                timestamp: Date.now()
            });
            
            // Broadcast selection to other participants
            broadcastToSession(sessionId, {
                type: 'remote_selection',
                userId: user.id,
                selection: message.selection,
                timestamp: Date.now()
            }, ws);
        }
        
    } catch (error) {
        console.error('Error handling selection update:', error);
    }
}

/**
 * Handle comment addition
 */
async function handleCommentAdd(ws, user, message) {
    try {
        const sessionId = ws.getCurrentSession();
        if (!sessionId) return;
        
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (!session) return;
        
        // Create comment
        const comment = {
            comment_id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content_type: session.content_type,
            content_id: session.content_id,
            content_version: message.version || 1,
            anchor_type: message.anchorType || 'text',
            anchor_data: message.anchorData || {},
            context_before: message.contextBefore,
            context_after: message.contextAfter,
            comment_text: message.text,
            comment_html: message.html,
            comment_type: message.commentType || 'comment',
            author_id: user.id,
            session_id: session.id,
            visibility: message.visibility || 'public',
            mentioned_users: message.mentionedUsers || [],
            parent_comment_id: message.parentCommentId
        };
        
        const { data: newComment, error } = await supabase
            .from('content_comments')
            .insert([comment])
            .select(`
                *,
                user_profiles!author_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .single();
            
        if (error) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Failed to create comment'
            }));
            return;
        }
        
        // Broadcast comment to all participants
        broadcastToSession(sessionId, {
            type: 'comment_added',
            comment: newComment,
            userId: user.id
        });
        
    } catch (error) {
        console.error('Error handling comment add:', error);
        ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to add comment'
        }));
    }
}

/**
 * Handle presence updates
 */
async function handlePresenceUpdate(ws, user, message) {
    try {
        const sessionId = ws.getCurrentSession();
        if (!sessionId) return;
        
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('id')
            .eq('session_id', sessionId)
            .single();
            
        if (session) {
            await updateUserPresence(user.id, session.id, message.status, message.metadata);
        }
        
    } catch (error) {
        console.error('Error handling presence update:', error);
    }
}

/**
 * Utility Functions
 */

function addToSession(ws, sessionId) {
    if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, new Set());
    }
    activeSessions.get(sessionId).add(ws);
    
    const userId = ws.user.id;
    if (!userSessions.has(userId)) {
        userSessions.set(userId, new Set());
    }
    userSessions.get(userId).add(sessionId);
}

function removeFromSession(ws, sessionId) {
    if (activeSessions.has(sessionId)) {
        activeSessions.get(sessionId).delete(ws);
        if (activeSessions.get(sessionId).size === 0) {
            activeSessions.delete(sessionId);
        }
    }
    
    const userId = ws.user.id;
    if (userSessions.has(userId)) {
        userSessions.get(userId).delete(sessionId);
        if (userSessions.get(userId).size === 0) {
            userSessions.delete(userId);
        }
    }
}

function broadcastToSession(sessionId, message, excludeWs = null) {
    if (activeSessions.has(sessionId)) {
        const connections = activeSessions.get(sessionId);
        connections.forEach(ws => {
            if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
    }
}

function canJoinSession(user, session) {
    // Owner can always join
    if (session.owner_id === user.id) return true;
    
    // Check if session is public
    if (session.is_public) return true;
    
    // Check if user is in participants list
    if (session.participants.includes(user.id)) return true;
    
    // Check if session allows anonymous users
    if (session.allow_anonymous) return true;
    
    return false;
}

async function leaveCollaborationSession(userId, sessionId) {
    try {
        // Get session
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (!session) return;
        
        // Update presence to offline
        await supabase
            .from('collaboration_presence')
            .update({
                status: 'offline',
                last_seen_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('session_id', session.id);
        
        // Log leave event
        await logCollaborationEvent(session.id, userId, 'session_leave', 'leave', {
            session_id: sessionId,
            user_id: userId
        });
        
    } catch (error) {
        console.error('Error leaving collaboration session:', error);
    }
}

async function updateUserPresence(userId, sessionId, status = 'active', metadata = {}) {
    try {
        const presenceData = {
            user_id: userId,
            session_id: sessionId,
            status,
            cursor_position: metadata.cursorPosition,
            selection_range: metadata.selectionRange,
            viewport_position: metadata.viewportPosition,
            last_seen_at: new Date().toISOString()
        };
        
        await supabase
            .from('collaboration_presence')
            .upsert(presenceData, {
                onConflict: 'user_id,session_id'
            });
            
    } catch (error) {
        console.error('Error updating user presence:', error);
    }
}

async function logCollaborationEvent(sessionId, userId, eventType, action, eventData) {
    try {
        const event = {
            session_id: sessionId,
            user_id: userId,
            event_type: eventType,
            action,
            event_data: eventData,
            timestamp: new Date().toISOString()
        };
        
        await supabase
            .from('collaboration_events')
            .insert([event]);
            
    } catch (error) {
        console.error('Error logging collaboration event:', error);
    }
}

/**
 * REST API Endpoints
 */

// Authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// Apply authentication to all routes
router.use(authenticateUser);

/**
 * Session Management Endpoints
 */

// POST /api/collaboration/sessions - Create new collaboration session
router.post('/sessions', async (req, res) => {
    try {
        const {
            sessionName,
            sessionType = 'editing',
            contentType,
            contentId,
            contentTitle,
            maxParticipants = 10,
            isPublic = false,
            allowAnonymous = false,
            permissions = {
                can_edit: true,
                can_comment: true,
                can_suggest: true,
                can_approve: false
            },
            expiresAt
        } = req.body;
        
        if (!contentType || !contentId) {
            return res.status(400).json({ error: 'Content type and ID are required' });
        }
        
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const session = {
            session_id: sessionId,
            session_name: sessionName,
            session_type: sessionType,
            content_type: contentType,
            content_id: contentId,
            content_title: contentTitle,
            owner_id: req.user.id,
            participants: [req.user.id],
            max_participants: maxParticipants,
            status: 'active',
            is_public: isPublic,
            allow_anonymous: allowAnonymous,
            permissions,
            expires_at: expiresAt
        };
        
        const { data, error } = await supabase
            .from('collaboration_sessions')
            .insert([session])
            .select()
            .single();
            
        if (error) {
            console.error('Error creating session:', error);
            return res.status(500).json({ error: 'Failed to create session' });
        }
        
        res.status(201).json({
            success: true,
            session: data
        });
        
    } catch (error) {
        console.error('Error in POST /sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/collaboration/sessions - List user's collaboration sessions
router.get('/sessions', async (req, res) => {
    try {
        const { status, contentType, limit = 50, offset = 0 } = req.query;
        
        let query = supabase
            .from('collaboration_sessions')
            .select(`
                *,
                user_profiles!owner_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .or(`owner_id.eq.${req.user.id},participants.cs.{${req.user.id}}`)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
            
        if (status) {
            query = query.eq('status', status);
        }
        
        if (contentType) {
            query = query.eq('content_type', contentType);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching sessions:', error);
            return res.status(500).json({ error: 'Failed to fetch sessions' });
        }
        
        res.json({
            success: true,
            sessions: data
        });
        
    } catch (error) {
        console.error('Error in GET /sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/collaboration/sessions/:sessionId - Get specific session details
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const { data: session, error } = await supabase
            .from('collaboration_sessions')
            .select(`
                *,
                user_profiles!owner_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('session_id', sessionId)
            .single();
            
        if (error || !session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Check if user has access to this session
        if (!canJoinSession(req.user, session)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Get current participants with presence info
        const { data: participants } = await supabase
            .from('collaboration_presence')
            .select(`
                *,
                user_profiles!user_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('session_id', session.id)
            .in('status', ['active', 'idle']);
            
        res.json({
            success: true,
            session: {
                ...session,
                active_participants: participants || []
            }
        });
        
    } catch (error) {
        console.error('Error in GET /sessions/:sessionId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/collaboration/sessions/:sessionId - Update session
router.put('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const updates = req.body;
        
        // Get session to check ownership
        const { data: session, error: fetchError } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (fetchError || !session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        if (session.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Only session owner can update session' });
        }
        
        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.session_id;
        delete updates.owner_id;
        delete updates.created_at;
        
        const { data, error } = await supabase
            .from('collaboration_sessions')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .select()
            .single();
            
        if (error) {
            console.error('Error updating session:', error);
            return res.status(500).json({ error: 'Failed to update session' });
        }
        
        res.json({
            success: true,
            session: data
        });
        
    } catch (error) {
        console.error('Error in PUT /sessions/:sessionId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/collaboration/sessions/:sessionId - End/delete session
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Get session to check ownership
        const { data: session, error: fetchError } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (fetchError || !session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        if (session.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Only session owner can delete session' });
        }
        
        // End the session instead of deleting (for audit trail)
        const { error } = await supabase
            .from('collaboration_sessions')
            .update({
                status: 'ended',
                ended_at: new Date().toISOString()
            })
            .eq('session_id', sessionId);
            
        if (error) {
            console.error('Error ending session:', error);
            return res.status(500).json({ error: 'Failed to end session' });
        }
        
        // Notify all participants via WebSocket
        broadcastToSession(sessionId, {
            type: 'session_ended',
            sessionId,
            endedBy: req.user.id
        });
        
        res.json({
            success: true,
            message: 'Session ended successfully'
        });
        
    } catch (error) {
        console.error('Error in DELETE /sessions/:sessionId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Comment Management Endpoints
 */

// POST /api/collaboration/comments - Create new comment
router.post('/comments', async (req, res) => {
    try {
        const {
            sessionId,
            contentType,
            contentId,
            contentVersion = 1,
            anchorType = 'text',
            anchorData = {},
            contextBefore,
            contextAfter,
            text,
            html,
            commentType = 'comment',
            visibility = 'public',
            mentionedUsers = [],
            parentCommentId
        } = req.body;
        
        if (!text || !contentType || !contentId) {
            return res.status(400).json({ error: 'Text, content type, and content ID are required' });
        }
        
        // Get session if provided
        let session = null;
        if (sessionId) {
            const { data } = await supabase
                .from('collaboration_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();
            session = data;
        }
        
        const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const comment = {
            comment_id: commentId,
            content_type: contentType,
            content_id: contentId,
            content_version: contentVersion,
            anchor_type: anchorType,
            anchor_data: anchorData,
            context_before: contextBefore,
            context_after: contextAfter,
            comment_text: text,
            comment_html: html,
            comment_type: commentType,
            author_id: req.user.id,
            session_id: session?.id,
            visibility,
            mentioned_users: mentionedUsers,
            parent_comment_id: parentCommentId
        };
        
        const { data, error } = await supabase
            .from('content_comments')
            .insert([comment])
            .select(`
                *,
                user_profiles!author_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .single();
            
        if (error) {
            console.error('Error creating comment:', error);
            return res.status(500).json({ error: 'Failed to create comment' });
        }
        
        // Broadcast to session participants if in a session
        if (sessionId) {
            broadcastToSession(sessionId, {
                type: 'comment_added',
                comment: data,
                userId: req.user.id
            });
        }
        
        res.status(201).json({
            success: true,
            comment: data
        });
        
    } catch (error) {
        console.error('Error in POST /comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/collaboration/comments - Get comments for content
router.get('/comments', async (req, res) => {
    try {
        const { contentType, contentId, sessionId, resolved, type, limit = 100, offset = 0 } = req.query;
        
        if (!contentType || !contentId) {
            return res.status(400).json({ error: 'Content type and ID are required' });
        }
        
        let query = supabase
            .from('content_comments')
            .select(`
                *,
                user_profiles!author_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('content_type', contentType)
            .eq('content_id', contentId)
            .eq('status', 'active')
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);
            
        if (sessionId) {
            const { data: session } = await supabase
                .from('collaboration_sessions')
                .select('id')
                .eq('session_id', sessionId)
                .single();
            if (session) {
                query = query.eq('session_id', session.id);
            }
        }
        
        if (resolved !== undefined) {
            query = query.eq('is_resolved', resolved === 'true');
        }
        
        if (type) {
            query = query.eq('comment_type', type);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching comments:', error);
            return res.status(500).json({ error: 'Failed to fetch comments' });
        }
        
        // Organize comments into threads
        const commentMap = new Map();
        const rootComments = [];
        
        // First pass: create comment map
        data.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });
        
        // Second pass: organize into threads
        data.forEach(comment => {
            if (comment.parent_comment_id) {
                const parent = commentMap.get(comment.parent_comment_id);
                if (parent) {
                    parent.replies.push(comment);
                }
            } else {
                rootComments.push(comment);
            }
        });
        
        res.json({
            success: true,
            comments: rootComments
        });
        
    } catch (error) {
        console.error('Error in GET /comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/collaboration/comments/:commentId/resolve - Resolve comment
router.put('/comments/:commentId/resolve', async (req, res) => {
    try {
        const { commentId } = req.params;
        
        const { data, error } = await supabase
            .from('content_comments')
            .update({
                is_resolved: true,
                resolved_by: req.user.id,
                resolved_at: new Date().toISOString(),
                status: 'resolved'
            })
            .eq('comment_id', commentId)
            .select(`
                *,
                user_profiles!author_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .single();
            
        if (error) {
            console.error('Error resolving comment:', error);
            return res.status(500).json({ error: 'Failed to resolve comment' });
        }
        
        if (!data) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        res.json({
            success: true,
            comment: data
        });
        
    } catch (error) {
        console.error('Error in PUT /comments/:commentId/resolve:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Conflict Resolution Endpoints
 */

// GET /api/collaboration/conflicts/:sessionId - Get conflicts for session
router.get('/conflicts/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status = 'pending' } = req.query;
        
        // Get session
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Check access
        if (!canJoinSession(req.user, session)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { data, error } = await supabase
            .from('collaboration_conflicts')
            .select('*')
            .eq('session_id', session.id)
            .eq('resolution_status', status)
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching conflicts:', error);
            return res.status(500).json({ error: 'Failed to fetch conflicts' });
        }
        
        res.json({
            success: true,
            conflicts: data
        });
        
    } catch (error) {
        console.error('Error in GET /conflicts/:sessionId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/collaboration/conflicts/:conflictId/resolve - Resolve conflict
router.put('/conflicts/:conflictId/resolve', async (req, res) => {
    try {
        const { conflictId } = req.params;
        const { resolutionStrategy, resolvedContent } = req.body;
        
        if (!resolutionStrategy || !resolvedContent) {
            return res.status(400).json({ error: 'Resolution strategy and content are required' });
        }
        
        const { data, error } = await supabase
            .from('collaboration_conflicts')
            .update({
                resolution_status: 'resolved',
                resolution_strategy: resolutionStrategy,
                resolved_content: resolvedContent,
                resolved_by: req.user.id,
                resolved_at: new Date().toISOString()
            })
            .eq('conflict_id', conflictId)
            .select()
            .single();
            
        if (error) {
            console.error('Error resolving conflict:', error);
            return res.status(500).json({ error: 'Failed to resolve conflict' });
        }
        
        if (!data) {
            return res.status(404).json({ error: 'Conflict not found' });
        }
        
        res.json({
            success: true,
            conflict: data
        });
        
    } catch (error) {
        console.error('Error in PUT /conflicts/:conflictId/resolve:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Presence and Activity Endpoints
 */

// GET /api/collaboration/presence/:sessionId - Get session participants
router.get('/presence/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Get session
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Check access
        if (!canJoinSession(req.user, session)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const { data, error } = await supabase
            .from('collaboration_presence')
            .select(`
                *,
                user_profiles!user_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('session_id', session.id)
            .in('status', ['active', 'idle'])
            .order('last_seen_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching presence:', error);
            return res.status(500).json({ error: 'Failed to fetch presence' });
        }
        
        res.json({
            success: true,
            participants: data.map(participant => ({
                ...participant.user_profiles,
                presence: {
                    status: participant.status,
                    lastSeen: participant.last_seen_at,
                    cursorPosition: participant.cursor_position,
                    selectionRange: participant.selection_range
                }
            }))
        });
        
    } catch (error) {
        console.error('Error in GET /presence/:sessionId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/collaboration/events/:sessionId - Get collaboration events
router.get('/events/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { eventType, limit = 100, offset = 0 } = req.query;
        
        // Get session
        const { data: session } = await supabase
            .from('collaboration_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();
            
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Check access
        if (!canJoinSession(req.user, session)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        let query = supabase
            .from('collaboration_events')
            .select(`
                *,
                user_profiles!user_id (
                    id,
                    full_name,
                    email,
                    avatar_url
                )
            `)
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
            
        if (eventType) {
            query = query.eq('event_type', eventType);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error fetching events:', error);
            return res.status(500).json({ error: 'Failed to fetch events' });
        }
        
        res.json({
            success: true,
            events: data
        });
        
    } catch (error) {
        console.error('Error in GET /events/:sessionId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export router and WebSocket initialization function
module.exports = {
    router,
    initializeWebSocketServer
};