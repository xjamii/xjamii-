// Add to your DOM elements at the top:
const highlightsContainer = document.getElementById('highlights-container');
const highlightModal = document.createElement('div');
highlightModal.className = 'highlight-modal';
highlightModal.innerHTML = `
    <div class="highlight-modal-content">
        <div class="highlight-modal-header">
            <div class="highlight-modal-title">New Highlight</div>
            <button class="highlight-modal-close">&times;</button>
        </div>
        <div class="highlight-modal-body">
            <div class="highlight-preview" id="highlight-preview"></div>
            <input type="text" class="form-input" id="highlight-name" placeholder="Highlight name">
            <textarea class="highlight-caption" id="highlight-caption" placeholder="Add a caption (optional)"></textarea>
            <input type="text" class="form-input" id="highlight-link" placeholder="Add a link (optional)">
            <button class="action-button" id="upload-highlight-btn">Select Photo</button>
            <input type="file" id="highlight-upload" accept="image/*" style="display: none;">
            <button class="action-button edit-modal-save" id="save-highlight-btn" style="display: none; margin-top: 16px;">Create Highlight</button>
        </div>
    </div>
`;
document.body.appendChild(highlightModal);

// Add to your setupEventListeners function:
function setupEventListeners() {
    // ... existing code ...
    
    // Highlight add new
    document.querySelector('.highlight-item.add-new').addEventListener('click', () => {
        highlightModal.style.display = 'flex';
    });
    
    // Highlight modal close
    highlightModal.querySelector('.highlight-modal-close').addEventListener('click', () => {
        highlightModal.style.display = 'none';
    });
    
    // Highlight upload
    const highlightUpload = document.getElementById('highlight-upload');
    const uploadHighlightBtn = document.getElementById('upload-highlight-btn');
    const saveHighlightBtn = document.getElementById('save-highlight-btn');
    const highlightPreview = document.getElementById('highlight-preview');
    
    uploadHighlightBtn.addEventListener('click', () => {
        highlightUpload.click();
    });
    
    highlightUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                highlightPreview.innerHTML = `<img src="${event.target.result}" alt="Highlight preview">`;
                saveHighlightBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Save highlight
    saveHighlightBtn.addEventListener('click', async () => {
        const name = document.getElementById('highlight-name').value;
        const caption = document.getElementById('highlight-caption').value;
        const link = document.getElementById('highlight-link').value;
        const file = highlightUpload.files[0];
        
        if (!name || !file) {
            alert('Please add a name and select a photo');
            return;
        }
        
        try {
            // Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'your_upload_preset');
            
            const uploadResponse = await fetch('https://api.cloudinary.com/v1_1/your_cloud_name/image/upload', {
                method: 'POST',
                body: formData
            });
            
            const imageData = await uploadResponse.json();
            
            // Save to Supabase
            const { data, error } = await supabase
                .from('highlights')
                .insert([
                    { 
                        user_id: currentUser.id,
                        name: name,
                        image_url: imageData.secure_url,
                        caption: caption,
                        link: link,
                        created_at: new Date()
                    }
                ]);
            
            if (error) throw error;
            
            // Add to UI
            addHighlightToUI({
                id: data[0].id,
                name: name,
                image_url: imageData.secure_url
            });
            
            highlightModal.style.display = 'none';
            // Reset form
            highlightPreview.innerHTML = '';
            document.getElementById('highlight-name').value = '';
            document.getElementById('highlight-caption').value = '';
            document.getElementById('highlight-link').value = '';
            saveHighlightBtn.style.display = 'none';
            
        } catch (error) {
            console.error('Error creating highlight:', error);
            alert('Failed to create highlight');
        }
    });
}

// Helper function to add highlight to UI
function addHighlightToUI(highlight) {
    const highlightItem = document.createElement('div');
    highlightItem.className = 'highlight-item';
    highlightItem.innerHTML = `
        <div class="highlight-circle">
            <img src="${highlight.image_url}" alt="${highlight.name}">
        </div>
        <span class="highlight-title">${highlight.name}</span>
    `;
    highlightsContainer.insertBefore(highlightItem, document.querySelector('.highlight-item.add-new'));
}

// Load existing highlights
async function loadHighlights(userId) {
    try {
        const { data, error } = await supabase
            .from('highlights')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            data.forEach(highlight => {
                addHighlightToUI(highlight);
            });
        } else {
            // Add empty placeholders
            for (let i = 0; i < 2; i++) {
                const emptyHighlight = document.createElement('div');
                emptyHighlight.className = 'highlight-item empty';
                emptyHighlight.innerHTML = `
                    <div class="highlight-circle"></div>
                    <span class="highlight-title">Empty</span>
                `;
                highlightsContainer.insertBefore(emptyHighlight, document.querySelector('.highlight-item.add-new'));
            }
        }
    } catch (error) {
        console.error('Error loading highlights:', error);
    }
}

// Call this in your loadProfileData function:
async function loadProfileData(profileId) {
    // ... existing code ...
    await loadHighlights(profileId);
    // ... rest of your code ...
}
