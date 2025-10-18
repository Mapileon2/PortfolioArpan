/**
 * Concurrent Update Handler
 * 
 * Provides UI and logic for handling concurrent updates to case studies
 * Implements version checking, conflict resolution, and merge options
 * 
 * Requirements: 3.6
 */

class ConcurrentUpdateHandler {
    constructor() {
        this.conflictResolutionModal = null;
        this.currentConflict = null;
        this.resolutionCallbacks = [];
        
        this.initializeModal();
        console.log('🔄 Concurrent Update Handler initialized');
    }

    /**
     * Handle concurrent update scenario
     */
    async handleConcurrentUpdate(localData, serverData, options = {}) {
        console.log('🔄 Handling concurrent update conflict');
        
        this.currentConflict = {
            localData,
            serverData,
            options,
            timestamp: new Date().toISOString()
        };

        // Show conflict resolution UI
        return new Promise((resolve, reject) => {
            this.showConflictResolutionModal(localData, serverData, resolve, reject);
        });
    }

    /**
     * Initialize conflict resolution modal
     */
    initializeModal() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('conflictResolutionModal')) {
            const modalHTML = this.createModalHTML();
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        
        this.conflictResolutionModal = document.getElementById('conflictResolutionModal');
        this.setupModalEventListeners();
    }

    /**
     * Create modal HTML structure
     */
    createModalHTML() {
        return `
            <div id="conflictResolutionModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                    <div class="bg-yellow-500 text-white px-6 py-4">
                        <h2 class="text-xl font-bold flex items-center">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Concurrent Update Detected
                        </h2>
                        <p class="text-yellow-100 mt-1">Another user has updated this case study while you were editing.</p>
                    </div>
                    
                    <div class="p-6 overflow-y-auto max-h-[70vh]">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Your Changes -->
                            <div class="border rounded-lg p-4">
                                <h3 class="font-semibold text-blue-600 mb-3 flex items-center">
                                    <i class="fas fa-user mr-2"></i>
                                    Your Changes
                                </h3>
                                <div id="localChanges" class="space-y-2 text-sm"></div>
                            </div>
                            
                            <!-- Server Changes -->
                            <div class="border rounded-lg p-4">
                                <h3 class="font-semibold text-green-600 mb-3 flex items-center">
                                    <i class="fas fa-server mr-2"></i>
                                    Other User's Changes
                                </h3>
                                <div id="serverChanges" class="space-y-2 text-sm"></div>
                            </div>
                        </div>
                        
                        <!-- Conflicts Section -->
                        <div id="conflictsSection" class="mt-6 border-t pt-6">
                            <h3 class="font-semibold text-red-600 mb-3 flex items-center">
                                <i class="fas fa-exclamation-circle mr-2"></i>
                                Conflicting Fields
                            </h3>
                            <div id="conflictsList" class="space-y-3"></div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 px-6 py-4 flex flex-wrap gap-3 justify-end">
                        <button id="useServerVersion" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                            <i class="fas fa-download mr-1"></i>
                            Use Their Version
                        </button>
                        <button id="useLocalVersion" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                            <i class="fas fa-upload mr-1"></i>
                            Keep My Version
                        </button>
                        <button id="mergeVersions" class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
                            <i class="fas fa-code-branch mr-1"></i>
                            Smart Merge
                        </button>
                        <button id="cancelConflictResolution" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
                            <i class="fas fa-times mr-1"></i>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }    /*
*
     * Setup modal event listeners
     */
    setupModalEventListeners() {
        const modal = this.conflictResolutionModal;
        
        // Use server version
        modal.querySelector('#useServerVersion').addEventListener('click', () => {
            this.resolveConflict('server');
        });
        
        // Use local version
        modal.querySelector('#useLocalVersion').addEventListener('click', () => {
            this.resolveConflict('local');
        });
        
        // Merge versions
        modal.querySelector('#mergeVersions').addEventListener('click', () => {
            this.resolveConflict('merge');
        });
        
        // Cancel
        modal.querySelector('#cancelConflictResolution').addEventListener('click', () => {
            this.resolveConflict('cancel');
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.resolveConflict('cancel');
            }
        });
    }

    /**
     * Show conflict resolution modal
     */
    showConflictResolutionModal(localData, serverData, resolve, reject) {
        this.currentResolutionCallback = { resolve, reject };
        
        // Populate modal with conflict data
        this.populateConflictData(localData, serverData);
        
        // Show modal
        this.conflictResolutionModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Populate modal with conflict data
     */
    populateConflictData(localData, serverData) {
        const conflicts = this.identifyConflicts(localData, serverData);
        
        // Show local changes
        const localChangesEl = document.getElementById('localChanges');
        localChangesEl.innerHTML = this.formatChanges(localData, 'local');
        
        // Show server changes
        const serverChangesEl = document.getElementById('serverChanges');
        serverChangesEl.innerHTML = this.formatChanges(serverData, 'server');
        
        // Show conflicts
        const conflictsListEl = document.getElementById('conflictsList');
        if (conflicts.length > 0) {
            conflictsListEl.innerHTML = conflicts.map(conflict => 
                this.formatConflict(conflict)
            ).join('');
            document.getElementById('conflictsSection').style.display = 'block';
        } else {
            document.getElementById('conflictsSection').style.display = 'none';
        }
    }

    /**
     * Identify conflicts between local and server data
     */
    identifyConflicts(localData, serverData) {
        const conflicts = [];
        const fieldsToCheck = [
            'project_title', 
            'project_description', 
            'project_category',
            'project_achievement',
            'project_rating',
            'sections'
        ];

        fieldsToCheck.forEach(field => {
            const localValue = localData[field];
            const serverValue = serverData[field];
            
            if (this.valuesConflict(localValue, serverValue)) {
                conflicts.push({
                    field,
                    localValue,
                    serverValue,
                    fieldLabel: this.getFieldLabel(field)
                });
            }
        });

        return conflicts;
    }

    /**
     * Check if two values conflict
     */
    valuesConflict(localValue, serverValue) {
        // Handle null/undefined
        if (localValue == null && serverValue == null) return false;
        if (localValue == null || serverValue == null) return true;
        
        // Handle objects (like sections)
        if (typeof localValue === 'object' && typeof serverValue === 'object') {
            return JSON.stringify(localValue) !== JSON.stringify(serverValue);
        }
        
        // Handle primitives
        return localValue !== serverValue;
    }

    /**
     * Get user-friendly field label
     */
    getFieldLabel(field) {
        const labels = {
            'project_title': 'Project Title',
            'project_description': 'Project Description',
            'project_category': 'Category',
            'project_achievement': 'Achievement',
            'project_rating': 'Rating',
            'sections': 'Content Sections'
        };
        
        return labels[field] || field;
    }

    /**
     * Format changes for display
     */
    formatChanges(data, source) {
        const changes = [];
        
        if (data.project_title) {
            changes.push(`<div><strong>Title:</strong> ${this.truncateText(data.project_title, 50)}</div>`);
        }
        
        if (data.project_description) {
            changes.push(`<div><strong>Description:</strong> ${this.truncateText(data.project_description, 100)}</div>`);
        }
        
        if (data.updated_at) {
            const date = new Date(data.updated_at).toLocaleString();
            changes.push(`<div><strong>Last Updated:</strong> ${date}</div>`);
        }
        
        return changes.join('') || '<div class="text-gray-500">No changes detected</div>';
    }

    /**
     * Format conflict for display
     */
    formatConflict(conflict) {
        return `
            <div class="border border-red-200 rounded p-3 bg-red-50">
                <div class="font-medium text-red-800 mb-2">${conflict.fieldLabel}</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                        <div class="text-blue-600 font-medium">Your version:</div>
                        <div class="bg-blue-50 p-2 rounded">${this.formatValue(conflict.localValue)}</div>
                    </div>
                    <div>
                        <div class="text-green-600 font-medium">Their version:</div>
                        <div class="bg-green-50 p-2 rounded">${this.formatValue(conflict.serverValue)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format value for display
     */
    formatValue(value) {
        if (value == null) return '<em>Empty</em>';
        if (typeof value === 'object') return '<em>Complex data</em>';
        return this.truncateText(String(value), 100);
    }

    /**
     * Truncate text for display
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Resolve conflict with chosen strategy
     */
    resolveConflict(strategy) {
        if (!this.currentConflict || !this.currentResolutionCallback) {
            return;
        }

        const { localData, serverData } = this.currentConflict;
        const { resolve, reject } = this.currentResolutionCallback;

        let resolvedData;
        
        try {
            switch (strategy) {
                case 'server':
                    resolvedData = { ...serverData };
                    break;
                    
                case 'local':
                    resolvedData = { 
                        ...localData,
                        updated_at: new Date().toISOString()
                    };
                    break;
                    
                case 'merge':
                    resolvedData = this.performSmartMerge(localData, serverData);
                    break;
                    
                case 'cancel':
                    this.hideModal();
                    reject(new Error('Conflict resolution cancelled by user'));
                    return;
                    
                default:
                    throw new Error('Unknown resolution strategy');
            }

            this.hideModal();
            resolve({
                strategy,
                data: resolvedData,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Conflict resolution failed:', error);
            reject(error);
        }
    }

    /**
     * Perform smart merge of local and server data
     */
    performSmartMerge(localData, serverData) {
        // Smart merge strategy: prefer local content, server metadata
        const merged = {
            ...serverData, // Start with server data
            ...localData,  // Override with local changes
            
            // Always use server timestamps for consistency
            created_at: serverData.created_at,
            updated_at: new Date().toISOString(),
            
            // Merge sections intelligently
            sections: this.mergeSections(localData.sections, serverData.sections)
        };

        return merged;
    }

    /**
     * Merge sections intelligently
     */
    mergeSections(localSections, serverSections) {
        if (!localSections && !serverSections) return {};
        if (!localSections) return serverSections;
        if (!serverSections) return localSections;

        // Merge each section, preferring local content
        const merged = { ...serverSections };
        
        Object.keys(localSections).forEach(sectionKey => {
            if (localSections[sectionKey]) {
                merged[sectionKey] = {
                    ...serverSections[sectionKey],
                    ...localSections[sectionKey]
                };
            }
        });

        return merged;
    }

    /**
     * Hide modal
     */
    hideModal() {
        this.conflictResolutionModal.classList.add('hidden');
        document.body.style.overflow = '';
        this.currentConflict = null;
        this.currentResolutionCallback = null;
    }

    /**
     * Check if concurrent update handler is needed
     */
    static isNeeded(error) {
        return error && (
            error.code === 'CONCURRENT_UPDATE' ||
            error.message.includes('Concurrent update') ||
            error.message.includes('concurrent update')
        );
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.concurrentUpdateHandler = new ConcurrentUpdateHandler();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConcurrentUpdateHandler;
}