/**
 * Real-time Collaboration Service for CMS Enhancement System
 * 
 * This service provides comprehensive real-time collaboration functionality including:
 * - Real-time editing with conflict resolution
 * - Live cursor tracking and user presence
 * - Collaborative commenting and suggestions
 * - Session management and permissions
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10
 */

class CollaborationService {
    constructor(supabaseClient, options = {}) {
        this.supabase = supabaseClient;
        this.options = {
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            presenceUpdateInterval: 5000, // 5 seconds
            conflictResolutionStrategy: 'auto_merge',
            maxParticipants: 10,
            enableCursorTracking: true,
            enableComments: true,
            ...options
        };
        
        // Service state
        this.currentSession = null;
        this.currentUser = null;
        this.isConnected = false;
        this.participants = new Map();
        this.comments = new Map();
        this.conflicts = new Map();
        
        // Real-time subscriptions
        this.subscriptions = new Map();
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Operational Transform state
        this.documentState = {
            content: '',
            version: 1,
            operations: [],
            pendingOperations: []
        };
        
        // Timers and intervals
        this.autoSaveTimer = null;
        this.presenceTimer = null;
        this.heartbeatTimer = null;
        
        // Initialize service
        this.init();
    }

    /**
     * Initialize the collaboration service
     */
    async init() {
        try {
            // Get current user
            const { data: { user } } = await this.supabase.auth.getUser();
            this.currentUser = user;
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Collaboration service initialized');
        } catch (error) {
            console.error('Failed to initialize collaboration service:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for real-time updates
     */
    setupEventListeners() {
        // Listen for authentication changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
            } else if (event === 'SIGNED_OUT') {
                this.disconnect();
                this.currentUser = null;
            }
        });
    }

    /**
     * Session Management
     */

    /**
     * Create a new collaboration session
     * @param {Object} sessionData - Session configuration
     */
    async createSession(sessionData) {
        try {
            if (!this.currentUser) {
                throw new Error('User must be authenticated to create a session');
            }

            const session = {
                session_id: sessionData.sessionId || this.generateSessionId(),
                session_name: sessionData.name,
                session_type: sessionData.type || 'editing',
                content_type: sessionData.contentType,
                content_id: sessionData.contentId,
                content_title: sessionData.contentTitle,
                owner_id: this.currentUser.id,
                participants: [this.currentUser.id],
                max_participants: sessionData.maxParticipants || this.options.maxParticipants,
                status: 'active',
                is_public: sessionData.isPublic || false,
                allow_anonymous: sessionData.allowAnonymous || false,
                permissions: sessionData.permissions || {
                    can_edit: true,
                    can_comment: true,
                    can_suggest: true,
                    can_approve: false
                },
                expires_at: sessionData.expiresAt
            };

            const { data, error } = await this.supabase
                .from('collaboration_sessions')
                .insert([session])
                .select()
                .single();

            if (error) throw error;

            this.currentSession = data;
            await this.joinSession(data.session_id);

            this.emit('session:created', data);
            return data;
        } catch (error) {
            console.error('Error creating collaboration session:', error);
            throw error;
        }
    }

    /**
     * Join an existing collaboration session
     * @param {string} sessionId - Session ID to join
     */
    async joinSession(sessionId) {
        try {
            if (!this.currentUser) {
                throw new Error('User must be authenticated to join a session');
            }

            // Get session details
            const { data: session, error } = await this.supabase
                .from('collaboration_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (error) throw error;
            if (!session) throw new Error('Session not found');

            // Check if user can join
            if (!this.canJoinSession(session)) {
                throw new Error('Permission denied to join session');
            }

            this.currentSession = session;

            // Add user to participants if not already included
            if (!session.participants.includes(this.currentUser.id)) {
                const updatedParticipants = [...session.participants, this.currentUser.id];
                
                await this.supabase
                    .from('collaboration_sessions')
                    .update({ participants: updatedParticipants })
                    .eq('id', session.id);
            }

            // Setup real-time subscriptions
            await this.setupRealtimeSubscriptions(session.id);

            // Update user presence
            await this.updatePresence('active');

            // Start timers
            this.startTimers();

            // Log join event
            await this.logEvent('session_join', 'join', {
                session_id: sessionId,
                user_id: this.currentUser.id
            });

            this.isConnected = true;
            this.emit('session:joined', session);

            return session;
        } catch (error) {
            console.error('Error joining collaboration session:', error);
            throw error;
        }
    }

    /**
     * Leave the current collaboration session
     */
    async leaveSession() {
        try {
            if (!this.currentSession || !this.currentUser) return;

            // Log leave event
            await this.logEvent('session_leave', 'leave', {
                session_id: this.currentSession.session_id,
                user_id: this.currentUser.id
            });

            // Update presence to offline
            await this.updatePresence('offline');

            // Remove from participants
            const updatedParticipants = this.currentSession.participants
                .filter(id => id !== this.currentUser.id);
            
            await this.supabase
                .from('collaboration_sessions')
                .update({ participants: updatedParticipants })
                .eq('id', this.currentSession.id);

            // Cleanup
            this.disconnect();
            
            this.emit('session:left', this.currentSession);
            this.currentSession = null;
        } catch (error) {
            console.error('Error leaving collaboration session:', error);
            throw error;
        }
    }

    /**
     * Real-time Editing
     */

    /**
     * Apply a text operation to the document
     * @param {Object} operation - Text operation (insert, delete, retain)
     */
    async applyOperation(operation) {
        try {
            if (!this.currentSession || !this.canEdit()) {
                throw new Error('Cannot edit in current session');
            }

            // Transform operation against pending operations
            const transformedOperation = this.transformOperation(operation);
            
            // Apply operation locally
            this.applyOperationLocally(transformedOperation);
            
            // Send operation to other participants
            await this.broadcastOperation(transformedOperation);
            
            // Log the edit event
            await this.logEvent('content_edit', 'edit', {
                operation: transformedOperation,
                position: operation.position,
                content: operation.content,
                version: this.documentState.version
            });

            this.emit('operation:applied', transformedOperation);
        } catch (error) {
            console.error('Error applying operation:', error);
            this.handleConflict(operation, error);
            throw error;
        }
    }

    /**
     * Insert text at a specific position
     * @param {number} position - Character position
     * @param {string} text - Text to insert
     */
    async insertText(position, text) {
        const operation = {
            type: 'insert',
            position,
            content: text,
            length: text.length,
            userId: this.currentUser.id,
            timestamp: Date.now(),
            version: this.documentState.version + 1
        };

        return await this.applyOperation(operation);
    }

    /**
     * Delete text at a specific position
     * @param {number} position - Start position
     * @param {number} length - Length of text to delete
     */
    async deleteText(position, length) {
        const operation = {
            type: 'delete',
            position,
            length,
            userId: this.currentUser.id,
            timestamp: Date.now(),
            version: this.documentState.version + 1
        };

        return await this.applyOperation(operation);
    }

    /**
     * Replace text at a specific position
     * @param {number} position - Start position
     * @param {number} length - Length of text to replace
     * @param {string} newText - New text
     */
    async replaceText(position, length, newText) {
        const operation = {
            type: 'replace',
            position,
            length,
            content: newText,
            userId: this.currentUser.id,
            timestamp: Date.now(),
            version: this.documentState.version + 1
        };

        return await this.applyOperation(operation);
    }

    /**
     * User Presence and Cursor Tracking
     */

    /**
     * Update user presence status
     * @param {string} status - Presence status (active, idle, away, offline)
     * @param {Object} metadata - Additional presence data
     */
    async updatePresence(status = 'active', metadata = {}) {
        try {
            if (!this.currentSession || !this.currentUser) return;

            const presenceData = {
                user_id: this.currentUser.id,
                session_id: this.currentSession.id,
                status,
                cursor_position: metadata.cursorPosition,
                selection_range: metadata.selectionRange,
                viewport_position: metadata.viewportPosition,
                user_agent: navigator.userAgent,
                device_type: this.getDeviceType(),
                last_seen_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('collaboration_presence')
                .upsert(presenceData, {
                    onConflict: 'user_id,session_id'
                });

            if (error) throw error;

            this.emit('presence:updated', {
                userId: this.currentUser.id,
                status,
                ...metadata
            });
        } catch (error) {
            console.error('Error updating presence:', error);
        }
    }

    /**
     * Update cursor position
     * @param {number} position - Cursor position
     * @param {Object} selection - Text selection range
     */
    async updateCursor(position, selection = null) {
        if (!this.options.enableCursorTracking) return;

        await this.updatePresence('active', {
            cursorPosition: { position, timestamp: Date.now() },
            selectionRange: selection
        });

        this.emit('cursor:updated', {
            userId: this.currentUser.id,
            position,
            selection
        });
    }

    /**
     * Get all participants in the current session
     */
    async getParticipants() {
        try {
            if (!this.currentSession) return [];

            const { data, error } = await this.supabase
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
                .eq('session_id', this.currentSession.id)
                .in('status', ['active', 'idle'])
                .order('last_seen_at', { ascending: false });

            if (error) throw error;

            return data.map(participant => ({
                ...participant.user_profiles,
                presence: {
                    status: participant.status,
                    lastSeen: participant.last_seen_at,
                    cursorPosition: participant.cursor_position,
                    selectionRange: participant.selection_range
                }
            }));
        } catch (error) {
            console.error('Error getting participants:', error);
            return [];
        }
    }

    /**
     * Commenting System
     */

    /**
     * Add a comment to the content
     * @param {Object} commentData - Comment data
     */
    async addComment(commentData) {
        try {
            if (!this.currentSession || !this.canComment()) {
                throw new Error('Cannot comment in current session');
            }

            const comment = {
                comment_id: this.generateCommentId(),
                content_type: this.currentSession.content_type,
                content_id: this.currentSession.content_id,
                content_version: this.documentState.version,
                anchor_type: commentData.anchorType || 'text',
                anchor_data: commentData.anchorData || {},
                context_before: commentData.contextBefore,
                context_after: commentData.contextAfter,
                comment_text: commentData.text,
                comment_html: commentData.html,
                comment_type: commentData.type || 'comment',
                author_id: this.currentUser.id,
                session_id: this.currentSession.id,
                visibility: commentData.visibility || 'public',
                mentioned_users: commentData.mentionedUsers || [],
                parent_comment_id: commentData.parentCommentId
            };

            const { data, error } = await this.supabase
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

            if (error) throw error;

            this.comments.set(data.id, data);
            this.emit('comment:added', data);

            return data;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    /**
     * Reply to a comment
     * @param {string} commentId - Parent comment ID
     * @param {string} text - Reply text
     */
    async replyToComment(commentId, text) {
        return await this.addComment({
            text,
            parentCommentId: commentId,
            type: 'comment'
        });
    }

    /**
     * Resolve a comment
     * @param {string} commentId - Comment ID to resolve
     */
    async resolveComment(commentId) {
        try {
            const { data, error } = await this.supabase
                .from('content_comments')
                .update({
                    is_resolved: true,
                    resolved_by: this.currentUser.id,
                    resolved_at: new Date().toISOString(),
                    status: 'resolved'
                })
                .eq('id', commentId)
                .select()
                .single();

            if (error) throw error;

            this.emit('comment:resolved', data);
            return data;
        } catch (error) {
            console.error('Error resolving comment:', error);
            throw error;
        }
    }

    /**
     * Get comments for the current content
     * @param {Object} filters - Comment filters
     */
    async getComments(filters = {}) {
        try {
            if (!this.currentSession) return [];

            let query = this.supabase
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
                .eq('content_type', this.currentSession.content_type)
                .eq('content_id', this.currentSession.content_id)
                .eq('status', 'active')
                .order('created_at', { ascending: true });

            if (filters.resolved !== undefined) {
                query = query.eq('is_resolved', filters.resolved);
            }

            if (filters.type) {
                query = query.eq('comment_type', filters.type);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Organize comments into threads
            const comments = this.organizeCommentThreads(data);
            
            // Update local cache
            comments.forEach(comment => {
                this.comments.set(comment.id, comment);
            });

            return comments;
        } catch (error) {
            console.error('Error getting comments:', error);
            return [];
        }
    }

    /**
     * Conflict Resolution
     */

    /**
     * Handle operation conflicts
     * @param {Object} operation - The conflicting operation
     * @param {Error} error - The conflict error
     */
    async handleConflict(operation, error) {
        try {
            const conflict = {
                session_id: this.currentSession.id,
                conflict_type: 'edit_overlap',
                conflict_severity: 'medium',
                content_position: operation.position,
                content_length: operation.length,
                conflicting_content_1: operation.content,
                auto_resolution_attempted: true
            };

            // Attempt automatic resolution based on strategy
            const resolved = await this.attemptAutoResolution(conflict, operation);
            
            if (resolved) {
                conflict.resolution_status = 'resolved';
                conflict.auto_resolution_successful = true;
                conflict.resolved_content = resolved.content;
            } else {
                conflict.resolution_status = 'pending';
                conflict.auto_resolution_successful = false;
            }

            // Log the conflict
            const { data } = await this.supabase
                .from('collaboration_conflicts')
                .insert([conflict])
                .select()
                .single();

            this.conflicts.set(data.id, data);
            this.emit('conflict:detected', data);

            return data;
        } catch (error) {
            console.error('Error handling conflict:', error);
        }
    }

    /**
     * Attempt automatic conflict resolution
     * @param {Object} conflict - Conflict data
     * @param {Object} operation - The operation causing conflict
     */
    async attemptAutoResolution(conflict, operation) {
        try {
            switch (this.options.conflictResolutionStrategy) {
                case 'latest_wins':
                    return { content: operation.content, method: 'latest_wins' };
                    
                case 'auto_merge':
                    return await this.attemptAutoMerge(conflict, operation);
                    
                case 'user_choice':
                    // Emit event for user to choose
                    this.emit('conflict:user_choice_required', { conflict, operation });
                    return null;
                    
                default:
                    return null;
            }
        } catch (error) {
            console.error('Error in auto resolution:', error);
            return null;
        }
    }

    /**
     * Real-time Subscriptions
     */

    /**
     * Setup real-time subscriptions for the session
     * @param {string} sessionId - Session ID
     */
    async setupRealtimeSubscriptions(sessionId) {
        try {
            // Subscribe to collaboration events
            const eventsSubscription = this.supabase
                .channel(`collaboration_events_${sessionId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'collaboration_events',
                    filter: `session_id=eq.${sessionId}`
                }, (payload) => {
                    this.handleRealtimeEvent(payload.new);
                })
                .subscribe();

            // Subscribe to presence changes
            const presenceSubscription = this.supabase
                .channel(`collaboration_presence_${sessionId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'collaboration_presence',
                    filter: `session_id=eq.${sessionId}`
                }, (payload) => {
                    this.handlePresenceChange(payload);
                })
                .subscribe();

            // Subscribe to comments
            const commentsSubscription = this.supabase
                .channel(`content_comments_${sessionId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'content_comments',
                    filter: `session_id=eq.${sessionId}`
                }, (payload) => {
                    this.handleCommentChange(payload);
                })
                .subscribe();

            // Store subscriptions for cleanup
            this.subscriptions.set('events', eventsSubscription);
            this.subscriptions.set('presence', presenceSubscription);
            this.subscriptions.set('comments', commentsSubscription);

        } catch (error) {
            console.error('Error setting up real-time subscriptions:', error);
        }
    }

    /**
     * Handle real-time collaboration events
     * @param {Object} event - Collaboration event
     */
    handleRealtimeEvent(event) {
        // Skip events from current user
        if (event.user_id === this.currentUser?.id) return;

        switch (event.event_type) {
            case 'content_edit':
                this.handleRemoteEdit(event);
                break;
            case 'cursor_move':
                this.handleRemoteCursor(event);
                break;
            case 'session_join':
                this.handleUserJoin(event);
                break;
            case 'session_leave':
                this.handleUserLeave(event);
                break;
            default:
                this.emit('event:received', event);
        }
    }

    /**
     * Handle presence changes
     * @param {Object} payload - Presence change payload
     */
    handlePresenceChange(payload) {
        const { eventType, new: newData, old: oldData } = payload;
        
        switch (eventType) {
            case 'INSERT':
            case 'UPDATE':
                this.participants.set(newData.user_id, newData);
                this.emit('presence:changed', newData);
                break;
            case 'DELETE':
                this.participants.delete(oldData.user_id);
                this.emit('presence:left', oldData);
                break;
        }
    }

    /**
     * Handle comment changes
     * @param {Object} payload - Comment change payload
     */
    handleCommentChange(payload) {
        const { eventType, new: newData, old: oldData } = payload;
        
        switch (eventType) {
            case 'INSERT':
                this.comments.set(newData.id, newData);
                this.emit('comment:added', newData);
                break;
            case 'UPDATE':
                this.comments.set(newData.id, newData);
                this.emit('comment:updated', newData);
                break;
            case 'DELETE':
                this.comments.delete(oldData.id);
                this.emit('comment:deleted', oldData);
                break;
        }
    }

    /**
     * Utility Methods
     */

    /**
     * Check if user can join a session
     * @param {Object} session - Session data
     */
    canJoinSession(session) {
        if (!this.currentUser) return false;
        
        // Owner can always join
        if (session.owner_id === this.currentUser.id) return true;
        
        // Check if session is public
        if (session.is_public) return true;
        
        // Check if user is in participants list
        if (session.participants.includes(this.currentUser.id)) return true;
        
        // Check if session allows anonymous users
        if (session.allow_anonymous) return true;
        
        return false;
    }

    /**
     * Check if user can edit in current session
     */
    canEdit() {
        if (!this.currentSession || !this.currentUser) return false;
        
        // Check session permissions
        return this.currentSession.permissions?.can_edit !== false;
    }

    /**
     * Check if user can comment in current session
     */
    canComment() {
        if (!this.currentSession || !this.currentUser) return false;
        if (!this.options.enableComments) return false;
        
        return this.currentSession.permissions?.can_comment !== false;
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate unique comment ID
     */
    generateCommentId() {
        return 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get device type
     */
    getDeviceType() {
        const userAgent = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
        if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
        return 'desktop';
    }

    /**
     * Event Management
     */

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    off(event, handler) {
        if (!this.eventHandlers.has(event)) return;
        
        const handlers = this.eventHandlers.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (!this.eventHandlers.has(event)) return;
        
        const handlers = this.eventHandlers.get(event);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }

    /**
     * Timer Management
     */

    /**
     * Start all timers
     */
    startTimers() {
        // Auto-save timer
        if (this.options.autoSave && this.options.autoSaveInterval > 0) {
            this.autoSaveTimer = setInterval(() => {
                this.autoSave();
            }, this.options.autoSaveInterval);
        }

        // Presence update timer
        if (this.options.presenceUpdateInterval > 0) {
            this.presenceTimer = setInterval(() => {
                this.updatePresence('active');
            }, this.options.presenceUpdateInterval);
        }

        // Heartbeat timer
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, 60000); // 1 minute
    }

    /**
     * Stop all timers
     */
    stopTimers() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }

        if (this.presenceTimer) {
            clearInterval(this.presenceTimer);
            this.presenceTimer = null;
        }

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Auto-save functionality
     */
    async autoSave() {
        try {
            if (!this.currentSession || !this.documentState.content) return;

            // Save current document state
            await this.supabase
                .from('collaboration_sessions')
                .update({
                    last_saved_content: this.documentState.content,
                    last_saved_version: this.documentState.version,
                    last_saved_at: new Date().toISOString()
                })
                .eq('id', this.currentSession.id);

            this.emit('document:auto_saved', {
                version: this.documentState.version,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    /**
     * Send heartbeat to maintain connection
     */
    async sendHeartbeat() {
        try {
            if (!this.currentSession || !this.currentUser) return;

            await this.logEvent('heartbeat', 'ping', {
                session_id: this.currentSession.session_id,
                user_id: this.currentUser.id,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }

    /**
     * Log collaboration event
     * @param {string} eventType - Type of event
     * @param {string} action - Action performed
     * @param {Object} eventData - Event data
     */
    async logEvent(eventType, action, eventData) {
        try {
            if (!this.currentSession || !this.currentUser) return;

            const event = {
                session_id: this.currentSession.id,
                user_id: this.currentUser.id,
                event_type: eventType,
                action,
                event_data: eventData,
                timestamp: new Date().toISOString()
            };

            await this.supabase
                .from('collaboration_events')
                .insert([event]);
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }

    /**
     * Operational Transform Methods
     */

    /**
     * Transform operation against pending operations
     * @param {Object} operation - Operation to transform
     */
    transformOperation(operation) {
        // Simple operational transform implementation
        let transformedOp = { ...operation };
        
        for (const pendingOp of this.documentState.pendingOperations) {
            transformedOp = this.transformAgainstOperation(transformedOp, pendingOp);
        }
        
        return transformedOp;
    }

    /**
     * Transform one operation against another
     * @param {Object} op1 - First operation
     * @param {Object} op2 - Second operation
     */
    transformAgainstOperation(op1, op2) {
        // Basic transformation logic
        if (op1.type === 'insert' && op2.type === 'insert') {
            if (op2.position <= op1.position) {
                return { ...op1, position: op1.position + op2.length };
            }
        } else if (op1.type === 'insert' && op2.type === 'delete') {
            if (op2.position < op1.position) {
                return { ...op1, position: Math.max(op1.position - op2.length, op2.position) };
            }
        } else if (op1.type === 'delete' && op2.type === 'insert') {
            if (op2.position <= op1.position) {
                return { ...op1, position: op1.position + op2.length };
            }
        } else if (op1.type === 'delete' && op2.type === 'delete') {
            if (op2.position < op1.position) {
                return { ...op1, position: Math.max(op1.position - op2.length, op2.position) };
            }
        }
        
        return op1;
    }

    /**
     * Apply operation locally to document state
     * @param {Object} operation - Operation to apply
     */
    applyOperationLocally(operation) {
        switch (operation.type) {
            case 'insert':
                this.documentState.content = 
                    this.documentState.content.slice(0, operation.position) +
                    operation.content +
                    this.documentState.content.slice(operation.position);
                break;
                
            case 'delete':
                this.documentState.content = 
                    this.documentState.content.slice(0, operation.position) +
                    this.documentState.content.slice(operation.position + operation.length);
                break;
                
            case 'replace':
                this.documentState.content = 
                    this.documentState.content.slice(0, operation.position) +
                    operation.content +
                    this.documentState.content.slice(operation.position + operation.length);
                break;
        }
        
        this.documentState.version = operation.version;
        this.documentState.operations.push(operation);
    }

    /**
     * Broadcast operation to other participants
     * @param {Object} operation - Operation to broadcast
     */
    async broadcastOperation(operation) {
        await this.logEvent('content_edit', 'edit', {
            operation,
            document_version: this.documentState.version
        });
    }

    /**
     * Handle remote edit operations
     * @param {Object} event - Remote edit event
     */
    handleRemoteEdit(event) {
        const operation = event.event_data.operation;
        
        // Transform against local pending operations
        const transformedOp = this.transformOperation(operation);
        
        // Apply to local document
        this.applyOperationLocally(transformedOp);
        
        this.emit('remote:edit', {
            operation: transformedOp,
            userId: event.user_id
        });
    }

    /**
     * Handle remote cursor movements
     * @param {Object} event - Remote cursor event
     */
    handleRemoteCursor(event) {
        this.emit('remote:cursor', {
            userId: event.user_id,
            position: event.event_data.position,
            selection: event.event_data.selection
        });
    }

    /**
     * Handle user join events
     * @param {Object} event - User join event
     */
    handleUserJoin(event) {
        this.emit('user:joined', {
            userId: event.user_id,
            sessionId: event.event_data.session_id
        });
    }

    /**
     * Handle user leave events
     * @param {Object} event - User leave event
     */
    handleUserLeave(event) {
        this.emit('user:left', {
            userId: event.user_id,
            sessionId: event.event_data.session_id
        });
    }

    /**
     * Organize comments into threaded structure
     * @param {Array} comments - Flat array of comments
     */
    organizeCommentThreads(comments) {
        const commentMap = new Map();
        const rootComments = [];
        
        // First pass: create comment map
        comments.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });
        
        // Second pass: organize into threads
        comments.forEach(comment => {
            if (comment.parent_comment_id) {
                const parent = commentMap.get(comment.parent_comment_id);
                if (parent) {
                    parent.replies.push(comment);
                }
            } else {
                rootComments.push(comment);
            }
        });
        
        return rootComments;
    }

    /**
     * Attempt automatic merge of conflicting content
     * @param {Object} conflict - Conflict data
     * @param {Object} operation - Operation causing conflict
     */
    async attemptAutoMerge(conflict, operation) {
        // Simple merge strategy - could be enhanced with more sophisticated algorithms
        try {
            const mergedContent = `${conflict.conflicting_content_1} ${operation.content}`;
            return {
                content: mergedContent,
                method: 'auto_merge',
                confidence: 0.7
            };
        } catch (error) {
            console.error('Auto-merge failed:', error);
            return null;
        }
    }

    /**
     * Disconnect from collaboration session
     */
    disconnect() {
        // Stop timers
        this.stopTimers();
        
        // Unsubscribe from real-time channels
        this.subscriptions.forEach(subscription => {
            subscription.unsubscribe();
        });
        this.subscriptions.clear();
        
        // Clear state
        this.isConnected = false;
        this.participants.clear();
        this.comments.clear();
        this.conflicts.clear();
        
        // Reset document state
        this.documentState = {
            content: '',
            version: 1,
            operations: [],
            pendingOperations: []
        };
        
        this.emit('disconnected');
    }

    /**
     * Get current collaboration statistics
     */
    getStats() {
        return {
            isConnected: this.isConnected,
            currentSession: this.currentSession?.session_id || null,
            participantCount: this.participants.size,
            commentCount: this.comments.size,
            conflictCount: this.conflicts.size,
            documentVersion: this.documentState.version,
            operationCount: this.documentState.operations.length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollaborationService;
} else if (typeof window !== 'undefined') {
    window.CollaborationService = CollaborationService;
}