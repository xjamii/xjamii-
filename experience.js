class ExperienceEditor {
    constructor() {
        this.currentExperienceId = null;
        this.isProfileOwner = false; // Track if current user owns the profile
        this.initElements();
        this.initEventListeners();
        this.populateDateOptions();
    }
    
    initElements() {
        this.elements = {
            // Page elements
            page: document.getElementById('experience-page'),
            backButton: document.getElementById('back-from-experience'),
            saveButton: document.getElementById('save-experience'),
            preloader: document.getElementById('experience-preloader'),
            deleteButton: document.getElementById('delete-experience'),
            
            // Form elements
            positionInput: document.getElementById('experience-position'),
            companyInput: document.getElementById('experience-company'),
            startMonth: document.getElementById('experience-start-month'),
            startYear: document.getElementById('experience-start-year'),
            endMonth: document.getElementById('experience-end-month'),
            endYear: document.getElementById('experience-end-year'),
            currentCheckbox: document.getElementById('experience-current'),
            descriptionInput: document.getElementById('experience-description'),
            
            // Section elements
            editSectionBtn: document.getElementById('edit-experience-btn'),
            experienceContainer: document.getElementById('experience-container'),
            experienceSection: document.getElementById('experience-section')
        };
    }
    
    initEventListeners() {
        // Navigation buttons
        this.elements.backButton.addEventListener('click', () => this.close());
        this.elements.saveButton.addEventListener('click', () => this.saveExperience());
        this.elements.deleteButton.addEventListener('click', () => this.deleteExperience());
        
        // Form interactions
        this.elements.currentCheckbox.addEventListener('change', (e) => {
            this.toggleCurrentRole(e.target.checked);
        });
        
        // Section edit button
        if (this.elements.editSectionBtn) {
            this.elements.editSectionBtn.addEventListener('click', () => this.open());
        }
    }
    
    populateDateOptions() {
        // Populate months
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            this.elements.startMonth.appendChild(option.cloneNode(true));
            this.elements.endMonth.appendChild(option);
        });
        
        // Populate years (last 50 years)
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 50; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            this.elements.startYear.appendChild(option.cloneNode(true));
            this.elements.endYear.appendChild(option);
        }
    }
    
    async open(experienceId = null) {
        this.currentExperienceId = experienceId;
        this.elements.page.style.display = 'block';
        this.elements.preloader.style.display = 'flex';
        
        try {
            if (experienceId) {
                // Load existing experience
                await this.loadExperience(experienceId);
                this.elements.deleteButton.style.display = 'block';
            } else {
                // New experience
                this.resetForm();
                this.elements.deleteButton.style.display = 'none';
            }
        } catch (error) {
            console.error('Error opening experience editor:', error);
            showError('Failed to load experience editor');
            this.close();
        } finally {
            this.elements.preloader.style.display = 'none';
        }
    }
    
    close() {
        this.elements.page.style.display = 'none';
    }
    
    resetForm() {
        this.elements.positionInput.value = '';
        this.elements.companyInput.value = '';
        this.elements.startMonth.value = '';
        this.elements.startYear.value = '';
        this.elements.endMonth.value = '';
        this.elements.endYear.value = '';
        this.elements.currentCheckbox.checked = false;
        this.elements.descriptionInput.value = '';
        this.toggleCurrentRole(false);
    }
    
    toggleCurrentRole(isCurrent) {
        this.elements.endMonth.disabled = isCurrent;
        this.elements.endYear.disabled = isCurrent;
        if (isCurrent) {
            this.elements.endMonth.value = '';
            this.elements.endYear.value = '';
        }
    }
    
    async loadExperience(experienceId) {
        try {
            const { data, error } = await supabase
                .from('experiences')
                .select('*')
                .eq('id', experienceId)
                .single();
            
            if (error) throw error;
            if (!data) throw new Error('Experience not found');
            
            this.elements.positionInput.value = data.position;
            this.elements.companyInput.value = data.company;
            
            const startDate = new Date(data.start_date);
            this.elements.startMonth.value = startDate.getMonth() + 1;
            this.elements.startYear.value = startDate.getFullYear();
            
            if (data.end_date) {
                const endDate = new Date(data.end_date);
                this.elements.endMonth.value = endDate.getMonth() + 1;
                this.elements.endYear.value = endDate.getFullYear();
                this.elements.currentCheckbox.checked = false;
            } else {
                this.elements.currentCheckbox.checked = true;
                this.toggleCurrentRole(true);
            }
            
            this.elements.descriptionInput.value = data.description || '';
        } catch (error) {
            console.error('Error loading experience:', error);
            throw error;
        }
    }
    
    async saveExperience() {
        try {
            this.elements.saveButton.disabled = true;
            this.elements.saveButton.textContent = 'Saving...';
            
            // Validate form
            if (!this.validateForm()) {
                this.elements.saveButton.disabled = false;
                this.elements.saveButton.textContent = 'Save';
                return;
            }
            
            const experienceData = {
                position: this.elements.positionInput.value.trim(),
                company: this.elements.companyInput.value.trim(),
                start_date: this.getStartDate(),
                end_date: this.elements.currentCheckbox.checked ? null : this.getEndDate(),
                is_current: this.elements.currentCheckbox.checked,
                description: this.elements.descriptionInput.value.trim(),
                updated_at: new Date().toISOString()
            };
            
            let result;
            if (this.currentExperienceId) {
                // Update existing experience
                result = await supabase
                    .from('experiences')
                    .update(experienceData)
                    .eq('id', this.currentExperienceId);
            } else {
                // Create new experience
                experienceData.profile_id = profileId;
                result = await supabase
                    .from('experiences')
                    .insert([experienceData]);
            }
            
            if (result.error) throw result.error;
            
            this.close();
            await this.loadExperiences(); // Refresh the experience display
        } catch (error) {
            console.error('Error saving experience:', error);
            showError('Failed to save experience. Please try again.');
        } finally {
            this.elements.saveButton.disabled = false;
            this.elements.saveButton.textContent = 'Save';
        }
    }
    
    validateForm() {
        // Clear any previous errors
        document.querySelectorAll('.form-error').forEach(el => el.remove());
        
        let isValid = true;
        
        if (!this.elements.positionInput.value.trim()) {
            this.showFieldError(this.elements.positionInput, 'Position is required');
            isValid = false;
        }
        
        if (!this.elements.companyInput.value.trim()) {
            this.showFieldError(this.elements.companyInput, 'Company is required');
            isValid = false;
        }
        
        if (!this.elements.startMonth.value || !this.elements.startYear.value) {
            this.showFieldError(this.elements.startMonth, 'Start date is required');
            isValid = false;
        }
        
        if (!this.elements.currentCheckbox.checked && 
            (!this.elements.endMonth.value || !this.elements.endYear.value)) {
            this.showFieldError(this.elements.endMonth, 'End date is required if not current role');
            isValid = false;
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.style.color = '#ff4444';
        errorElement.style.fontSize = '13px';
        errorElement.style.marginTop = '5px';
        errorElement.textContent = message;
        
        // Insert after the field
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
    
    getStartDate() {
        return `${this.elements.startYear.value}-${String(this.elements.startMonth.value).padStart(2, '0')}-01`;
    }
    
    getEndDate() {
        return `${this.elements.endYear.value}-${String(this.elements.endMonth.value).padStart(2, '0')}-01`;
    }
    
    async deleteExperience() {
        if (!confirm('Are you sure you want to delete this experience?')) return;
        
        try {
            this.elements.deleteButton.disabled = true;
            this.elements.deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            const { error } = await supabase
                .from('experiences')
                .delete()
                .eq('id', this.currentExperienceId);
            
            if (error) throw error;
            
            this.close();
            await this.loadExperiences(); // Refresh the experience display
        } catch (error) {
            console.error('Error deleting experience:', error);
            showError('Failed to delete experience');
        } finally {
            this.elements.deleteButton.disabled = false;
            this.elements.deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete Experience';
        }
    }
    
    async loadExperiences() {
        try {
            this.elements.experienceSection.style.display = 'none';
            this.elements.experienceContainer.innerHTML = '<div class="loading-experience">Loading experiences...</div>';
            
            const { data: experiences, error } = await supabase
                .from('experiences')
                .select('*')
                .eq('profile_id', profileId)
                .order('start_date', { ascending: false });
            
            if (error) throw error;
            
            if (experiences && experiences.length > 0) {
                this.elements.experienceContainer.innerHTML = experiences.map(exp => this.formatExperience(exp)).join('');
                
                // Add event listeners to all edit buttons (only shown to owner)
                if (this.isProfileOwner) {
                    document.querySelectorAll('.edit-experience-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const experienceId = e.currentTarget.closest('.experience-item').dataset.id;
                            this.open(experienceId);
                        });
                    });
                }
                
                // Show section if there are experiences or if user is owner
                this.elements.experienceSection.style.display = 'block';
            } else {
                // No experiences - only show section to profile owner
                if (this.isProfileOwner) {
                    this.elements.experienceContainer.innerHTML = `
                        <div class="no-experiences">
                            <p>No professional experience added yet</p>
                            <button class="btn btn-add" onclick="window.experienceEditor.open()">
                                <i class="fas fa-plus"></i> Add Experience
                            </button>
                        </div>
                    `;
                    this.elements.experienceSection.style.display = 'block';
                } else {
                    // Hide section completely for non-owners when empty
                    this.elements.experienceSection.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading experiences:', error);
            this.elements.experienceContainer.innerHTML = `
                <div class="error-message">
                    Failed to load experiences. <button onclick="window.experienceEditor.loadExperiences()">Try again</button>
                </div>
            `;
            // Show section even if error for owner, hide for others
            this.elements.experienceSection.style.display = this.isProfileOwner ? 'block' : 'none';
        }
    }
    
    formatExperience(experience) {
        const startDate = new Date(experience.start_date);
        const startStr = `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()}`;
        
        let endStr = 'Present';
        if (experience.end_date) {
            const endDate = new Date(experience.end_date);
            endStr = `${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;
        }
        
        // Only show edit button if profile owner
        const editButton = this.isProfileOwner ? `
            <button class="experience-action-btn edit-experience-btn" title="Edit">
                <i class="fas fa-pencil-alt"></i>
            </button>
        ` : '';
        
        return `
            <div class="experience-item" data-id="${experience.id}">
                <div class="experience-actions">
                    ${editButton}
                </div>
                <div class="experience-position">${experience.position}</div>
                <div class="experience-company">${experience.company}</div>
                <div class="experience-duration">${startStr} - ${endStr}</div>
                ${experience.description ? `<div class="experience-description">${experience.description}</div>` : ''}
            </div>
        `;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on a profile page with experience section
    if (document.getElementById('experience-section')) {
        const experienceEditor = new ExperienceEditor();
        window.experienceEditor = experienceEditor;
        
        // Check if current user is the profile owner
        const { data: { user } } = await supabase.auth.getUser();
        experienceEditor.isProfileOwner = user && user.id === profileId;
        
        
        
        // Load experiences after a short delay to allow other elements to initialize
        setTimeout(() => {
            experienceEditor.loadExperiences();
        }, 100);
    }
});

// Helper function to show error messages
function showError(message) {
    const errorContainer = document.getElementById('error-message') || document.createElement('div');
    errorContainer.id = 'error-message';
    errorContainer.style.color = '#ff4444';
    errorContainer.style.padding = '10px';
    errorContainer.style.textAlign = 'center';
    errorContainer.style.fontWeight = '500';
    errorContainer.textContent = message;
    
    if (!document.getElementById('error-message')) {
        document.body.prepend(errorContainer);
    }
    
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}
