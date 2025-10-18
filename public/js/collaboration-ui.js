/**
 * Collaboration UI Components for CMS Enhancement System
 * 
 * This module provides comprehensive UI components for real-time collaboration including:
 * - Real-time collaborative editor with live cursors
 * - Inline commenting system with threading
 * - Collaboration status indicators and user presence
 * - Conflict resolution interface for simultaneous edits
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10
 */

class CollaborationUI {
    constructor(options = {}) {
        this.options = {
            containerSelector: '#collaboration-container',
            editorSelector: '#case-study-editor',
            enableComments: true,
            enablePresence: true,
            enableConflictResolution: true,
            autoSave: true,
            theme: 'light',
            ...options
        };
        
        // Core components
        this.collaborationService = null;
        this.currentSession = null;
        this.currentUser = null;
        
        // UI state
        this.isCollaborating = false;
        this.participants = new Map();
        this.comments = new Map();
        this.cursors = new Map();
        this.conflicts = new Map();
        
        // UI elements
        this.container = null;
        this.editor = null;
        this.toolbar = null;
        this.sidebar = null;
        this.statusBar = null;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Initialize UI
        this.init();
    }

    /**
     * Initialize the collaboration UI
     */
    async init() {
        try {
            // Find container and editor elements
            this.container = document.querySelector(this.options.containerSelector);
            this.editor = document.querySelector(this.options.editorSelector);
            
            if (!this.container) {
                throw new Error(`Container not found: ${this.options.containerSelector}`);
            }
            
            // Initialize collaboration service
            if (typeof CollaborationService !== 'undefined' && window.supabase) {
                this.collaborationService = new CollaborationService(window.supabase, {
                    enableComments: this.options.enableComments,
                    enableCursorTracking: this.options.enablePresence
                });
                
                this.setupServiceEventListeners();
            }
            
            // Create UI components
            this.createToolbar();
            this.createSidebar();
            this.createStatusBar();
            this.createCursorOverlay();
            this.createCommentSystem();
            this.createConflictResolution();
            
            // Setup editor integration
            if (this.editor) {
                this.setupEditorIntegration();
            }
            
            // Apply theme
            this.applyTheme();
            
            console.log('Collaboration UI initialized');
            
        } catch (error) {
            console.error('Failed to initialize collaboration UI:', error);
            this.showError('Failed to initialize collaboration features');
        }
    }

    /**
     * Create collaboration toolbar
     */
    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'collaboration-toolbar';
        toolbar.innerHTML = `
            <div class="collaboration-toolbar-section">
                <button id="collab-start-session" class="collab-btn collab-btn-primary" title="Start Collaboration">
                    <i class="fas fa-users"></i> Start Collaboration
                </button>
                <button id="collab-join-session" class="collab-btn" title="Join Session">
                    <i class="fas fa-sign-in-alt"></i> Join Session
                </button>
                <button id="collab-leave-session" class="collab-btn" title="Leave Session" style="display: none;">
                    <i class="fas fa-sign-out-alt"></i> Leave
                </button>
            </div>
            
            <div class="collaboration-toolbar-section">
                <div class="collab-session-info" style="display: none;">
                    <span class="collab-session-name"></span>
                    <span class="collab-participant-count">0 participants</span>
                </div>
            </div>
            
            <div class="collaboration-toolbar-section">
                <button id="collab-toggle-comments" class="collab-btn" title="Toggle Comments">
                    <i class="fas fa-comments"></i>
                </button>
                <button id="collab-toggle-presence" class="collab-btn" title="Toggle Presence">
                    <i class="fas fa-eye"></i>
                </button>
                <button id="collab-share-session" class="collab-btn" title="Share Session" style="display: none;">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `;
        
        // Insert toolbar at the top of container
        this.container.insertBefore(toolbar, this.container.firstChild);
        this.toolbar = toolbar;
        
        // Setup toolbar event listeners
        this.setupToolbarEvents();
    }

    /**
     * Create collaboration sidebar
     */
    createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'collaboration-sidebar';
        sidebar.innerHTML = `
            <div class="collab-sidebar-header">
                <h3>Collaboration</h3>
                <button class="collab-sidebar-close" title="Close Sidebar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="collab-sidebar-content">
                <!-- Participants Section -->
                <div class="collab-section">
                    <h4>Participants</h4>
                    <div class="collab-participants-list" id="collab-participants">
                        <div class="collab-no-participants">No active participants</div>
                    </div>
                </div>
                
                <!-- Comments Section -->
                <div class="collab-section" id="collab-comments-section">
                    <h4>Comments</h4>
                    <div class="collab-comments-controls">
                        <button class="collab-btn collab-btn-sm" id="collab-add-comment">
                            <i class="fas fa-plus"></i> Add Comment
                        </button>
                        <select id="collab-comment-filter" class="collab-select">
                            <option value="all">All Comments</option>
                            <option value="unresolved">Unresolved</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                    <div class="collab-comments-list" id="collab-comments">
                        <div class="collab-no-comments">No comments yet</div>
                    </div>
                </div>
                
                <!-- Session Info Section -->
                <div class="collab-section" id="collab-session-details" style="display: none;">
                    <h4>Session Details</h4>
                    <div class="collab-session-meta">
                        <div class="collab-meta-item">
                            <label>Session ID:</label>
                            <span class="collab-session-id"></span>
                            <button class="collab-copy-btn" title="Copy Session ID">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <div class="collab-meta-item">
                            <label>Owner:</label>
                            <span class="collab-session-owner"></span>
                        </div>
                        <div class="collab-meta-item">
                            <label>Created:</label>
                            <span class="collab-session-created"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(sidebar);
        this.sidebar = sidebar;
        
        // Setup sidebar events
        this.setupSidebarEvents();
    }

    /**
     * Create status bar
     */
    createStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.className = 'collaboration-status-bar';
        statusBar.innerHTML = `
            <div class="collab-status-section">
                <div class="collab-connection-status" id="collab-connection-status">
                    <i class="fas fa-circle collab-status-offline"></i>
                    <span>Offline</span>
                </div>
            </div>
            
            <div class="collab-status-section">
                <div class="collab-auto-save-status" id="collab-auto-save-status" style="display: none;">
                    <i class="fas fa-save"></i>
                    <span>Saved</span>
                </div>
            </div>
            
            <div class="collab-status-section">
                <div class="collab-conflicts-indicator" id="collab-conflicts-indicator" style="display: none;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Conflicts detected</span>
                </div>
            </div>
        `;
        
        this.container.appendChild(statusBar);
        this.statusBar = statusBar;
    }

    /**
     * Create cursor overlay for live cursors
     */
    createCursorOverlay() {
        if (!this.editor) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'collaboration-cursor-overlay';
        overlay.id = 'collab-cursor-overlay';
        
        // Position overlay relative to editor
        const editorRect = this.editor.getBoundingClientRect();
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '10';
        
        // Create wrapper if editor doesn't have relative positioning
        if (getComputedStyle(this.editor.parentElement).position === 'static') {
            this.editor.parentElement.style.position = 'relative';
        }
        
        this.editor.parentElement.appendChild(overlay);
        this.cursorOverlay = overlay;
    }

    /**
     * Create comment system UI
     */
    createCommentSystem() {
        // Create comment modal
        const modal = document.createElement('div');
        modal.className = 'collab-modal';
        modal.id = 'collab-comment-modal';
        modal.innerHTML = `
            <div class="collab-modal-content">
                <div class="collab-modal-header">
                    <h3>Add Comment</h3>
                    <button class="collab-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="collab-modal-body">
                    <div class="collab-form-group">
                        <label>Comment Type:</label>
                        <select id="collab-comment-type" class="collab-select">
                            <option value="comment">Comment</option>
                            <option value="suggestion">Suggestion</option>
                            <option value="question">Question</option>
                            <option value="approval">Approval</option>
                        </select>
                    </div>
                    <div class="collab-form-group">
                        <label>Comment:</label>
                        <textarea id="collab-comment-text" class="collab-textarea" 
                                  placeholder="Enter your comment..." rows="4"></textarea>
                    </div>
                    <div class="collab-form-group" id="collab-mention-group" style="display: none;">
                        <label>Mention Users:</label>
                        <div class="collab-mention-list" id="collab-mention-list"></div>
                    </div>
                </div>
                <div class="collab-modal-footer">
                    <button class="collab-btn" id="collab-cancel-comment">Cancel</button>
                    <button class="collab-btn collab-btn-primary" id="collab-submit-comment">Add Comment</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.commentModal = modal;
        
        // Setup comment modal events
        this.setupCommentModalEvents();
    }

    /**
     * Create conflict resolution UI
     */
    createConflictResolution() {
        const conflictPanel = document.createElement('div');
        conflictPanel.className = 'collab-conflict-panel';
        conflictPanel.id = 'collab-conflict-panel';
        conflictPanel.style.display = 'none';
        conflictPanel.innerHTML = `
            <div class="collab-conflict-header">
                <h4><i class="fas fa-exclamation-triangle"></i> Editing Conflict Detected</h4>
                <button class="collab-conflict-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="collab-conflict-content">
                <p>Multiple users are editing the same content. Choose how to resolve:</p>
                <div class="collab-conflict-options">
                    <div class="collab-conflict-option">
                        <h5>Your Version</h5>
                        <div class="collab-conflict-preview" id="collab-conflict-local"></div>
                        <button class="collab-btn" id="collab-use-local">Use My Version</button>
                    </div>
                    <div class="collab-conflict-option">
                        <h5>Remote Version</h5>
                        <div class="collab-conflict-preview" id="collab-conflict-remote"></div>
                        <button class="collab-btn" id="collab-use-remote">Use Remote Version</button>
                    </div>
                    <div class="collab-conflict-option">
                        <h5>Merged Version</h5>
                        <div class="collab-conflict-preview" id="collab-conflict-merged"></div>
                        <button class="collab-btn collab-btn-primary" id="collab-use-merged">Use Merged Version</button>
                    </div>
                </div>
            </div>
        `;
        
        this.container.appendChild(conflictPanel);
        this.conflictPanel = conflictPanel;
        
        // Setup conflict resolution events
        this.setupConflictEvents();
    }

    /**
     * Setup toolbar event listeners
     */
    setupToolbarEvents() {
        // Start collaboration session
        this.toolbar.querySelector('#collab-start-session').addEventListener('click', () => {
            this.showStartSessionDialog();
        });
        
        // Join collaboration session
        this.toolbar.querySelector('#collab-join-session').addEventListener('click', () => {
            this.showJoinSessionDialog();
        });
        
        // Leave collaboration session
        this.toolbar.querySelector('#collab-leave-session').addEventListener('click', () => {
            this.leaveSession();
        });
        
        // Toggle comments
        this.toolbar.querySelector('#collab-toggle-comments').addEventListener('click', () => {
            this.toggleComments();
        });
        
        // Toggle presence
        this.toolbar.querySelector('#collab-toggle-presence').addEventListener('click', () => {
            this.togglePresence();
        });
        
        // Share session
        this.toolbar.querySelector('#collab-share-session').addEventListener('click', () => {
            this.shareSession();
        });
    }

    /**
     * Setup sidebar event listeners
     */
    setupSidebarEvents() {
        // Close sidebar
        this.sidebar.querySelector('.collab-sidebar-close').addEventListener('click', () => {
            this.sidebar.classList.remove('collab-sidebar-open');
        });
        
        // Add comment button
        this.sidebar.querySelector('#collab-add-comment').addEventListener('click', () => {
            this.showCommentModal();
        });
        
        // Comment filter
        this.sidebar.querySelector('#collab-comment-filter').addEventListener('change', (e) => {
            this.filterComments(e.target.value);
        });
        
        // Copy session ID
        this.sidebar.querySelector('.collab-copy-btn').addEventListener('click', () => {
            this.copySessionId();
        });
    }

    /**
     * Setup comment modal event listeners
     */
    setupCommentModalEvents() {
        // Close modal
        this.commentModal.querySelector('.collab-modal-close').addEventListener('click', () => {
            this.hideCommentModal();
        });
        
        // Cancel comment
        this.commentModal.querySelector('#collab-cancel-comment').addEventListener('click', () => {
            this.hideCommentModal();
        });
        
        // Submit comment
        this.commentModal.querySelector('#collab-submit-comment').addEventListener('click', () => {
            this.submitComment();
        });
        
        // Close modal on backdrop click
        this.commentModal.addEventListener('click', (e) => {
            if (e.target === this.commentModal) {
                this.hideCommentModal();
            }
        });
    }

    /**
     * Setup conflict resolution event listeners
     */
    setupConflictEvents() {
        // Close conflict panel
        this.conflictPanel.querySelector('.collab-conflict-close').addEventListener('click', () => {
            this.hideConflictPanel();
        });
        
        // Use local version
        this.conflictPanel.querySelector('#collab-use-local').addEventListener('click', () => {
            this.resolveConflict('local');
        });
        
        // Use remote version
        this.conflictPanel.querySelector('#collab-use-remote').addEventListener('click', () => {
            this.resolveConflict('remote');
        });
        
        // Use merged version
        this.conflictPanel.querySelector('#collab-use-merged').addEventListener('click', () => {
            this.resolveConflict('merged');
        });
    }

    /**
     * Setup collaboration service event listeners
     */
    setupServiceEventListeners() {
        if (!this.collaborationService) return;
        
        // Session events
        this.collaborationService.on('session:joined', (session) => {
            this.handleSessionJoined(session);
        });
        
        this.collaborationService.on('session:left', (session) => {
            this.handleSessionLeft(session);
        });
        
        // User events
        this.collaborationService.on('user:joined', (data) => {
            this.handleUserJoined(data);
        });
        
        this.collaborationService.on('user:left', (data) => {
            this.handleUserLeft(data);
        });
        
        // Editing events
        this.collaborationService.on('remote:edit', (data) => {
            this.handleRemoteEdit(data);
        });
        
        this.collaborationService.on('remote:cursor', (data) => {
            this.handleRemoteCursor(data);
        });
        
        // Comment events
        this.collaborationService.on('comment:added', (comment) => {
            this.handleCommentAdded(comment);
        });
        
        this.collaborationService.on('comment:resolved', (comment) => {
            this.handleCommentResolved(comment);
        });
        
        // Conflict events
        this.collaborationService.on('conflict:detected', (conflict) => {
            this.handleConflictDetected(conflict);
        });
        
        // Presence events
        this.collaborationService.on('presence:changed', (data) => {
            this.handlePresenceChanged(data);
        });
    }

    /**
     * Setup editor integration
     */
    setupEditorIntegration() {
        if (!this.editor) return;
        
        // Track editor changes
        this.editor.addEventListener('input', (e) => {
            if (this.isCollaborating && this.collaborationService) {
                this.handleEditorInput(e);
            }
        });
        
        // Track cursor movements
        this.editor.addEventListener('selectionchange', () => {
            if (this.isCollaborating && this.collaborationService) {
                this.handleCursorChange();
            }
        });
        
        // Track focus/blur for presence
        this.editor.addEventListener('focus', () => {
            if (this.isCollaborating && this.collaborationService) {
                this.collaborationService.updatePresence('active');
            }
        });
        
        this.editor.addEventListener('blur', () => {
            if (this.isCollaborating && this.collaborationService) {
                this.collaborationService.updatePresence('idle');
            }
        });
    }

    /**
     * Session Management Methods
     */

    async showStartSessionDialog() {
        const sessionName = prompt('Enter session name:', 'Collaboration Session');
        if (!sessionName) return;
        
        const contentId = this.getContentId();
        const contentTitle = this.getContentTitle();
        
        try {
            const session = await this.collaborationService.createSession({
                name: sessionName,
                contentType: 'case_study',
                contentId: contentId,
                contentTitle: contentTitle,
                isPublic: false,
                maxParticipants: 10
            });
            
            this.showSuccess(`Session "${sessionName}" created successfully!`);
            
        } catch (error) {
            this.showError(`Failed to create session: ${error.message}`);
        }
    }

    async showJoinSessionDialog() {
        const sessionId = prompt('Enter session ID to join:');
        if (!sessionId) return;
        
        try {
            await this.collaborationService.joinSession(sessionId);
            
        } catch (error) {
            this.showError(`Failed to join session: ${error.message}`);
        }
    }

    async leaveSession() {
        if (!this.currentSession) return;
        
        try {
            await this.collaborationService.leaveSession();
            
        } catch (error) {
            this.showError(`Failed to leave session: ${error.message}`);
        }
    }

    /**
     * Event Handlers
     */

    handleSessionJoined(session) {
        this.currentSession = session;
        this.isCollaborating = true;
        
        // Update UI
        this.updateSessionUI(session);
        this.showSidebar();
        this.updateConnectionStatus('connected');
        
        // Load participants and comments
        this.loadParticipants();
        this.loadComments();
        
        this.showSuccess(`Joined collaboration session: ${session.session_name}`);
    }

    handleSessionLeft(session) {
        this.currentSession = null;
        this.isCollaborating = false;
        
        // Update UI
        this.updateSessionUI(null);
        this.hideSidebar();
        this.updateConnectionStatus('disconnected');
        
        // Clear participants and cursors
        this.clearParticipants();
        this.clearCursors();
        
        this.showInfo('Left collaboration session');
    }

    handleUserJoined(data) {
        this.loadParticipants();
        this.showInfo(`${data.userName || 'User'} joined the session`);
    }

    handleUserLeft(data) {
        this.loadParticipants();
        this.removeCursor(data.userId);
        this.showInfo(`${data.userName || 'User'} left the session`);
    }

    handleRemoteEdit(data) {
        if (!this.editor) return;
        
        // Apply remote edit to editor
        const { operation } = data;
        this.applyRemoteOperation(operation);
        
        // Show edit indicator
        this.showEditIndicator(data.userId);
    }

    handleRemoteCursor(data) {
        if (!this.options.enablePresence) return;
        
        this.updateCursor(data.userId, data.position, data.selection);
    }

    handleCommentAdded(comment) {
        this.addCommentToUI(comment);
        this.showInfo('New comment added');
    }

    handleCommentResolved(comment) {
        this.updateCommentInUI(comment);
        this.showInfo('Comment resolved');
    }

    handleConflictDetected(conflict) {
        this.showConflictPanel(conflict);
    }

    handlePresenceChanged(data) {
        this.updateParticipantPresence(data.userId, data.status);
    }

    /**
     * UI Update Methods
     */

    updateSessionUI(session) {
        const sessionInfo = this.toolbar.querySelector('.collab-session-info');
        const sessionName = this.toolbar.querySelector('.collab-session-name');
        const startBtn = this.toolbar.querySelector('#collab-start-session');
        const joinBtn = this.toolbar.querySelector('#collab-join-session');
        const leaveBtn = this.toolbar.querySelector('#collab-leave-session');
        const shareBtn = this.toolbar.querySelector('#collab-share-session');
        
        if (session) {
            sessionInfo.style.display = 'block';
            sessionName.textContent = session.session_name;
            startBtn.style.display = 'none';
            joinBtn.style.display = 'none';
            leaveBtn.style.display = 'inline-block';
            shareBtn.style.display = 'inline-block';
            
            // Update sidebar session details
            this.updateSidebarSessionInfo(session);
            
        } else {
            sessionInfo.style.display = 'none';
            startBtn.style.display = 'inline-block';
            joinBtn.style.display = 'inline-block';
            leaveBtn.style.display = 'none';
            shareBtn.style.display = 'none';
            
            // Hide sidebar session details
            this.sidebar.querySelector('#collab-session-details').style.display = 'none';
        }
    }

    updateSidebarSessionInfo(session) {
        const sessionDetails = this.sidebar.querySelector('#collab-session-details');
        sessionDetails.style.display = 'block';
        
        sessionDetails.querySelector('.collab-session-id').textContent = session.session_id;
        sessionDetails.querySelector('.collab-session-owner').textContent = session.owner_name || 'Unknown';
        sessionDetails.querySelector('.collab-session-created').textContent = 
            new Date(session.created_at).toLocaleString();
    }

    updateConnectionStatus(status) {
        const statusElement = this.statusBar.querySelector('#collab-connection-status');
        const icon = statusElement.querySelector('i');
        const text = statusElement.querySelector('span');
        
        icon.className = 'fas fa-circle';
        
        switch (status) {
            case 'connected':
                icon.classList.add('collab-status-online');
                text.textContent = 'Connected';
                break;
            case 'connecting':
                icon.classList.add('collab-status-connecting');
                text.textContent = 'Connecting...';
                break;
            case 'disconnected':
                icon.classList.add('collab-status-offline');
                text.textContent = 'Offline';
                break;
        }
    }

    /**
     * Utility Methods
     */

    getContentId() {
        // Try to get content ID from various sources
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || 
               document.querySelector('[data-case-study-id]')?.dataset.caseStudyId ||
               'default-content-id';
    }

    getContentTitle() {
        return document.title || 
               document.querySelector('h1')?.textContent ||
               'Untitled Content';
    }

    showSidebar() {
        this.sidebar.classList.add('collab-sidebar-open');
    }

    hideSidebar() {
        this.sidebar.classList.remove('collab-sidebar-open');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Create or update notification
        let notification = document.querySelector('.collab-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'collab-notification';
            document.body.appendChild(notification);
        }
        
        notification.className = `collab-notification collab-notification-${type}`;
        notification.textContent = message;
        notification.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    applyTheme() {
        this.container.classList.add(`collab-theme-${this.options.theme}`);
    }

    // Placeholder methods for features to be implemented
    async loadParticipants() {
        // Implementation will load and display participants
        console.log('Loading participants...');
    }

    async loadComments() {
        // Implementation will load and display comments
        console.log('Loading comments...');
    }

    clearParticipants() {
        const participantsList = this.sidebar.querySelector('#collab-participants');
        participantsList.innerHTML = '<div class="collab-no-participants">No active participants</div>';
    }

    clearCursors() {
        if (this.cursorOverlay) {
            this.cursorOverlay.innerHTML = '';
        }
        this.cursors.clear();
    }

    // Additional methods will be implemented in the next part...
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollaborationUI;
} else if (typeof window !== 'undefined') {
    window.CollaborationUI = CollaborationUI;
}    /**
   
  * Extended Methods for Collaboration UI
     */

    // Comment Management Methods
    showCommentModal(anchorData = null) {
        this.commentModal.style.display = 'flex';
        this.commentModal.querySelector('#collab-comment-text').focus();
        
        // Store anchor data for positioning
        this.currentCommentAnchor = anchorData;
    }

    hideCommentModal() {
        this.commentModal.style.display = 'none';
        this.commentModal.querySelector('#collab-comment-text').value = '';
        this.currentCommentAnchor = null;
    }

    async submitComment() {
        const text = this.commentModal.querySelector('#collab-comment-text').value.trim();
        const type = this.commentModal.querySelector('#collab-comment-type').value;
        
        if (!text) {
            this.showError('Please enter comment text');
            return;
        }
        
        try {
            const commentData = {
                text,
                commentType: type,
                anchorType: 'text',
                anchorData: this.currentCommentAnchor || { position: 0 },
                contextBefore: this.getContextBefore(),
                contextAfter: this.getContextAfter()
            };
            
            await this.collaborationService.addComment(commentData);
            this.hideCommentModal();
            this.showSuccess('Comment added successfully');
            
        } catch (error) {
            this.showError(`Failed to add comment: ${error.message}`);
        }
    }

    async loadComments() {
        if (!this.collaborationService || !this.currentSession) return;
        
        try {
            const comments = await this.collaborationService.getComments();
            this.displayComments(comments);
            
        } catch (error) {
            console.error('Failed to load comments:', error);
        }
    }

    displayComments(comments) {
        const commentsList = this.sidebar.querySelector('#collab-comments');
        commentsList.innerHTML = '';
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="collab-no-comments">No comments yet</div>';
            return;
        }
        
        comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            commentsList.appendChild(commentElement);
        });
    }

    createCommentElement(comment) {
        const element = document.createElement('div');
        element.className = `collab-comment ${comment.is_resolved ? 'resolved' : ''}`;
        element.dataset.commentId = comment.id;
        
        element.innerHTML = `
            <div class="collab-comment-header">
                <div>
                    <span class="collab-comment-author">${comment.user_profiles?.full_name || 'Unknown User'}</span>
                    <span class="collab-comment-type ${comment.comment_type}">${comment.comment_type}</span>
                </div>
                <span class="collab-comment-time">${this.formatTime(comment.created_at)}</span>
            </div>
            <div class="collab-comment-content">${this.escapeHtml(comment.comment_text)}</div>
            <div class="collab-comment-actions">
                <button class="collab-comment-action" onclick="collaborationUI.replyToComment('${comment.id}')">
                    <i class="fas fa-reply"></i> Reply
                </button>
                ${!comment.is_resolved ? `
                    <button class="collab-comment-action" onclick="collaborationUI.resolveComment('${comment.id}')">
                        <i class="fas fa-check"></i> Resolve
                    </button>
                ` : ''}
            </div>
            <div class="collab-comment-replies" id="replies-${comment.id}"></div>
        `;
        
        // Add replies if any
        if (comment.replies && comment.replies.length > 0) {
            const repliesContainer = element.querySelector(`#replies-${comment.id}`);
            comment.replies.forEach(reply => {
                const replyElement = this.createCommentElement(reply);
                replyElement.classList.add('collab-comment-reply');
                repliesContainer.appendChild(replyElement);
            });
        }
        
        return element;
    }

    async replyToComment(commentId) {
        const replyText = prompt('Enter your reply:');
        if (!replyText) return;
        
        try {
            await this.collaborationService.replyToComment(commentId, replyText);
            this.showSuccess('Reply added successfully');
            
        } catch (error) {
            this.showError(`Failed to add reply: ${error.message}`);
        }
    }

    async resolveComment(commentId) {
        try {
            await this.collaborationService.resolveComment(commentId);
            this.showSuccess('Comment resolved');
            
        } catch (error) {
            this.showError(`Failed to resolve comment: ${error.message}`);
        }
    }

    filterComments(filter) {
        const comments = this.sidebar.querySelectorAll('.collab-comment');
        
        comments.forEach(comment => {
            const isResolved = comment.classList.contains('resolved');
            
            switch (filter) {
                case 'resolved':
                    comment.style.display = isResolved ? 'block' : 'none';
                    break;
                case 'unresolved':
                    comment.style.display = !isResolved ? 'block' : 'none';
                    break;
                default:
                    comment.style.display = 'block';
            }
        });
    }

    // Participant Management Methods
    async loadParticipants() {
        if (!this.collaborationService || !this.currentSession) return;
        
        try {
            const participants = await this.collaborationService.getParticipants();
            this.displayParticipants(participants);
            this.updateParticipantCount(participants.length);
            
        } catch (error) {
            console.error('Failed to load participants:', error);
        }
    }

    displayParticipants(participants) {
        const participantsList = this.sidebar.querySelector('#collab-participants');
        participantsList.innerHTML = '';
        
        if (participants.length === 0) {
            participantsList.innerHTML = '<div class="collab-no-participants">No active participants</div>';
            return;
        }
        
        participants.forEach(participant => {
            const element = this.createParticipantElement(participant);
            participantsList.appendChild(element);
        });
    }

    createParticipantElement(participant) {
        const element = document.createElement('div');
        element.className = 'collab-participant';
        element.dataset.userId = participant.id;
        
        const initials = this.getInitials(participant.full_name || participant.email);
        const status = participant.presence?.status || 'offline';
        
        element.innerHTML = `
            <div class="collab-participant-avatar">${initials}</div>
            <div class="collab-participant-info">
                <div class="collab-participant-name">${participant.full_name || participant.email}</div>
                <div class="collab-participant-status">${this.formatStatus(status)}</div>
            </div>
            <div class="collab-participant-presence ${status}"></div>
        `;
        
        return element;
    }

    updateParticipantCount(count) {
        const countElement = this.toolbar.querySelector('.collab-participant-count');
        if (countElement) {
            countElement.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
        }
    }

    updateParticipantPresence(userId, status) {
        const participant = this.sidebar.querySelector(`[data-user-id="${userId}"]`);
        if (participant) {
            const presenceElement = participant.querySelector('.collab-participant-presence');
            const statusElement = participant.querySelector('.collab-participant-status');
            
            presenceElement.className = `collab-participant-presence ${status}`;
            statusElement.textContent = this.formatStatus(status);
        }
    }

    // Cursor Management Methods
    updateCursor(userId, position, selection = null) {
        if (!this.cursorOverlay || !this.options.enablePresence) return;
        
        let cursor = this.cursorOverlay.querySelector(`[data-user-id="${userId}"]`);
        
        if (!cursor) {
            cursor = this.createCursorElement(userId);
            this.cursorOverlay.appendChild(cursor);
        }
        
        // Calculate cursor position relative to editor
        const cursorPos = this.calculateCursorPosition(position);
        cursor.style.left = `${cursorPos.x}px`;
        cursor.style.top = `${cursorPos.y}px`;
        
        // Update selection if provided
        if (selection && selection.start !== selection.end) {
            this.updateSelection(userId, selection);
        }
        
        // Store cursor in map
        this.cursors.set(userId, { position, selection, element: cursor });
    }

    createCursorElement(userId) {
        const cursor = document.createElement('div');
        cursor.className = 'collab-cursor';
        cursor.dataset.userId = userId;
        cursor.dataset.user = this.getUserName(userId);
        
        return cursor;
    }

    removeCursor(userId) {
        const cursor = this.cursorOverlay?.querySelector(`[data-user-id="${userId}"]`);
        if (cursor) {
            cursor.remove();
        }
        this.cursors.delete(userId);
    }

    calculateCursorPosition(position) {
        if (!this.editor) return { x: 0, y: 0 };
        
        // Simple calculation - in a real implementation, this would be more sophisticated
        const lineHeight = 20; // Approximate line height
        const charWidth = 8; // Approximate character width
        
        const lines = this.editor.value.substring(0, position).split('\n');
        const line = lines.length - 1;
        const column = lines[lines.length - 1].length;
        
        return {
            x: column * charWidth,
            y: line * lineHeight
        };
    }

    // Editor Integration Methods
    handleEditorInput(event) {
        if (!this.collaborationService) return;
        
        // Detect the type of change and create operation
        const operation = this.detectOperation(event);
        if (operation) {
            this.collaborationService.applyOperation(operation);
        }
    }

    handleCursorChange() {
        if (!this.collaborationService || !this.editor) return;
        
        const position = this.editor.selectionStart;
        const selection = {
            start: this.editor.selectionStart,
            end: this.editor.selectionEnd
        };
        
        this.collaborationService.updateCursor(position, selection);
    }

    detectOperation(event) {
        // Simple operation detection - in a real implementation, this would be more sophisticated
        const position = this.editor.selectionStart;
        const inputType = event.inputType;
        
        switch (inputType) {
            case 'insertText':
                return {
                    type: 'insert',
                    position: position - event.data.length,
                    content: event.data,
                    length: event.data.length
                };
            case 'deleteContentBackward':
            case 'deleteContentForward':
                return {
                    type: 'delete',
                    position: position,
                    length: 1
                };
            default:
                return null;
        }
    }

    applyRemoteOperation(operation) {
        if (!this.editor) return;
        
        const currentValue = this.editor.value;
        let newValue;
        
        switch (operation.type) {
            case 'insert':
                newValue = currentValue.slice(0, operation.position) +
                          operation.content +
                          currentValue.slice(operation.position);
                break;
            case 'delete':
                newValue = currentValue.slice(0, operation.position) +
                          currentValue.slice(operation.position + operation.length);
                break;
            case 'replace':
                newValue = currentValue.slice(0, operation.position) +
                          operation.content +
                          currentValue.slice(operation.position + operation.length);
                break;
            default:
                return;
        }
        
        // Temporarily disable input handler to prevent recursion
        this.editor.removeEventListener('input', this.handleEditorInput);
        this.editor.value = newValue;
        this.editor.addEventListener('input', this.handleEditorInput.bind(this));
    }

    showEditIndicator(userId) {
        // Show a brief indicator that someone else is editing
        const indicator = document.createElement('div');
        indicator.className = 'collab-edit-indicator';
        indicator.textContent = `${this.getUserName(userId)} is editing...`;
        
        this.container.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }

    // Conflict Resolution Methods
    showConflictPanel(conflict) {
        this.conflictPanel.style.display = 'block';
        this.currentConflict = conflict;
        
        // Populate conflict previews
        this.conflictPanel.querySelector('#collab-conflict-local').textContent = 
            conflict.conflicting_content_1 || 'Your version';
        this.conflictPanel.querySelector('#collab-conflict-remote').textContent = 
            conflict.conflicting_content_2 || 'Remote version';
        this.conflictPanel.querySelector('#collab-conflict-merged').textContent = 
            this.generateMergedContent(conflict);
    }

    hideConflictPanel() {
        this.conflictPanel.style.display = 'none';
        this.currentConflict = null;
    }

    async resolveConflict(strategy) {
        if (!this.currentConflict) return;
        
        try {
            let resolvedContent;
            
            switch (strategy) {
                case 'local':
                    resolvedContent = this.currentConflict.conflicting_content_1;
                    break;
                case 'remote':
                    resolvedContent = this.currentConflict.conflicting_content_2;
                    break;
                case 'merged':
                    resolvedContent = this.generateMergedContent(this.currentConflict);
                    break;
            }
            
            // Apply resolution through collaboration service
            await this.collaborationService.resolveConflict(this.currentConflict.id, strategy, resolvedContent);
            
            this.hideConflictPanel();
            this.showSuccess('Conflict resolved successfully');
            
        } catch (error) {
            this.showError(`Failed to resolve conflict: ${error.message}`);
        }
    }

    generateMergedContent(conflict) {
        // Simple merge strategy - in a real implementation, this would be more sophisticated
        const content1 = conflict.conflicting_content_1 || '';
        const content2 = conflict.conflicting_content_2 || '';
        
        return `${content1}\n${content2}`;
    }

    // Utility Methods
    toggleComments() {
        const commentsSection = this.sidebar.querySelector('#collab-comments-section');
        const isVisible = commentsSection.style.display !== 'none';
        
        commentsSection.style.display = isVisible ? 'none' : 'block';
        
        const button = this.toolbar.querySelector('#collab-toggle-comments');
        button.classList.toggle('active', !isVisible);
    }

    togglePresence() {
        this.options.enablePresence = !this.options.enablePresence;
        
        const button = this.toolbar.querySelector('#collab-toggle-presence');
        button.classList.toggle('active', this.options.enablePresence);
        
        if (!this.options.enablePresence) {
            this.clearCursors();
        }
    }

    async shareSession() {
        if (!this.currentSession) return;
        
        const sessionUrl = `${window.location.origin}${window.location.pathname}?session=${this.currentSession.session_id}`;
        
        try {
            await navigator.clipboard.writeText(sessionUrl);
            this.showSuccess('Session URL copied to clipboard');
        } catch (error) {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = sessionUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showSuccess('Session URL copied to clipboard');
        }
    }

    copySessionId() {
        if (!this.currentSession) return;
        
        try {
            navigator.clipboard.writeText(this.currentSession.session_id);
            this.showSuccess('Session ID copied to clipboard');
        } catch (error) {
            this.showError('Failed to copy session ID');
        }
    }

    getContextBefore() {
        if (!this.editor) return '';
        
        const position = this.editor.selectionStart;
        const start = Math.max(0, position - 50);
        return this.editor.value.substring(start, position);
    }

    getContextAfter() {
        if (!this.editor) return '';
        
        const position = this.editor.selectionEnd;
        const end = Math.min(this.editor.value.length, position + 50);
        return this.editor.value.substring(position, end);
    }

    getInitials(name) {
        if (!name) return '?';
        
        return name.split(' ')
            .map(part => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    getUserName(userId) {
        // Try to get user name from participants
        for (const [id, participant] of this.participants) {
            if (id === userId) {
                return participant.full_name || participant.email || 'Unknown User';
            }
        }
        return 'Unknown User';
    }

    formatStatus(status) {
        const statusMap = {
            active: 'Active',
            idle: 'Idle',
            away: 'Away',
            offline: 'Offline'
        };
        return statusMap[status] || 'Unknown';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) { // Less than 1 day
            return `${Math.floor(diff / 3600000)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API Methods
    startCollaboration(sessionData) {
        return this.collaborationService?.createSession(sessionData);
    }

    joinCollaboration(sessionId) {
        return this.collaborationService?.joinSession(sessionId);
    }

    leaveCollaboration() {
        return this.collaborationService?.leaveSession();
    }

    addComment(commentData) {
        return this.collaborationService?.addComment(commentData);
    }

    getCollaborationStats() {
        return this.collaborationService?.getStats() || {};
    }

    // Cleanup method
    destroy() {
        // Remove event listeners
        this.eventHandlers.clear();
        
        // Disconnect from collaboration service
        if (this.collaborationService && this.isCollaborating) {
            this.collaborationService.leaveSession();
        }
        
        // Remove UI elements
        if (this.toolbar) this.toolbar.remove();
        if (this.sidebar) this.sidebar.remove();
        if (this.statusBar) this.statusBar.remove();
        if (this.cursorOverlay) this.cursorOverlay.remove();
        if (this.commentModal) this.commentModal.remove();
        if (this.conflictPanel) this.conflictPanel.remove();
        
        console.log('Collaboration UI destroyed');
    }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#collaboration-container');
    if (container) {
        window.collaborationUI = new CollaborationUI();
    }
});