// Skills Editor - Complete Implementation
class SkillsEditor {
    constructor() {
        this.selectedSkills = [];
        this.allSkills = [
            // Flight Operations
            'CRM', 'TEM', 'SOP Development', 'Flight Planning', 'Fuel Management',
            'Navigation', 'Instrument Flying', 'MCC', 'LOFT',
            
            // Technical Skills
            'Aircraft Maintenance', 'Troubleshooting', 'Avionics', 'Composite Repair',
            'NDT Inspection', 'Powerplant', 'Airframe', 'Line Maintenance',
            
            // Safety & Compliance
            'Safety Management', 'Risk Assessment', 'Auditing', 'Compliance',
            'Emergency Procedures', 'Human Factors', 'Fatigue Management',
            
            // Management
            'Team Leadership', 'Project Management', 'Budgeting', 'Strategic Planning',
            'Regulatory Compliance', 'Training Development', 'Quality Assurance',
            
            // Other
            'Aircraft Sales', 'Customer Service', 'Crisis Management', 'Media Relations',
            'Technical Writing', 'Data Analysis', 'Flight Simulation'
        ];
        
        this.initElements();
        this.initEventListeners();
        this.populateSkillsGrid();
    }
    
    initElements() {
        this.elements = {
            page: document.getElementById('skills-page'),
            backButton: document.getElementById('back-from-skills'),
            saveButton: document.getElementById('save-skills'),
            preloader: document.getElementById('skills-preloader'),
            selectedCount: document.getElementById('selected-count'),
            skillsChips: document.getElementById('skills-chips'),
            skillsSearch: document.getElementById('skills-search'),
            skillsGrid: document.getElementById('skills-grid'),
            skillsContainer: document.getElementById('skills-container'),
            skillsSection: document.getElementById('skills-section')
        };
    }
    
    initEventListeners() {
        this.elements.backButton.addEventListener('click', () => this.close());
        this.elements.saveButton.addEventListener('click', () => this.saveSkills());
        this.elements.skillsSearch.addEventListener('input', () => this.filterSkills());
    }
    
    populateSkillsGrid() {
        this.elements.skillsGrid.innerHTML = '';
        this.allSkills.forEach(skill => {
            const skillItem = document.createElement('div');
            skillItem.className = `skill-item ${this.selectedSkills.includes(skill) ? 'selected' : ''}`;
            skillItem.textContent = skill;
            skillItem.addEventListener('click', () => this.toggleSkill(skill, skillItem));
            this.elements.skillsGrid.appendChild(skillItem);
        });
    }
    
    filterSkills() {
        const searchTerm = this.elements.skillsSearch.value.toLowerCase();
        const skillItems = this.elements.skillsGrid.querySelectorAll('.skill-item');
        
        skillItems.forEach(item => {
            const skill = item.textContent.toLowerCase();
            item.style.display = skill.includes(searchTerm) ? 'block' : 'none';
        });
    }
    
    toggleSkill(skill, element) {
        if (this.selectedSkills.includes(skill)) {
            this.selectedSkills = this.selectedSkills.filter(s => s !== skill);
            element.classList.remove('selected');
        } else if (this.selectedSkills.length < 10) {
            this.selectedSkills.push(skill);
            element.classList.add('selected');
        }
        this.updateSelectedSkillsDisplay();
    }
    
    updateSelectedSkillsDisplay() {
        this.elements.selectedCount.textContent = this.selectedSkills.length;
        this.elements.skillsChips.innerHTML = '';
        
        this.selectedSkills.forEach(skill => {
            const chip = document.createElement('div');
            chip.className = 'skill-chip';
            chip.innerHTML = `${skill} <i class="fas fa-times"></i>`;
            
            chip.querySelector('i').addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedSkills = this.selectedSkills.filter(s => s !== skill);
                this.updateSelectedSkillsDisplay();
                
                // Also remove selection from grid
                const items = this.elements.skillsGrid.querySelectorAll('.skill-item');
                items.forEach(item => {
                    if (item.textContent === skill) {
                        item.classList.remove('selected');
                    }
                });
            });
            
            this.elements.skillsChips.appendChild(chip);
        });
    }
    
    async open() {
        // Load current skills from profile
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('skills')
            .eq('id', profileId)
            .single();
        
        if (!error && profile && profile.skills) {
            this.selectedSkills = profile.skills.split(',').map(s => s.trim()).filter(s => s);
        } else {
            this.selectedSkills = [];
        }
        
        this.elements.page.style.display = 'block';
        this.updateSelectedSkillsDisplay();
        this.populateSkillsGrid();
    }
    
    close() {
        this.elements.page.style.display = 'none';
    }
    
    async saveSkills() {
        try {
            this.elements.saveButton.disabled = true;
            this.elements.saveButton.textContent = 'Saving...';
            
            const skillsString = this.selectedSkills.join(', ');
            
            const { error } = await supabase
                .from('profiles')
                .update({ skills: skillsString })
                .eq('id', profileId);
            
            if (error) throw error;
            
            this.close();
            await this.loadSkills(); // Refresh the skills display
        } catch (error) {
            console.error('Error saving skills:', error);
            showError('Failed to save skills. Please try again.');
        } finally {
            this.elements.saveButton.disabled = false;
            this.elements.saveButton.textContent = 'Save';
        }
    }
    
    async loadSkills() {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('skills')
                .eq('id', profileId)
                .single();
            
            if (error) throw error;
            
            if (profile && profile.skills) {
                const skills = profile.skills.split(',').map(s => s.trim()).filter(s => s);
                this.elements.skillsContainer.innerHTML = skills
                    .map(skill => `<div class="skill-badge">${skill}</div>`)
                    .join('');
            } else {
                this.elements.skillsContainer.innerHTML = '<div class="no-skills">No skills added yet</div>';
            }
            
            this.elements.skillsSection.style.display = 'block';
        } catch (error) {
            console.error('Error loading skills:', error);
            this.elements.skillsContainer.innerHTML = 
                '<div class="error-message">Failed to load skills</div>';
            this.elements.skillsSection.style.display = 'block';
        }
    }
}

// Initialize Skills Editor and add edit button
function initSkillsEditor() {
    // Check if we're on a profile page with skills section
    if (document.getElementById('skills-section')) {
        window.skillsEditor = new SkillsEditor();
        
        // Create and add edit button to skills section
        const skillsSection = document.getElementById('skills-section');
        const sectionTitle = skillsSection.querySelector('.section-title');
        
        if (sectionTitle) {
            const editButton = document.createElement('button');
            editButton.className = 'skills-edit-btn';
            editButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Edit';
            editButton.addEventListener('click', () => window.skillsEditor.open());
            sectionTitle.appendChild(editButton);
        }
        
        // Load skills
        window.skillsEditor.loadSkills();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initSkillsEditor();
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
