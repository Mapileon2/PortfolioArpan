/**
 * Complete Version Control UI Components
 * Provides user interface components for version control functionality
 * 
 * Components:
 * - VersionHistoryPanel: Shows version history with timeline
 * - VersionComparisonModal: Side-by-side version comparison
 * - VersionRevertDialog: Confirmation dialog for version revert
 * - VersionCommentSystem: Comment and annotation system
 * - VersionStatsWidget: Version statistics display
 */

class VersionControlUI {
    constructor(versionService, containerId) {
        this.versionService = versionService;
        this.container = document.getElementById(containerId);
        this.currentCaseStudyId = null;
        this.versions = [];
        this.selectedVersions = [];
        this.revertVersionId = null;
        this.commentVersionId = null;
        
        if (!this.container) {
            console.error('❌ Version control container not found:', containerId);
            return;
        }
        
        this.init();
        console.log('🔄 VersionControlUI initialized');
    }

    /**
     * Initialize the version control UI
     */
    init() {
        this.container.innerHTML = this.getMainTemplate();
        this.attachEventListeners();
        this.loadStyles();
    }

    /**
     * Load version history for a case study
     * @param {string} caseStudyId - Case study ID
     */
    async loadVersionHistory(caseStudyId) {
        try {
            this.currentCaseStudyId = caseStudyId;
            this.showLoading('Loading version history...');
            
            const result = await this.versionService.getVersionHistory(caseStudyId, {
                limit: 50,
                includeComments: true
            });
            
            if (result.success) {
                this.versions = result.versions;
                this.renderVersionHistory();
                this.loadVersionStats();
            } else {
                this.showError('Failed to load version history: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error loading version history:', error);
            this.showError('Failed to load version history');
        }
    }

    /**
     * Render the version history timeline
     */
    renderVersionHistory() {
        const historyContainer = this.container.querySelector('.version-history-list');
        if (!historyContainer) return;

        if (this.versions.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-versions">
                    <div class="no-versions-icon">📝</div>
                    <h3>No Version History</h3>
                    <p>This case study doesn't have any versions yet. Versions are created automatically when you make changes.</p>
                </div>
            `;
            return;
        }

        const versionsHtml = this.versions.map(version => this.getVersionItemTemplate(version)).join('');
        historyContainer.innerHTML = `
            <div class="version-timeline">
                ${versionsHtml}
            </div>
        `;

        this.attachVersionItemListeners();
    }

    /**
     * Get template for a single version item
     */
    getVersionItemTemplate(version) {
        const isCurrentVersion = version.is_current;
        const author = version.user_profiles;
        const createdDate = new Date(version.created_at);
        const timeAgo = this.getTimeAgo(createdDate);
        const commentCount = version.version_comments?.length || 0;

        return `
            <div class="version-item ${isCurrentVersion ? 'current-version' : ''}" data-version-id="${version.id}">
                <div class="version-timeline-marker">
                    <div class="version-number">${version.version_number}</div>
                    ${isCurrentVersion ? '<div class="current-badge">Current</div>' : ''}
                </div>
                
                <div class="version-content">
                    <div class="version-header">
                        <div class="version-info">
                            <h4 class="version-title">
                                Version ${version.version_number}
                                ${isCurrentVersion ? '<span class="current-indicator">●</span>' : ''}
                            </h4>
                            <div class="version-meta">
                                <span class="version-author">
                                    ${author?.avatar_url ? `<img src="${author.avatar_url}" alt="${author.full_name}" class="author-avatar">` : ''}
                                    ${author?.full_name || 'Unknown Author'}
                                </span>
                                <span class="version-date" title="${createdDate.toLocaleString()}">${timeAgo}</span>
                                ${commentCount > 0 ? `<span class="comment-count">💬 ${commentCount}</span>` : ''}
                            </div>
                        </div>
                        
                        <div class="version-actions">
                            <button class="btn-icon" onclick="versionControlUI.viewVersion('${version.id}')" title="View Version">
                                👁️
                            </button>
                            <button class="btn-icon" onclick="versionControlUI.selectForComparison('${version.id}')" title="Select for Comparison">
                                🔍
                            </button>
                            ${!isCurrentVersion ? `
                                <button class="btn-icon" onclick="versionControlUI.revertToVersion('${version.id}')" title="Revert to This Version">
                                    ⏪
                                </button>
                            ` : ''}
                            <button class="btn-icon" onclick="versionControlUI.addComment('${version.id}')" title="Add Comment">
                                💬
                            </button>
                        </div>
                    </div>
                    
                    ${version.change_summary ? `
                        <div class="version-summary">
                            <strong>Changes:</strong> ${version.change_summary}
                        </div>
                    ` : ''}
                    
                    ${this.getVersionCommentsTemplate(version.version_comments || [])}
                </div>
            </div>
        `;
    }

    /**
     * Get template for version comments
     */
    getVersionCommentsTemplate(comments) {
        if (!comments || comments.length === 0) {
            return '';
        }

        const commentsHtml = comments.map(comment => {
            const author = comment.user_profiles;
            const createdDate = new Date(comment.created_at);
            const timeAgo = this.getTimeAgo(createdDate);

            return `
                <div class="version-comment">
                    <div class="comment-author">
                        ${author?.avatar_url ? `<img src="${author.avatar_url}" alt="${author.full_name}" class="comment-avatar">` : ''}
                        <span class="comment-author-name">${author?.full_name || 'Unknown User'}</span>
                        <span class="comment-date">${timeAgo}</span>
                    </div>
                    <div class="comment-text">${this.escapeHtml(comment.comment)}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="version-comments-list" id="comments-${comments[0].version_id}" style="display: none;">
                ${commentsHtml}
            </div>
        `;
    }

    /**
     * Get main template for version control UI
     */
    getMainTemplate() {
        return `
            <div class="version-control-container">
                <div class="version-control-header">
                    <h3>Version History</h3>
                    <div class="version-control-actions">
                        <button class="btn-primary" onclick="versionControlUI.createManualVersion()">
                            📝 Create Version
                        </button>
                        <button class="btn-secondary" onclick="versionControlUI.showVersionStats()">
                            📊 Statistics
                        </button>
                    </div>
                </div>
                
                <div class="version-control-content">
                    <div class="version-history-list">
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <p>Loading version history...</p>
                        </div>
                    </div>
                </div>
                
                <div class="version-comparison-selected" id="comparison-selected" style="display: none;">
                    <div class="comparison-header">
                        <h4>Selected for Comparison</h4>
                        <button class="btn-text" onclick="versionControlUI.clearComparison()">Clear</button>
                    </div>
                    <div class="comparison-versions" id="comparison-versions"></div>
                    <button class="btn-primary" onclick="versionControlUI.compareSelectedVersions()" id="compare-btn" disabled>
                        Compare Versions
                    </button>
                </div>
            </div>
            
            <!-- Version Comparison Modal -->
            <div class="modal" id="version-comparison-modal" style="display: none;">
                <div class="modal-content version-comparison-content">
                    <div class="modal-header">
                        <h3>Version Comparison</h3>
                        <button class="modal-close" onclick="versionControlUI.closeComparisonModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="comparison-modal-body">
                        <!-- Comparison content will be loaded here -->
                    </div>
                </div>
            </div>
            
            <!-- Version Revert Modal -->
            <div class="modal" id="version-revert-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Revert to Version</h3>
                        <button class="modal-close" onclick="versionControlUI.closeRevertModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="revert-warning">
                            ⚠️ <strong>Warning:</strong> This will revert your case study to the selected version. 
                            All changes made after this version will be lost. A new version will be created 
                            to preserve the current state before reverting.
                        </div>
                        <div class="revert-version-info" id="revert-version-info">
                            <!-- Version info will be loaded here -->
                        </div>
                        <div class="form-group">
                            <label for="revert-reason">Reason for revert (optional):</label>
                            <textarea id="revert-reason" placeholder="Explain why you're reverting to this version..."></textarea>
                        </div>
                        <div class="modal-actions">
                            <button class="btn-secondary" onclick="versionControlUI.closeRevertModal()">Cancel</button>
                            <button class="btn-danger" onclick="versionControlUI.confirmRevert()" id="confirm-revert-btn">
                                Revert to Version
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Add Comment Modal -->
            <div class="modal" id="add-comment-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Version Comment</h3>
                        <button class="modal-close" onclick="versionControlUI.closeCommentModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="version-comment">Comment:</label>
                            <textarea id="version-comment" placeholder="Add your comment about this version..."></textarea>
                        </div>
                        <div class="modal-actions">
                            <button class="btn-secondary" onclick="versionControlUI.closeCommentModal()">Cancel</button>
                            <button class="btn-primary" onclick="versionControlUI.submitComment()" id="submit-comment-btn">
                                Add Comment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Version Stats Modal -->
            <div class="modal" id="version-stats-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Version Statistics</h3>
                        <button class="modal-close" onclick="versionControlUI.closeStatsModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="version-stats-content">
                        <!-- Stats content will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Attach event listeners to version items
     */
    attachVersionItemListeners() {
        // Add click handlers for version items
        const versionItems = this.container.querySelectorAll('.version-item');
        versionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.version-actions')) {
                    const versionId = item.dataset.versionId;
                    this.selectForComparison(versionId);
                }
            });
        });
    }

    /**
     * Select version for comparison
     */
    selectForComparison(versionId) {
        if (this.selectedVersions.includes(versionId)) {
            this.selectedVersions = this.selectedVersions.filter(id => id !== versionId);
        } else if (this.selectedVersions.length < 2) {
            this.selectedVersions.push(versionId);
        } else {
            // Replace the first selected version
            this.selectedVersions[0] = this.selectedVersions[1];
            this.selectedVersions[1] = versionId;
        }

        this.updateComparisonUI();
    }

    /**
     * Update comparison UI
     */
    updateComparisonUI() {
        const comparisonContainer = document.getElementById('comparison-selected');
        const versionsContainer = document.getElementById('comparison-versions');
        const compareBtn = document.getElementById('compare-btn');

        if (this.selectedVersions.length === 0) {
            comparisonContainer.style.display = 'none';
            return;
        }

        comparisonContainer.style.display = 'block';
        
        const selectedVersionsHtml = this.selectedVersions.map(versionId => {
            const version = this.versions.find(v => v.id === versionId);
            return version ? `
                <div class="selected-version">
                    <span>Version ${version.version_number}</span>
                    <button class="btn-icon" onclick="versionControlUI.removeFromComparison('${versionId}')">&times;</button>
                </div>
            ` : '';
        }).join('');

        versionsContainer.innerHTML = selectedVersionsHtml;
        compareBtn.disabled = this.selectedVersions.length !== 2;
    }

    /**
     * Remove version from comparison
     */
    removeFromComparison(versionId) {
        this.selectedVersions = this.selectedVersions.filter(id => id !== versionId);
        this.updateComparisonUI();
    }

    /**
     * Clear comparison selection
     */
    clearComparison() {
        this.selectedVersions = [];
        this.updateComparisonUI();
    }

    /**
     * Compare selected versions
     */
    async compareSelectedVersions() {
        if (this.selectedVersions.length !== 2) {
            this.showError('Please select exactly 2 versions to compare');
            return;
        }

        try {
            this.showLoading('Comparing versions...');
            
            const result = await this.versionService.compareVersions(
                this.selectedVersions[0], 
                this.selectedVersions[1]
            );
            
            if (result.success) {
                this.showComparisonModal(result.comparison);
            } else {
                this.showError('Failed to compare versions: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error comparing versions:', error);
            this.showError('Failed to compare versions');
        }
    }

    /**
     * Show comparison modal
     */
    showComparisonModal(comparison) {
        const modal = document.getElementById('version-comparison-modal');
        const modalBody = document.getElementById('comparison-modal-body');
        
        modalBody.innerHTML = this.getComparisonTemplate(comparison);
        modal.style.display = 'block';
    }

    /**
     * Get comparison template
     */
    getComparisonTemplate(comparison) {
        const { version1, version2, diff, stats } = comparison;
        
        return `
            <div class="comparison-header-info">
                <div class="comparison-version">
                    <h4>Version ${version1.version_number}</h4>
                    <div class="version-meta">
                        <span>By ${version1.author?.full_name || 'Unknown'}</span>
                        <span>${new Date(version1.created_at).toLocaleString()}</span>
                    </div>
                    ${version1.change_summary ? `<p class="change-summary">${version1.change_summary}</p>` : ''}
                </div>
                
                <div class="comparison-stats">
                    <div class="stat-item">
                        <span class="stat-value">${stats.totalChanges}</span>
                        <span class="stat-label">Total Changes</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.changePercentage}%</span>
                        <span class="stat-label">Changed</span>
                    </div>
                </div>
                
                <div class="comparison-version">
                    <h4>Version ${version2.version_number}</h4>
                    <div class="version-meta">
                        <span>By ${version2.author?.full_name || 'Unknown'}</span>
                        <span>${new Date(version2.created_at).toLocaleString()}</span>
                    </div>
                    ${version2.change_summary ? `<p class="change-summary">${version2.change_summary}</p>` : ''}
                </div>
            </div>
            
            <div class="comparison-diff">
                <h4>Changes</h4>
                
                ${diff.added.length > 0 ? `
                    <div class="diff-section added">
                        <h5>Added (${diff.added.length})</h5>
                        ${diff.added.map(item => `
                            <div class="diff-item">
                                <strong>${item.field}:</strong>
                                <div class="diff-content">${this.formatDiffContent(item.content)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${diff.removed.length > 0 ? `
                    <div class="diff-section removed">
                        <h5>Removed (${diff.removed.length})</h5>
                        ${diff.removed.map(item => `
                            <div class="diff-item">
                                <strong>${item.field}:</strong>
                                <div class="diff-content">${this.formatDiffContent(item.content)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${diff.modified.length > 0 ? `
                    <div class="diff-section modified">
                        <h5>Modified (${diff.modified.length})</h5>
                        ${diff.modified.map(item => `
                            <div class="diff-item">
                                <strong>${item.field}:</strong>
                                <div class="diff-old">${this.formatDiffContent(item.old)}</div>
                                <div class="diff-arrow">→</div>
                                <div class="diff-new">${this.formatDiffContent(item.new)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${diff.unchanged.length > 0 ? `
                    <div class="diff-section unchanged">
                        <h5>Unchanged (${diff.unchanged.length})</h5>
                        <div class="unchanged-list">
                            ${diff.unchanged.map(field => `<span class="unchanged-field">${field}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Format diff content for display
     */
    formatDiffContent(content) {
        if (typeof content === 'string') {
            return this.escapeHtml(content.length > 200 ? content.substring(0, 200) + '...' : content);
        }
        return this.escapeHtml(JSON.stringify(content, null, 2).substring(0, 200) + '...');
    }

    /**
     * View specific version
     */
    async viewVersion(versionId) {
        try {
            const version = this.versions.find(v => v.id === versionId);
            if (!version) {
                this.showError('Version not found');
                return;
            }

            // Create a preview modal or navigate to version view
            this.showVersionPreview(version);
        } catch (error) {
            console.error('❌ Error viewing version:', error);
            this.showError('Failed to view version');
        }
    }

    /**
     * Show version preview
     */
    showVersionPreview(version) {
        // This would open a modal or new window showing the version content
        console.log('📖 Viewing version:', version);
        // Implementation depends on your case study display system
        alert(`Viewing Version ${version.version_number}\n\nThis would open a preview of the version content.`);
    }

    /**
     * Revert to version
     */
    async revertToVersion(versionId) {
        try {
            const version = this.versions.find(v => v.id === versionId);
            if (!version) {
                this.showError('Version not found');
                return;
            }

            this.showRevertModal(version);
        } catch (error) {
            console.error('❌ Error preparing revert:', error);
            this.showError('Failed to prepare version revert');
        }
    }

    /**
     * Show revert modal
     */
    showRevertModal(version) {
        const modal = document.getElementById('version-revert-modal');
        const versionInfo = document.getElementById('revert-version-info');
        
        versionInfo.innerHTML = `
            <div class="revert-version-details">
                <h4>Version ${version.version_number}</h4>
                <div class="version-meta">
                    <span>Created by ${version.user_profiles?.full_name || 'Unknown'}</span>
                    <span>on ${new Date(version.created_at).toLocaleString()}</span>
                </div>
                ${version.change_summary ? `<p><strong>Changes:</strong> ${version.change_summary}</p>` : ''}
            </div>
        `;
        
        this.revertVersionId = version.id;
        modal.style.display = 'block';
    }

    /**
     * Confirm revert
     */
    async confirmRevert() {
        if (!this.revertVersionId) {
            this.showError('No version selected for revert');
            return;
        }

        try {
            const revertReason = document.getElementById('revert-reason').value;
            const confirmBtn = document.getElementById('confirm-revert-btn');
            
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Reverting...';
            
            const result = await this.versionService.revertToVersion(
                this.currentCaseStudyId,
                this.revertVersionId,
                revertReason
            );
            
            if (result.success) {
                this.showSuccess(`Successfully reverted to version ${result.revertedToVersion}`);
                this.closeRevertModal();
                this.loadVersionHistory(this.currentCaseStudyId); // Reload history
                
                // Trigger case study reload if callback is provided
                if (this.onRevert) {
                    this.onRevert(result);
                }
            } else {
                this.showError('Failed to revert: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error reverting version:', error);
            this.showError('Failed to revert to version');
        } finally {
            const confirmBtn = document.getElementById('confirm-revert-btn');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Revert to Version';
        }
    }

    /**
     * Add comment to version
     */
    async addComment(versionId) {
        this.commentVersionId = versionId;
        const modal = document.getElementById('add-comment-modal');
        modal.style.display = 'block';
        
        // Focus on comment textarea
        setTimeout(() => {
            document.getElementById('version-comment').focus();
        }, 100);
    }

    /**
     * Submit comment
     */
    async submitComment() {
        if (!this.commentVersionId) {
            this.showError('No version selected for comment');
            return;
        }

        try {
            const comment = document.getElementById('version-comment').value.trim();
            if (!comment) {
                this.showError('Please enter a comment');
                return;
            }

            const submitBtn = document.getElementById('submit-comment-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Adding...';
            
            const result = await this.versionService.addVersionComment(this.commentVersionId, comment);
            
            if (result.success) {
                this.showSuccess('Comment added successfully');
                this.closeCommentModal();
                this.loadVersionHistory(this.currentCaseStudyId); // Reload to show new comment
            } else {
                this.showError('Failed to add comment: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error adding comment:', error);
            this.showError('Failed to add comment');
        } finally {
            const submitBtn = document.getElementById('submit-comment-btn');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Comment';
        }
    }

    /**
     * Toggle comments visibility
     */
    toggleComments(versionId) {
        const commentsContainer = document.getElementById(`comments-${versionId}`);
        if (commentsContainer) {
            commentsContainer.style.display = 
                commentsContainer.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Create manual version
     */
    async createManualVersion() {
        try {
            // This would typically get the current case study content
            // and create a version with it
            const changeSummary = prompt('Enter a description for this version (optional):');
            if (changeSummary === null) return; // User cancelled
            
            // You would need to implement getting current content
            // const currentContent = await this.getCurrentCaseStudyContent();
            
            this.showInfo('Manual version creation would be implemented here');
        } catch (error) {
            console.error('❌ Error creating manual version:', error);
            this.showError('Failed to create manual version');
        }
    }

    /**
     * Show version statistics
     */
    async showVersionStats() {
        if (!this.currentCaseStudyId) {
            this.showError('No case study selected');
            return;
        }

        try {
            this.showLoading('Loading version statistics...');
            
            const result = await this.versionService.getVersionStats(this.currentCaseStudyId);
            
            if (result.success) {
                this.showStatsModal(result.stats);
            } else {
                this.showError('Failed to load statistics: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error loading version stats:', error);
            this.showError('Failed to load version statistics');
        }
    }

    /**
     * Show stats modal
     */
    showStatsModal(stats) {
        const modal = document.getElementById('version-stats-modal');
        const content = document.getElementById('version-stats-content');
        
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.total_versions || 0}</div>
                    <div class="stat-label">Total Versions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.unique_authors || 0}</div>
                    <div class="stat-label">Contributors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.days_since_first_version || 0}</div>
                    <div class="stat-label">Days Since First Version</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.average_versions_per_day || '0.0'}</div>
                    <div class="stat-label">Avg Versions/Day</div>
                </div>
            </div>
            
            ${stats.first_version_date ? `
                <div class="stats-timeline">
                    <h4>Timeline</h4>
                    <div class="timeline-item">
                        <strong>First Version:</strong> ${new Date(stats.first_version_date).toLocaleString()}
                    </div>
                    ${stats.last_version_date ? `
                        <div class="timeline-item">
                            <strong>Latest Version:</strong> ${new Date(stats.last_version_date).toLocaleString()}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        `;
        
        modal.style.display = 'block';
    }

    /**
     * Load version statistics
     */
    async loadVersionStats() {
        if (!this.currentCaseStudyId) return;

        try {
            const result = await this.versionService.getVersionStats(this.currentCaseStudyId);
            if (result.success) {
                this.updateStatsDisplay(result.stats);
            }
        } catch (error) {
            console.warn('⚠️ Could not load version stats:', error);
        }
    }

    /**
     * Update stats display in header
     */
    updateStatsDisplay(stats) {
        const header = this.container.querySelector('.version-control-header h3');
        if (header && stats.total_versions) {
            header.textContent = `Version History (${stats.total_versions})`;
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Reset modal state
        this.revertVersionId = null;
        this.commentVersionId = null;
        
        // Clear form inputs
        const revertReason = document.getElementById('revert-reason');
        const versionComment = document.getElementById('version-comment');
        if (revertReason) revertReason.value = '';
        if (versionComment) versionComment.value = '';
    }

    /**
     * Close specific modals
     */
    closeComparisonModal() {
        document.getElementById('version-comparison-modal').style.display = 'none';
    }

    closeRevertModal() {
        document.getElementById('version-revert-modal').style.display = 'none';
        this.revertVersionId = null;
        document.getElementById('revert-reason').value = '';
    }

    closeCommentModal() {
        document.getElementById('add-comment-modal').style.display = 'none';
        this.commentVersionId = null;
        document.getElementById('version-comment').value = '';
    }

    closeStatsModal() {
        document.getElementById('version-stats-modal').style.display = 'none';
    }

    /**
     * Utility methods
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
        return `${Math.floor(diffInSeconds / 31536000)} years ago`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading(message) {
        const historyList = this.container.querySelector('.version-history-list');
        if (historyList) {
            historyList.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showError(message) {
        const historyList = this.container.querySelector('.version-history-list');
        if (historyList) {
            historyList.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="versionControlUI.loadVersionHistory('${this.currentCaseStudyId}')">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    showSuccess(message) {
        // You could implement a toast notification system here
        console.log('✅ Success:', message);
        alert(message); // Simple implementation
    }

    showInfo(message) {
        console.log('ℹ️ Info:', message);
        alert(message); // Simple implementation
    }

    /**
     * Load CSS styles
     */
    loadStyles() {
        if (document.getElementById('version-control-styles')) return;
        
        // Link to external CSS file
        const link = document.createElement('link');
        link.id = 'version-control-styles';
        link.rel = 'stylesheet';
        link.href = 'css/version-control.css';
        document.head.appendChild(link);
    }

    /**
     * Set callback for when version is reverted
     */
    setOnRevertCallback(callback) {
        this.onRevert = callback;
    }

    /**
     * Set callback for when version is created
     */
    setOnVersionCreatedCallback(callback) {
        this.onVersionCreated = callback;
    }

    /**
     * Refresh the version history
     */
    refresh() {
        if (this.currentCaseStudyId) {
            this.loadVersionHistory(this.currentCaseStudyId);
        }
    }

    /**
     * Destroy the version control UI
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Remove styles
        const styles = document.getElementById('version-control-styles');
        if (styles) {
            styles.remove();
        }
    }
}

// Global instance for easy access
let versionControlUI = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // This would be initialized by the case study editor
    console.log('🔄 VersionControlUI ready for initialization');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VersionControlUI;
} else if (typeof window !== 'undefined') {
    window.VersionControlUI = VersionControlUI;
}

console.log('🔄 VersionControlUI class loaded successfully');