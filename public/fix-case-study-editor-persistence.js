/**
 * Fix Case Study Editor Persistence
 * Ensures that when users click "Edit" from admin dashboard,
 * the editor loads existing data and maintains persistence
 */

(function() {
    'use strict';
    
    console.log('🔧 Case Study Editor Persistence Fix - Loading...');
    
    // Wait for the editor to be initialized
    function waitForEditor() {
        if (window.editor && typeof window.editor.init === 'function') {
            console.log('✅ Editor found, applying persistence fix...');
            applyPersistenceFix();
        } else {
            console.log('⏳ Waiting for editor to initialize...');
            setTimeout(waitForEditor, 500);
        }
    }
    
    function applyPersistenceFix() {
        // Override the editor's init method to include URL parameter handling
        const originalInit = window.editor.init.bind(window.editor);
        
        window.editor.init = async function() {
            console.log('🚀 Enhanced editor initialization with persistence fix...');
            
            // Call original init first
            await originalInit();
            
            // Then handle URL parameters for editing existing case studies
            handleURLParameters();
            
            console.log('✅ Editor initialized with persistence fix');
        };
        
        // Add the loadCaseStudy method if it doesn't exist
        if (!window.editor.loadCaseStudy) {
            window.editor.loadCaseStudy = loadCaseStudyData;
        }
        
        // Add enhanced save method
        const originalSave = window.editor.saveCaseStudy ? window.editor.saveCaseStudy.bind(window.editor) : null;
        window.editor.saveCaseStudy = enhancedSaveCaseStudy;
        
        // Re-initialize if already initialized
        if (window.editor.isInitialized) {
            handleURLParameters();
        }
    }
    
    function handleURLParameters() {
        console.log('🔍 Checking URL parameters for case study ID...');
        
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const caseStudyId = urlParams.get('id');
            
            if (caseStudyId) {
                console.log('📖 Found case study ID in URL:', caseStudyId);
                loadCaseStudyData(caseStudyId);
            } else {
                console.log('📝 No case study ID in URL, starting with new case study');
            }
            
        } catch (error) {
            console.error('❌ Error handling URL parameters:', error);
        }
    }
    
    function loadCaseStudyData(caseStudyId) {
        console.log('📖 Loading case study data for ID:', caseStudyId);
        
        try {
            // Get case studies from localStorage
            const storedData = localStorage.getItem('portfolio_case_studies');
            if (!storedData) {
                console.warn('⚠️ No case studies found in localStorage');
                return;
            }
            
            const caseStudies = JSON.parse(storedData);
            const caseStudy = caseStudies.find(cs => cs.id === caseStudyId);
            
            if (!caseStudy) {
                console.warn('⚠️ Case study not found:', caseStudyId);
                showNotification('Case study not found', 'error');
                return;
            }
            
            console.log('✅ Case study found, loading data:', caseStudy.project_title);
            
            // Populate the form with case study data
            populateEditorForm(caseStudy);
            
            // Store current case study ID for saving
            window.editor.currentCaseStudyId = caseStudyId;
            
            // Update page title
            document.title = `Editing: ${caseStudy.project_title || 'Case Study'} - Case Study Editor`;
            
            // Show success notification
            showNotification(`Loaded: ${caseStudy.project_title}`, 'success');
            
        } catch (error) {
            console.error('❌ Error loading case study data:', error);
            showNotification('Error loading case study', 'error');
        }
    }
    
    function populateEditorForm(caseStudy) {
        console.log('📝 Populating editor form with case study data...');
        
        try {
            // Basic project information
            setFieldValue('projectTitle', caseStudy.project_title || caseStudy.caseStudyTitle || '');
            setFieldValue('projectDescription', caseStudy.project_description || '');
            setFieldValue('projectCategory', caseStudy.project_category || '');
            setFieldValue('projectAchievement', caseStudy.project_achievement || '');
            setFieldValue('projectRating', caseStudy.project_rating || 5);
            
            // Hero section
            if (caseStudy.sections && caseStudy.sections.hero) {
                setFieldValue('heroTitle', caseStudy.sections.hero.title || caseStudy.heroTitle || '');
                setFieldValue('heroSubtitle', caseStudy.sections.hero.subtitle || caseStudy.heroSubtitle || '');
                setFieldValue('heroText', caseStudy.sections.hero.text || '');
            } else {
                // Fallback to root level properties
                setFieldValue('heroTitle', caseStudy.heroTitle || '');
                setFieldValue('heroSubtitle', caseStudy.heroSubtitle || '');
            }
            
            // Overview section
            if (caseStudy.sections && caseStudy.sections.overview) {
                setFieldValue('overviewTitle', caseStudy.sections.overview.title || 'Project Overview');
                setFieldValue('overviewDescription', caseStudy.sections.overview.summary || caseStudy.overviewDescription || '');
            } else {
                setFieldValue('overviewTitle', 'Project Overview');
                setFieldValue('overviewDescription', caseStudy.overviewDescription || '');
            }
            
            // Problem section
            if (caseStudy.sections && caseStudy.sections.problem) {
                setFieldValue('problemTitle', caseStudy.sections.problem.title || 'The Challenge');
                setFieldValue('problemDescription', caseStudy.sections.problem.description || caseStudy.problemDescription || '');
            } else {
                setFieldValue('problemTitle', 'The Challenge');
                setFieldValue('problemDescription', caseStudy.problemDescription || '');
            }
            
            // Process section
            if (caseStudy.sections && caseStudy.sections.process) {
                setFieldValue('processTitle', caseStudy.sections.process.title || 'Our Process');
                setFieldValue('processDescription', caseStudy.sections.process.description || caseStudy.processDescription || '');
            } else {
                setFieldValue('processTitle', 'Our Process');
                setFieldValue('processDescription', caseStudy.processDescription || '');
            }
            
            // Showcase section
            if (caseStudy.sections && caseStudy.sections.showcase) {
                setFieldValue('showcaseTitle', caseStudy.sections.showcase.title || 'Final Solution');
                setFieldValue('showcaseDescription', caseStudy.sections.showcase.description || caseStudy.showcaseDescription || '');
            } else {
                setFieldValue('showcaseTitle', 'Final Solution');
                setFieldValue('showcaseDescription', caseStudy.showcaseDescription || '');
            }
            
            // Reflection section
            if (caseStudy.sections && caseStudy.sections.reflection) {
                setFieldValue('reflectionTitle', caseStudy.sections.reflection.title || 'Key Learnings');
                setFieldValue('reflectionDescription', caseStudy.sections.reflection.content || caseStudy.reflectionDescription || '');
            } else {
                setFieldValue('reflectionTitle', 'Key Learnings');
                setFieldValue('reflectionDescription', caseStudy.reflectionDescription || '');
            }
            
            // Status and featured
            setFieldValue('status', caseStudy.status || 'draft');
            setCheckboxValue('featured', caseStudy.featured || false);
            
            // Images
            if (caseStudy.project_image_url) {
                setImagePreview('projectImage', caseStudy.project_image_url);
            }
            
            if (caseStudy.sections && caseStudy.sections.hero && caseStudy.sections.hero.image) {
                setImagePreview('heroImage', caseStudy.sections.hero.image);
            }
            
            console.log('✅ Editor form populated with case study data');
            
            // Update live preview
            if (window.editor.updateLivePreview) {
                window.editor.updateLivePreview();
            }
            
        } catch (error) {
            console.error('❌ Error populating editor form:', error);
            showNotification('Error loading case study data', 'error');
        }
    }
    
    function setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
            
            // Trigger change event for any listeners
            field.dispatchEvent(new Event('change', { bubbles: true }));
            field.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.warn(`⚠️ Field not found: ${fieldId}`);
        }
    }
    
    function setCheckboxValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && field.type === 'checkbox') {
            field.checked = !!value;
            field.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    function setImagePreview(fieldId, imageUrl) {
        // Set the image preview if the preview element exists
        const previewElement = document.querySelector(`#${fieldId}Preview img`);
        if (previewElement && imageUrl) {
            previewElement.src = imageUrl;
            previewElement.style.display = 'block';
        }
        
        // Set hidden input if it exists
        const hiddenInput = document.getElementById(`${fieldId}Url`);
        if (hiddenInput) {
            hiddenInput.value = imageUrl || '';
        }
    }
    
    function enhancedSaveCaseStudy() {
        console.log('💾 Enhanced save case study with persistence...');
        
        try {
            // Collect all form data
            const caseStudyData = collectFormData();
            
            // If we're editing an existing case study, update it
            if (window.editor.currentCaseStudyId) {
                console.log('📝 Updating existing case study:', window.editor.currentCaseStudyId);
                updateExistingCaseStudy(window.editor.currentCaseStudyId, caseStudyData);
            } else {
                console.log('➕ Creating new case study');
                createNewCaseStudy(caseStudyData);
            }
            
        } catch (error) {
            console.error('❌ Error in enhanced save:', error);
            showNotification('Error saving case study', 'error');
        }
    }
    
    function collectFormData() {
        return {
            project_title: getFieldValue('projectTitle'),
            project_description: getFieldValue('projectDescription'),
            project_category: getFieldValue('projectCategory'),
            project_achievement: getFieldValue('projectAchievement'),
            project_rating: parseInt(getFieldValue('projectRating')) || 5,
            project_image_url: getFieldValue('projectImageUrl'),
            
            // Sections
            sections: {
                hero: {
                    title: getFieldValue('heroTitle'),
                    subtitle: getFieldValue('heroSubtitle'),
                    text: getFieldValue('heroText'),
                    image: getFieldValue('heroImageUrl')
                },
                overview: {
                    title: getFieldValue('overviewTitle'),
                    summary: getFieldValue('overviewDescription')
                },
                problem: {
                    title: getFieldValue('problemTitle'),
                    description: getFieldValue('problemDescription')
                },
                process: {
                    title: getFieldValue('processTitle'),
                    description: getFieldValue('processDescription')
                },
                showcase: {
                    title: getFieldValue('showcaseTitle'),
                    description: getFieldValue('showcaseDescription')
                },
                reflection: {
                    title: getFieldValue('reflectionTitle'),
                    content: getFieldValue('reflectionDescription')
                }
            },
            
            status: getFieldValue('status') || 'draft',
            featured: getCheckboxValue('featured'),
            
            // Legacy field mappings for backward compatibility
            caseStudyTitle: getFieldValue('projectTitle'),
            heroTitle: getFieldValue('heroTitle'),
            heroSubtitle: getFieldValue('heroSubtitle'),
            overviewDescription: getFieldValue('overviewDescription'),
            problemDescription: getFieldValue('problemDescription'),
            processDescription: getFieldValue('processDescription'),
            showcaseDescription: getFieldValue('showcaseDescription'),
            reflectionDescription: getFieldValue('reflectionDescription')
        };
    }
    
    function getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value : '';
    }
    
    function getCheckboxValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.checked : false;
    }
    
    function updateExistingCaseStudy(caseStudyId, caseStudyData) {
        console.log('📝 Updating existing case study in localStorage...');
        
        try {
            const storedData = localStorage.getItem('portfolio_case_studies');
            let caseStudies = storedData ? JSON.parse(storedData) : [];
            
            const index = caseStudies.findIndex(cs => cs.id === caseStudyId);
            
            if (index !== -1) {
                // Update existing case study
                caseStudies[index] = {
                    ...caseStudies[index],
                    ...caseStudyData,
                    id: caseStudyId, // Preserve original ID
                    updated_at: new Date().toISOString()
                };
                
                // Save back to localStorage
                localStorage.setItem('portfolio_case_studies', JSON.stringify(caseStudies));
                
                console.log('✅ Case study updated successfully');
                showNotification('Case study updated successfully!', 'success');
                
                // Trigger storage event for admin dashboard sync
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'portfolio_case_studies',
                    newValue: JSON.stringify(caseStudies),
                    storageArea: localStorage
                }));
                
            } else {
                console.warn('⚠️ Case study not found for update, creating new one...');
                createNewCaseStudy(caseStudyData);
            }
            
        } catch (error) {
            console.error('❌ Error updating case study:', error);
            showNotification('Error updating case study', 'error');
        }
    }
    
    function createNewCaseStudy(caseStudyData) {
        console.log('➕ Creating new case study...');
        
        try {
            const storedData = localStorage.getItem('portfolio_case_studies');
            let caseStudies = storedData ? JSON.parse(storedData) : [];
            
            const newCaseStudy = {
                id: 'cs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...caseStudyData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            caseStudies.push(newCaseStudy);
            localStorage.setItem('portfolio_case_studies', JSON.stringify(caseStudies));
            
            // Update current case study ID for future saves
            window.editor.currentCaseStudyId = newCaseStudy.id;
            
            console.log('✅ New case study created:', newCaseStudy.id);
            showNotification('Case study created successfully!', 'success');
            
            // Update URL to include the new ID
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('id', newCaseStudy.id);
            window.history.replaceState({}, '', newUrl);
            
            // Trigger storage event for admin dashboard sync
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'portfolio_case_studies',
                newValue: JSON.stringify(caseStudies),
                storageArea: localStorage
            }));
            
        } catch (error) {
            console.error('❌ Error creating case study:', error);
            showNotification('Error creating case study', 'error');
        }
    }
    
    function showNotification(message, type = 'info') {
        // Use editor's notification system if available
        if (window.editor && typeof window.editor.showNotification === 'function') {
            window.editor.showNotification(type, 'Persistence', message);
            return;
        }
        
        // Fallback notification system
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Auto-save functionality
    function setupAutoSave() {
        console.log('💾 Setting up auto-save...');
        
        let autoSaveTimeout;
        
        function triggerAutoSave() {
            if (autoSaveTimeout) {
                clearTimeout(autoSaveTimeout);
            }
            
            autoSaveTimeout = setTimeout(() => {
                if (window.editor.currentCaseStudyId) {
                    console.log('💾 Auto-saving case study...');
                    const caseStudyData = collectFormData();
                    updateExistingCaseStudy(window.editor.currentCaseStudyId, caseStudyData);
                }
            }, 2000); // Auto-save after 2 seconds of inactivity
        }
        
        // Add auto-save listeners to all form fields
        const formFields = document.querySelectorAll('input, textarea, select');
        formFields.forEach(field => {
            field.addEventListener('input', triggerAutoSave);
            field.addEventListener('change', triggerAutoSave);
        });
        
        console.log('✅ Auto-save setup complete');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(waitForEditor, 1000);
        });
    } else {
        setTimeout(waitForEditor, 1000);
    }
    
    // Also try to initialize after a longer delay
    setTimeout(waitForEditor, 3000);
    
    console.log('✅ Case Study Editor Persistence Fix loaded');
    
})();