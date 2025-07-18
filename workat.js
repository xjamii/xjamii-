class WorkAtEditor {
    constructor() {
        this.workItems = [];
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
            workatIdInput: document.getElementById('workat-id'),
            container: document.getElementById('workat-container'),
            section: document.getElementById('workat-section'),
            addButton: document.getElementById('add-workat-btn')
        };
    }
    
    initEventListeners() {
        this.elements.backButton.addEventListener('click', () => this.close());
        this.elements.saveButton.addEventListener('click', () => this.saveWorkAt());
        this.elements.addButton.addEventListener('click', () => this.openForNew());
    }
    
    async openForEdit(workId) {
        const workItem = this.workItems.find(item => item.id === workId);
        if (!workItem) return;
        
        this.elements.workatIdInput.value = workItem.id;
        this.elements.companyInput.value = workItem.company || '';
        this.elements.websiteInput.value = workItem.website || '';
        
        this.open();
    }
    
    openForNew() {
        this.elements.form.reset();
        this.elements.workatIdInput.value = '';
        this.open();
    }
    
    open() {
        this.elements.page.style.display = 'block';
        document.body.style.overflow = 'hidden';
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
            
            const workId = this.elements.workatIdInput.value;
            
            if (workId) {
                // Update existing
                const { error } = await supabase
                    .from('work_at')
                    .update(workAtData)
                    .eq('id', workId);
                
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('work_at')
                    .insert([workAtData]);
                
                if (error) throw error;
            }
            
            this.close();
            await this.loadWorkAt();
        } catch (error) {
            console.error('Error saving work info:', error);
            alert(error.message || 'Failed to save work information. Please try again.');
        } finally {
            this.elements.saveButton.disabled = false;
            this.elements.saveButton.textContent = 'Save';
        }
    }
    
    async deleteWorkAt(workId) {
        try {
            const { error } = await supabase
                .from('work_at')
                .delete()
                .eq('id', workId);
            
            if (error) throw error;
            
            await this.loadWorkAt();
        } catch (error) {
            console.error('Error deleting work info:', error);
            alert('Failed to delete work information. Please try again.');
        }
    }
    
    async loadWorkAt() {
        try {
            const { data: workItems, error } = await supabase
                .from('work_at')
                .select('*')
                .eq('profile_id', profileId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.workItems = workItems || [];
            await this.displayWorkAt();
            
            return this.workItems;
        } catch (error) {
            console.error('Error loading work info:', error);
            return [];
        }
    }
    
    async displayWorkAt() {
        try {
            if (this.workItems.length > 0) {
                let html = '';
                
                this.workItems.forEach(item => {
                    html += `
                        <div class="workat-item" data-id="${item.id}">
                            <div class="workat-company">${item.company}</div>
                            ${item.website ? `<a href="${item.website.startsWith('http') ? item.website : 'https://' + item.website}" target="_blank" class="workat-website">${item.website}</a>` : ''}
                            
                            <div class="workat-actions">
                                <button class="workat-action-btn edit-btn" data-id="${item.id}">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <button class="workat-action-btn delete-btn" data-id="${item.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>`;
                });
                
                this.elements.container.innerHTML = html;
                
                // Add event listeners to action buttons
                document.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.openForEdit(e.target.closest('button').dataset.id);
                    });
                });
                
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        if (confirm('Are you sure you want to delete this work information?')) {
                            this.deleteWorkAt(e.target.closest('button').dataset.id);
                        }
                    });
                });
                
                this.elements.section.style.display = 'block';
                this.elements.addButton.style.display = 'flex';
            } else {
                this.elements.container.innerHTML = `
                    <div class="no-workat">
                        No work information added yet
                    </div>`;
                this.elements.section.style.display = 'block';
                this.elements.addButton.style.display = 'flex';
            }
            
            // Show section only if owner or has content
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.id === profileId) {
                this.elements.section.style.display = 'block';
            } else {
                this.elements.section.style.display = this.workItems.length > 0 ? 'block' : 'none';
            }
            
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
        await workAtEditor.loadWorkAt();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initWorkAtEditor();
});
