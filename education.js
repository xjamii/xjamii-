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
            editButton: document.getElementById('edit-education-btn'),
            form: document.getElementById('education-form'),
            degreeInput: document.getElementById('education-degree'),
            institutionInput: document.getElementById('education-institution'),
            startYearSelect: document.getElementById('education-start-year'),
            endYearSelect: document.getElementById('education-end-year'),
            descriptionTextarea: document.getElementById('education-description'),
            container: document.getElementById('education-container'),
            section: document.getElementById('education-section')
        };
    }
    
    initEventListeners() {
        this.elements.backButton.addEventListener('click', () => this.close());
        this.elements.saveButton.addEventListener('click', () => this.saveEducation());
        this.elements.editButton.addEventListener('click', () => this.open());
    }
    
    populateYearDropdowns() {
        const currentYear = new Date().getFullYear();
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
    }
    
    async saveEducation() {
        try {
            this.elements.saveButton.disabled = true;
            this.elements.saveButton.textContent = 'Saving...';
            
            const educationData = {
                degree: this.elements.degreeInput.value.trim(),
                institution: this.elements.institutionInput.value.trim(),
                start_year: this.elements.startYearSelect.value,
                end_year: this.elements.endYearSelect.value,
                description: this.elements.descriptionTextarea.value.trim(),
                profile_id: profileId
            };
            
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
            await this.loadEducations(); // Refresh the display
        } catch (error) {
            console.error('Error saving education:', error);
            alert('Failed to save education. Please try again.');
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
            
            this.elements.section.style.display = 'block';
            
            // Show edit button if this is the user's own profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.id === profileId) {
                this.elements.editButton.style.display = 'inline-block';
            } else {
                this.elements.editButton.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading education:', error);
            this.elements.container.innerHTML = `
                <div class="error-message">Failed to load education</div>`;
            this.elements.section.style.display = 'block';
        }
    }
}

// Initialize Education Editor
async function initEducationEditor() {
    if (document.getElementById('education-section')) {
        const educationEditor = new EducationEditor();
        window.educationEditor = educationEditor;
        await educationEditor.loadEducations();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initEducationEditor();
});
