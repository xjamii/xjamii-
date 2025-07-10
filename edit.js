// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: 'dwwhpznwb',
    uploadPreset: 'web_usigned_upload',
    apiKey: 'your_api_key' // Replace with your actual API key
};

// Global variables (removed skills and experience arrays)
let avatarFile = null;
let coverFile = null;
let originalUsername = '';

// Initialize edit profile functionality
function initEditProfile() {
    const editButton = document.getElementById('edit-button');
    const backFromEdit = document.getElementById('back-from-edit');
    const saveProfileBtn = document.getElementById('save-profile-changes');
    
    // File upload elements
    const avatarUpload = document.getElementById('edit-avatar-upload');
    const coverUpload = document.getElementById('edit-cover-upload');
    
    // Username input
    const usernameInput = document.getElementById('edit-username');
    
    // Event listeners
    editButton.addEventListener('click', openEditProfile);
    backFromEdit.addEventListener('click', closeEditProfile);
    saveProfileBtn.addEventListener('click', saveProfileChanges);
    
    avatarUpload.addEventListener('change', handleAvatarUpload);
    coverUpload.addEventListener('change', handleCoverUpload);
    
    // Real-time username availability check
    usernameInput.addEventListener('input', debounce(checkUsernameAvailability, 500));
    
    // Populate category options
    populateCategories();
}

// Debounce function for username check
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// Open edit profile page
async function openEditProfile() {
    const editPage = document.getElementById('edit-profile-page');
    const preloader = document.getElementById('edit-preloader');
    
    // Show preloader
    editPage.style.display = 'block';
    preloader.style.display = 'flex';
    
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();
        
        if (error) throw error;
        
        // Populate form fields (removed experience and skills)
        document.getElementById('edit-full-name').value = profile.full_name || '';
        document.getElementById('edit-username').value = profile.username || '';
        document.getElementById('edit-bio').value = profile.bio || '';
        document.getElementById('edit-website').value = profile.website || '';
        document.getElementById('edit-category').value = profile.category || '';
        
        // Set avatar preview
        const avatarPreview = document.getElementById('avatar-preview');
        if (profile.avatar_url) {
            avatarPreview.src = profile.avatar_url;
        } else {
            const initials = profile.full_name ? 
                profile.full_name.split(' ').map(n => n[0]).join('') : 'U';
            avatarPreview.src = `https://ui-avatars.com/api/?name=${initials}&background=0056b3&color=fff&size=120`;
        }
        
        // Set cover preview (removed placeholder)
        const coverPreview = document.getElementById('cover-preview');
        if (profile.cover_photo_url) {
            coverPreview.src = profile.cover_photo_url;
            coverPreview.style.display = 'block';
        } else {
            coverPreview.style.display = 'none';
        }
        
        // Store original username
        originalUsername = profile.username || '';
        
    } catch (error) {
        console.error('Error loading profile for edit:', error);
        showError('Failed to load profile for editing');
    } finally {
        preloader.style.display = 'none';
    }
}

// Close edit profile page
function closeEditProfile() {
    document.getElementById('edit-profile-page').style.display = 'none';
}

// Handle avatar upload (no changes)
function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (file) {
        avatarFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('avatar-preview').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Handle cover upload (removed placeholder handling)
function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (file) {
        coverFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            const coverPreview = document.getElementById('cover-preview');
            coverPreview.src = event.target.result;
            coverPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Check username availability (no changes)
async function checkUsernameAvailability() {
    const usernameInput = document.getElementById('edit-username');
    const username = usernameInput.value.trim().toLowerCase();
    const availabilityMsg = document.getElementById('username-availability');
    
    if (username === originalUsername) {
        availabilityMsg.style.display = 'none';
        return;
    }
    
    if (username.length < 3) {
        availabilityMsg.style.display = 'block';
        availabilityMsg.textContent = 'Username must be at least 3 characters';
        availabilityMsg.className = 'username-availability username-taken';
        return;
    }
    
    const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .neq('id', profileId);
    
    if (error) {
        console.error('Error checking username:', error);
        return;
    }
    
    if (data && data.length > 0) {
        availabilityMsg.style.display = 'block';
        availabilityMsg.textContent = 'Username is already taken';
        availabilityMsg.className = 'username-availability username-taken';
    } else {
        availabilityMsg.style.display = 'block';
        availabilityMsg.textContent = 'Username is available';
        availabilityMsg.className = 'username-availability username-available';
    }
}

// Upload image to Cloudinary (no changes)
async function uploadImageToCloudinary(file, type = 'avatar') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('cloud_name', cloudinaryConfig.cloudName);
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error(`Error uploading ${type} image:`, error);
        throw error;
    }
}

// Save profile changes (removed experience and skills)
async function saveProfileChanges(e) {
    e.preventDefault();
    
    const saveButton = document.getElementById('save-profile-changes');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    const fullName = document.getElementById('edit-full-name').value.trim();
    const username = document.getElementById('edit-username').value.trim().toLowerCase();
    const bio = document.getElementById('edit-bio').value.trim();
    const website = document.getElementById('edit-website').value.trim();
    const category = document.getElementById('edit-category').value;
    
    // Validate username
    if (username !== originalUsername) {
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .neq('id', profileId);
        
        if (data && data.length > 0) {
            showError('Username is already taken. Please choose another.');
            saveButton.disabled = false;
            saveButton.textContent = 'Save';
            return;
        }
    }
    
    try {
        // Upload avatar if changed
        let avatarUrl = null;
        if (avatarFile) {
            avatarUrl = await uploadImageToCloudinary(avatarFile, 'avatar');
        }
        
        // Upload cover if changed
        let coverUrl = null;
        if (coverFile) {
            coverUrl = await uploadImageToCloudinary(coverFile, 'cover');
        }
        
        // Prepare updates (removed experience and skills)
        const updates = {
            full_name: fullName,
            username: username,
            username_slug: username.toLowerCase().replace(/\s+/g, '-'),
            bio: bio,
            website: website,
            category: category,
            updated_at: new Date().toISOString()
        };
        
        if (avatarUrl) updates.avatar_url = avatarUrl;
        if (coverUrl) updates.cover_photo_url = coverUrl;
        
        // Update profile in database
        const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profileId);
        
        if (updateError) throw updateError;
        
        // Close edit page and refresh profile
        closeEditProfile();
        loadProfile();
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showError('Failed to save profile changes. Please try again.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save';
    }
}

// Simplified category selection (changed to simple select)
function populateCategories() {
    const categories = [
        'Airline Pilot', 'First Officer', 'Captain', 'Flight Instructor',
        'Flight Attendant', 'Purser', 'Cabin Crew Manager', 'Ground Staff',
        'Air Traffic Controller', 'Dispatcher', 'Flight Operations Officer',
        'Aircraft Engineer', 'Avionics Technician', 'Maintenance Technician',
        'Quality Assurance', 'Safety Inspector', 'Aircraft Mechanic',
        'Airline CEO', 'Operations Manager', 'Flight Operations Manager',
        'Maintenance Manager', 'Training Manager', 'Safety Manager',
        'Helicopter Pilot', 'HEMS Pilot', 'Offshore Pilot', 'Flight Paramedic',
        'Aviation Consultant', 'Broker', 'Charter Operator', 'FBO Manager',
        'Aviation Lawyer', 'Aviation Journalist', 'Aircraft Sales'
    ];
    
    const categorySelect = document.getElementById('edit-category');
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

// Initialize the page (no changes)
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    initEditProfile();
});
