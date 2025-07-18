class EducationEditor {
    constructor() {
        this.educations = [];
        this.initElements();
        this.initEventListeners();
        this.populateYearDropdowns();
    }
    
    initElements() {
        this.elements = {
            page: document.getElementById('education-page'),
            backButton: document.getElementById('back-from-education'),
            saveButton: document.getElementById('save-education'),
            form: document.getElementById('education-form'),
            degreeInput: document.getElementById('education-degree'),
            institutionInput: document.getElementById('education-institution'),
            startYearSelect: document.getElementById('education-start-year'),
            endYearSelect: document.getElementById('education-end-year'),
            descriptionTextarea: document.getElementById('education-description'),
            container: document.getElementById('education-container'),
            section: document.getElementById('education-section'),
            editButton: document.getElementById('edit-education-btn')
        };
    }
    
    initEventListeners() {
        this.elements.backButton.addEventListener('click', () => this.close());
        this.elements.saveButton.addEventListener('click', () => this.saveEducation());
        if (this.elements.editButton) {
            this.elements.editButton.addEventListener('click', () => this.open());
        }
    }
    
    populateYearDropdowns() {
        const currentYear = new Date().getFullYear();
        this.elements.startYearSelect.innerHTML = '<option value="">Year</option>';
        this.elements.endYearSelect.innerHTML = '<option value="">Year</option>';
        
        for (let year = currentYear; year >= 1970; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            this.elements.startYearSelect.appendChild(option.cloneNode(true));
            this.elements.endYearSelect.appendChild(option);
        }
    }
    
    async open() {
        this.elements.page.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        await this.loadEducations();
        
        // If there's existing education, populate the form with the first one
        if (this.educations.length > 0) {
            const edu = this.educations[0];
            this.elements.degreeInput.value = edu.degree || '';
            this.elements.institutionInput.value = edu.institution || '';
            this.elements.startYearSelect.value = edu.start_year || '';
            this.elements.endYearSelect.value = edu.end_year || '';
            this.elements.descriptionTextarea.value = edu.description || '';
        } else {
            // Clear form for new entry
            this.elements.form.reset();
        }
    }
    
    close() {
        this.elements.page.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    async saveEducation() {
        try {
            this.elements.saveButton.disabled = true;
            this.elements.saveButton.textContent = 'Saving...';
            
            const educationData = {
                degree: this.elements.degreeInput.value.trim(),
                institution: this.elements.institutionInput.value.trim(),
                start_year: this.elements.startYearSelect.value,
                end_year: this.elements.endYearSelect.value || null,
                description: this.elements.descriptionTextarea.value.trim(),
                profile_id: profileId
            };
            
            if (!educationData.degree || !educationData.institution || !educationData.start_year) {
                throw new Error('Please fill all required fields');
            }
            
            // Check if we're updating or creating new
            if (this.educations.length > 0) {
                // Update existing
                const { error } = await supabase
                    .from('educations')
                    .update(educationData)
                    .eq('id', this.educations[0].id);
                
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('educations')
                    .insert([educationData]);
                
                if (error) throw error;
            }
            
            this.close();
            await this.displayEducations(); // Refresh the display
        } catch (error) {
            console.error('Error saving education:', error);
            alert(error.message || 'Failed to save education. Please try again.');
        } finally {
            this.elements.saveButton.disabled = false;
            this.elements.saveButton.textContent = 'Save';
        }
    }
    
    async loadEducations() {
        try {
            const { data: educations, error } = await supabase
                .from('educations')
                .select('*')
                .eq('profile_id', profileId)
                .order('start_year', { ascending: false });
            
            if (error) throw error;
            
            this.educations = educations || [];
            return this.educations;
        } catch (error) {
            console.error('Error loading educations:', error);
            return [];
        }
    }
    
    async displayEducations() {
        try {
            await this.loadEducations();
            
            if (this.educations.length > 0) {
                const edu = this.educations[0];
                let html = `
                    <div class="education-item">
                        <h4>${edu.degree}</h4>
                        <div class="institution">${edu.institution}</div>
                        <div class="duration">${edu.start_year} - ${edu.end_year || 'Present'}</div>`;
                
                if (edu.description) {
                    html += `<div class="description">${edu.description}</div>`;
                }
                
                html += `</div>`;
                this.elements.container.innerHTML = html;
            } else {
                this.elements.container.innerHTML = `
                    <div class="no-education" style="text-align: center; margin: 20px 0; color: #666;">
                        No education added yet
                    </div>`;
            }
            
            // Show edit button if this is the user's own profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.id === profileId) {
                if (!this.elements.editButton) {
                    // Create edit button if it doesn't exist
                    const editButton = document.createElement('button');
                    editButton.id = 'edit-education-btn';
                    editButton.className = 'btn edit-btn';
                    editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
                    editButton.addEventListener('click', () => this.open());
                    
                    const sectionTitle = this.elements.section.querySelector('.section-title');
                    if (sectionTitle) {
                        sectionTitle.appendChild(editButton);
                    }
                    this.elements.editButton = editButton;
                }
                this.elements.editButton.style.display = 'inline-block';
            } else if (this.elements.editButton) {
                this.elements.editButton.style.display = 'none';
            }
            
            this.elements.section.style.display = 'block';
            return true;
        } catch (error) {
            console.error('Error displaying education:', error);
            this.elements.container.innerHTML = `
                <div class="error-message">Failed to load education</div>`;
            this.elements.section.style.display = 'block';
            return false;
        }
    }
}

// Initialize Education Editor
async function initEducationEditor() {
    if (document.getElementById('education-section')) {
        const educationEditor = new EducationEditor();
        window.educationEditor = educationEditor;
        await educationEditor.displayEducations();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initEducationEditor();
});
