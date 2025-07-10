// Experience Editor
class ExperienceEditor {
    constructor() {
        this.currentExperienceId = null;
        this.initElements();
        this.initEventListeners();
        this.populateDateOptions();
    }
    
    initElements() {
        this.elements = {
            page: document.getElementById('experience-page'),
            backButton: document.getElementById('back-from-experience'),
            saveButton: document.getElementById('save-experience'),
            preloader: document.getElementById('experience-preloader'),
            positionInput: document.getElementById('experience-position'),
            companyInput: document.getElementById('experience-company'),
            startMonth: document.getElementById('experience-start-month'),
            startYear: document.getElementById('experience-start-year'),
            endMonth: document.getElementById('experience-end-month'),
            endYear: document.getElementById('experience-end-year'),
            currentCheckbox: document.getElementById('experience-current'),
            descriptionInput: document.getElementById('experience-description'),
            deleteButton: document.getElementById('delete-experience')
        };
    }
    
    initEventListeners() {
        this.elements.backButton.addEventListener('click', () => this.close());
        this.elements.saveButton.addEventListener('click', () => this.saveExperience());
        this.elements.deleteButton.addEventListener('click', () => this.deleteExperience());
        this.elements.currentCheckbox.addEventListener('change', (e) => {
            this.toggleCurrentRole(e.target.checked);
        });
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
        
        if (experienceId) {
            // Load existing experience
            await this.loadExperience(experienceId);
            this.elements.deleteButton.style.display = 'block';
        } else {
            // New experience
            this.resetForm();
            this.elements.deleteButton.style.display = 'none';
        }
        
        this.elements.preloader.style.display = 'none';
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
            showError('Failed to load experience');
            this.close();
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
            
            if (this.currentExperienceId) {
                // Update existing experience
                const { error } = await supabase
                    .from('experiences')
                    .update(experienceData)
                    .eq('id', this.currentExperienceId);
                
                if (error) throw error;
            } else {
                // Create new experience
                experienceData.profile_id = profileId;
                const { error } = await supabase
                    .from('experiences')
                    .insert([experienceData]);
                
                if (error) throw error;
            }
            
            this.close();
            await loadProfile(); // Refresh profile display
        } catch (error) {
            console.error('Error saving experience:', error);
            showError('Failed to save experience');
        } finally {
            this.elements.saveButton.disabled = false;
            this.elements.saveButton.textContent = 'Save';
        }
    }
    
    validateForm() {
        if (!this.elements.positionInput.value.trim()) {
            showError('Position is required');
            return false;
        }
        
        if (!this.elements.companyInput.value.trim()) {
            showError('Company is required');
            return false;
        }
        
        if (!this.elements.startMonth.value || !this.elements.startYear.value) {
            showError('Start date is required');
            return false;
        }
        
        if (!this.elements.currentCheckbox.checked && 
            (!this.elements.endMonth.value || !this.elements.endYear.value)) {
            showError('End date is required if not current role');
            return false;
        }
        
        return true;
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
            
            const { error } = await supabase
                .from('experiences')
                .delete()
                .eq('id', this.currentExperienceId);
            
            if (error) throw error;
            
            this.close();
            await loadProfile(); // Refresh profile display
        } catch (error) {
            console.error('Error deleting experience:', error);
            showError('Failed to delete experience');
        } finally {
            this.elements.deleteButton.disabled = false;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.experienceEditor = new ExperienceEditor();
    
    // Add edit button to experience section
    const experienceSection = document.getElementById('experience-section');
    if (experienceSection) {
        const editButton = document.createElement('button');
        editButton.className = 'experience-edit-btn';
        editButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit';
        editButton.onclick = () => window.experienceEditor.open();
        
        const sectionTitle = experienceSection.querySelector('.section-title');
        if (sectionTitle) {
            sectionTitle.appendChild(editButton);
        }
    }
});

// Helper function to format experience display
function formatExperience(experience) {
    const startDate = new Date(experience.start_date);
    const startStr = `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()}`;
    
    let endStr = 'Present';
    if (experience.end_date) {
        const endDate = new Date(experience.end_date);
        endStr = `${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;
    }
    
    return `
        <div class="experience-item" data-id="${experience.id}">
            <div class="experience-position">${experience.position}</div>
            <div class="experience-company">${experience.company}</div>
            <div class="experience-duration">${startStr} - ${endStr}</div>
            ${experience.description ? `<div class="experience-description">${experience.description}</div>` : ''}
            <button class="experience-edit-btn" onclick="window.experienceEditor.open('${experience.id}')">
                <i class="fas fa-pencil-alt"></i> Edit
            </button>
        </div>
    `;
}
