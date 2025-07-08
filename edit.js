// Initialize Supabase
const supabaseUrl = "https://dadrhoxjhjbnhhrtkgbf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZHJob3hqaGpibmhocnRrZ2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1OTk2NTksImV4cCI6MjA2NjE3NTY1OX0.rn2hv0sXbKJyniN3FtpNpuyTvcXP1nTLj-jpnimRMEI";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: 'dwwhpznwb',
    uploadPreset: 'web_usigned_upload',
    apiKey: 'your_api_key' // Replace with your actual API key
};

// DOM Elements
const editModal = document.getElementById('edit-modal');
const closeModal = document.getElementById('close-modal');
const cancelEdit = document.getElementById('cancel-edit');
const editForm = document.getElementById('edit-profile-form');
const avatarUpload = document.getElementById('edit-avatar-upload');
const coverUpload = document.getElementById('edit-cover-upload');
const avatarPreview = document.getElementById('avatar-preview');
const coverPreview = document.getElementById('cover-preview');
const usernameInput = document.getElementById('edit-username');
const availabilityMsg = document.getElementById('username-availability');

// State variables
let newAvatarUrl = null;
let newCoverUrl = null;
let originalUsername = '';
let currentUserId = null;

// Initialize edit functionality
async function initEditProfile() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('User not authenticated');
        return;
    }
    currentUserId = user.id;

    // Set up event listeners
    document.getElementById('edit-button').addEventListener('click', openEditModal);
    closeModal.addEventListener('click', closeEditModal);
    cancelEdit.addEventListener('click', closeEditModal);
    editForm.addEventListener('submit', saveProfileChanges);
    
    avatarUpload.addEventListener('change', handleAvatarUpload);
    coverUpload.addEventListener('change', handleCoverUpload);
    
    // Real-time username availability check
    usernameInput.addEventListener('input', debounce(checkUsernameAvailability, 500));
}

// Debounce function for input events
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// Upload file to Cloudinary
async function uploadToCloudinary(file, type = 'image') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('cloud_name', cloudinaryConfig.cloudName);
    
    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${type}/upload`,
            {
                method: 'POST',
                body: formData
            }
        );
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}

// Handle avatar upload
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const reader = new FileReader();
        reader.onload = (event) => {
            avatarPreview.src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        newAvatarUrl = await uploadToCloudinary(file);
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showError('Failed to upload avatar');
    }
}

// Handle cover photo upload
async function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const reader = new FileReader();
        reader.onload = (event) => {
            coverPreview.src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        newCoverUrl = await uploadToCloudinary(file);
    } catch (error) {
        console.error('Error uploading cover photo:', error);
        showError('Failed to upload cover photo');
    }
}

// Check username availability
async function checkUsernameAvailability() {
    const username = usernameInput.value.trim().toLowerCase();
    
    if (username === originalUsername) {
        availabilityMsg.style.display = 'none';
        return;
    }
    
    if (username.length < 3) {
        availabilityMsg.style.display = 'block';
        availabilityMsg.textContent = 'Username must be at least 3 characters';
        availabilityMsg.className = 'username-availability taken';
        return;
    }
    
    const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .neq('id', currentUserId);
    
    if (error) {
        console.error('Error checking username:', error);
        return;
    }
    
    if (data && data.length > 0) {
        availabilityMsg.style.display = 'block';
        availabilityMsg.textContent = 'Username is already taken';
        availabilityMsg.className = 'username-availability taken';
    } else {
        availabilityMsg.style.display = 'block';
        availabilityMsg.textContent = 'Username is available';
        availabilityMsg.className = 'username-availability available';
    }
}

// Open edit modal
async function openEditModal() {
    try {
        // Get current profile data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUserId)
            .single();

        if (error) throw error;
        
        // Populate form fields
        document.getElementById('edit-full-name').value = profile.full_name || '';
        document.getElementById('edit-username').value = profile.username || '';
        document.getElementById('edit-bio').value = profile.bio || '';
        document.getElementById('edit-website').value = profile.website || '';
        document.getElementById('edit-category').value = profile.category || '';
        document.getElementById('edit-experience').value = profile.experience || '';
        document.getElementById('edit-skills').value = profile.skills || '';
        
        // Set preview images
        if (profile.avatar_url) {
            avatarPreview.src = profile.avatar_url;
        } else {
            const initials = profile.full_name ? 
                profile.full_name.split(' ').map(n => n[0]).join('') : 'U';
            avatarPreview.src = `https://ui-avatars.com/api/?name=${initials}&background=0056b3&color=fff&size=120`;
        }
        
        if (profile.cover_photo_url) {
            coverPreview.src = profile.cover_photo_url;
        } else {
            coverPreview.style.backgroundColor = '#0056b3';
        }
        
        // Store original username
        originalUsername = profile.username || '';
        
        // Reset state
        newAvatarUrl = null;
        newCoverUrl = null;
        avatarUpload.value = '';
        coverUpload.value = '';
        availabilityMsg.style.display = 'none';
        
        // Show modal
        editModal.style.display = 'flex';
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showError('Failed to load profile for editing');
    }
}

// Close edit modal
function closeEditModal() {
    editModal.style.display = 'none';
}

// Save profile changes
async function saveProfileChanges(e) {
    e.preventDefault();
    
    const saveButton = e.target.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
        // Get form values
        const fullName = document.getElementById('edit-full-name').value.trim();
        const username = document.getElementById('edit-username').value.trim().toLowerCase();
        const bio = document.getElementById('edit-bio').value.trim();
        const website = document.getElementById('edit-website').value.trim();
        const category = document.getElementById('edit-category').value.trim();
        const experience = document.getElementById('edit-experience').value.trim();
        const skills = document.getElementById('edit-skills').value.trim();
        
        // Validate username
        if (username !== originalUsername) {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .neq('id', currentUserId);
            
            if (data && data.length > 0) {
                throw new Error('Username is already taken');
            }
        }
        
        // Prepare update data
        const updateData = {
            full_name: fullName,
            username: username,
            bio: bio,
            website: website,
            category: category,
            experience: experience,
            skills: skills,
            updated_at: new Date().toISOString()
        };
        
        // Add media URLs if updated
        if (newAvatarUrl) updateData.avatar_url = newAvatarUrl;
        if (newCoverUrl) updateData.cover_photo_url = newCoverUrl;
        
        // Update profile in database
        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', currentUserId);
        
        if (error) throw error;
        
        // Close modal and notify success
        closeEditModal();
        showSuccess('Profile updated successfully!');
        
        // Refresh the page to show changes
        setTimeout(() => window.location.reload(), 1500);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showError(error.message || 'Failed to update profile. Please try again.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.position = 'fixed';
    errorDiv.style.bottom = '20px';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translateX(-50%)';
    errorDiv.style.backgroundColor = '#ff4444';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '10px 20px';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.zIndex = '1000';
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.position = 'fixed';
    successDiv.style.bottom = '20px';
    successDiv.style.left = '50%';
    successDiv.style.transform = 'translateX(-50%)';
    successDiv.style.backgroundColor = '#4CAF50';
    successDiv.style.color = 'white';
    successDiv.style.padding = '10px 20px';
    successDiv.style.borderRadius = '4px';
    successDiv.style.zIndex = '1000';
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initEditProfile);
