class WorkAtEditor {
    constructor() {
        this.workInfo = null;
        this.initElements();
        this.initEventListeners();
    }
    
    initElements() {
        this.elements = {
            page: document.getElementById('workat-page'),
            backButton: document.getElementById('back-from-workat'),
            saveButton: document.getElementById('save-workat'),
            form: document.getElementById('workat-form'),
            companyInput: document.getElementById('workat-company'),
            websiteInput: document.getElementById('workat-website'),
            container: document.getElementById('workat-container'),
            section: document.getElementById('workat-section'),
            actionsContainer: document.getElementById('workat-actions'),
            addBtn: document.getElementById('add-workat-btn'),
            addMoreBtn: document.getElementById('add-more-workat'),
            editBtn: document.getElementById('edit-workat'),
            deleteBtn: document.getElementById('delete-workat')
        };
    }
    
    initEventListeners() {
        this.elements.backButton.addEventListener('click', () => this.close());
        this.elements.saveButton.addEventListener('click', () => this.saveWorkAt());
        this.elements.addBtn?.addEventListener('click', () => this.open());
        this.elements.addMoreBtn?.addEventListener('click', () => this.open());
        this.elements.editBtn?.addEventListener('click', () => this.open());
        this.elements.deleteBtn?.addEventListener('click', () => this.deleteWorkAt());
    }
    
    async open() {
        this.elements.page.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        await this.loadWorkAt();
        
        if (this.workInfo) {
            this.elements.companyInput.value = this.workInfo.company || '';
            this.elements.websiteInput.value = this.workInfo.website || '';
        } else {
            this.elements.form.reset();
        }
    }
    
    close() {
        this.elements.page.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    async saveWorkAt() {
        try {
            this.elements.saveButton.disabled = true;
            this.elements.saveButton.textContent = 'Saving...';
            
            const workAtData = {
                company: this.elements.companyInput.value.trim(),
                website: this.elements.websiteInput.value.trim(),
                profile_id: profileId
            };
            
            if (!workAtData.company) {
                throw new Error('Company name is required');
            }
            
            if (this.workInfo) {
                // Update existing
                const { error } = await supabase
                    .from('work_at')
                    .update(workAtData)
                    .eq('id', this.workInfo.id);
                
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('work_at')
                    .insert([workAtData]);
                
                if (error) throw error;
            }
            
            this.close();
            await this.displayWorkAt();
        } catch (error) {
            console.error('Error saving work info:', error);
            alert(error.message || 'Failed to save work information. Please try again.');
        } finally {
            this.elements.saveButton.disabled = false;
            this.elements.saveButton.textContent = 'Save';
        }
    }
    
    async deleteWorkAt() {
        if (confirm('Are you sure you want to delete this work information?')) {
            try {
                const { error } = await supabase
                    .from('work_at')
                    .delete()
                    .eq('id', this.workInfo.id);
                
                if (error) throw error;
                
                this.workInfo = null;
                await this.displayWorkAt();
            } catch (error) {
                console.error('Error deleting work info:', error);
                alert('Failed to delete work information');
            }
        }
    }
    
    async loadWorkAt() {
        try {
            const { data: workAt, error } = await supabase
                .from('work_at')
                .select('*')
                .eq('profile_id', profileId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            
            this.workInfo = workAt || null;
            return this.workInfo;
        } catch (error) {
            console.error('Error loading work info:', error);
            return null;
        }
    }
    
    async displayWorkAt() {
        try {
            await this.loadWorkAt();
            
            if (this.workInfo) {
                let html = `
                    <div class="workat-item">
                        <div class="company">${this.workInfo.company}</div>`;
                
                if (this.workInfo.website) {
                    const websiteUrl = this.workInfo.website.startsWith('http') ? 
                        this.workInfo.website : `https://${this.workInfo.website}`;
                    html += `<a href="${websiteUrl}" target="_blank" class="website">${websiteUrl}</a>`;
                }
                
                html += `</div>`;
                this.elements.container.innerHTML = html;
                
                // Show action buttons
                this.elements.actionsContainer.style.display = 'flex';
                // Hide add button
                if (this.elements.addBtn) {
                    this.elements.addBtn.style.display = 'none';
                }
            } else {
                this.elements.container.innerHTML = `
                    <div class="no-workat" style="text-align: center; margin: 20px 0; color: #666;">
                        No work information added yet
                        <button class="btn small-btn" id="add-workat-btn">
                            <i class="fas fa-plus"></i> Add Work Info
                        </button>
                    </div>`;
                
                // Hide action buttons
                this.elements.actionsContainer.style.display = 'none';
                // Re-attach event listener for add button
                const addBtn = document.getElementById('add-workat-btn');
                if (addBtn) {
                    addBtn.addEventListener('click', () => this.open());
                }
            }
            
            // Show section
            this.elements.section.style.display = 'block';
            return true;
        } catch (error) {
            console.error('Error displaying work info:', error);
            this.elements.container.innerHTML = `
                <div class="error-message">Failed to load work information</div>`;
            this.elements.section.style.display = 'block';
            return false;
        }
    }
}

// Initialize WorkAt Editor
async function initWorkAtEditor() {
    if (document.getElementById('workat-section')) {
        const workAtEditor = new WorkAtEditor();
        window.workAtEditor = workAtEditor;
        await workAtEditor.displayWorkAt();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initWorkAtEditor();
});
