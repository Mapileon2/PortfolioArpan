/**
 * Fix Case Study Validation Issues
 * Pre-fills required fields and provides better validation feedback
 */

// Wait for the page to load and then fix validation issues
window.addEventListener('load', () => {
    setTimeout(() => {
        fixValidationIssues();
    }, 1000);
});

function fixValidationIssues() {
    console.log('🔧 Fixing case study validation issues...');
    
    // Check if required fields exist and are empty
    const caseStudyTitle = document.getElementById('caseStudyTitle');
    const heroTitle = document.getElementById('heroTitle');
    
    if (caseStudyTitle && !caseStudyTitle.value.trim()) {
        caseStudyTitle.value = 'My Case Study Project';
        console.log('✅ Pre-filled Case Study Title');
    }
    
    if (heroTitle && !heroTitle.value.trim()) {
        heroTitle.value = 'Innovative Solution';
        console.log('✅ Pre-filled Hero Title');
    }
    
    // Add better validation feedback
    if (window.caseStudyEditor) {
        const originalValidateForm = window.caseStudyEditor.validateForm;
        
        window.caseStudyEditor.validateForm = function() {
            console.log('🔍 Running enhanced validation...');
            
            let isValid = true;
            const errors = [];
            
            // Check each validation rule
            Object.keys(this.validationRules).forEach(fieldId => {
                const field = document.getElementById(fieldId);
                const rules = this.validationRules[fieldId];
                
                if (!field) {
                    console.error(`❌ Field not found: ${fieldId}`);
                    errors.push(`Field ${fieldId} not found`);
                    isValid = false;
                    return;
                }
                
                const value = field.value.trim();
                console.log(`📋 Validating ${fieldId}: "${value}" (length: ${value.length})`);
                
                if (rules.required && !value) {
                    this.showFieldError(field, 'This field is required');
                    errors.push(`${fieldId} is required`);
                    console.log(`❌ ${fieldId}: Required field is empty`);
                    isValid = false;
                } else if (rules.minLength && value.length < rules.minLength) {
                    this.showFieldError(field, `Minimum ${rules.minLength} characters required`);
                    errors.push(`${fieldId} needs at least ${rules.minLength} characters`);
                    console.log(`❌ ${fieldId}: Too short (${value.length} < ${rules.minLength})`);
                    isValid = false;
                } else {
                    console.log(`✅ ${fieldId}: Valid`);
                    // Clear any previous errors
                    this.clearFieldError(field);
                }
            });
            
            if (!isValid) {
                console.log('❌ Validation failed. Errors:', errors);
                this.showNotification('warning', 'Validation Failed', 
                    `Please fix these issues: ${errors.join(', ')}`);
            } else {
                console.log('✅ All validation passed!');
            }
            
            return isValid;
        };
        
        // Add method to clear field errors
        window.caseStudyEditor.clearFieldError = function(field) {
            field.classList.remove('border-red-500', 'border-red-400');
            field.classList.add('border-gray-300');
            
            // Hide error message if it exists
            const errorDiv = field.parentNode.querySelector('.error-message');
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        };
        
        console.log('✅ Enhanced validation system installed');
    }
    
    // Add real-time validation
    ['caseStudyTitle', 'heroTitle'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                const value = field.value.trim();
                if (value.length >= 3) {
                    field.classList.remove('border-red-500', 'border-red-400');
                    field.classList.add('border-green-500');
                } else {
                    field.classList.remove('border-green-500');
                    field.classList.add('border-yellow-400');
                }
            });
            
            field.addEventListener('blur', () => {
                if (window.caseStudyEditor) {
                    window.caseStudyEditor.validateField(field);
                }
            });
        }
    });
    
    console.log('✅ Real-time validation added to required fields');
}

// Show helpful notification
setTimeout(() => {
    if (window.caseStudyEditor) {
        window.caseStudyEditor.showNotification('info', 'Validation Helper', 
            'Required fields have been pre-filled. Make sure Case Study Title and Hero Title have at least 3 characters.');
    }
}, 2000);

console.log('🔧 Case Study Validation Fix loaded');