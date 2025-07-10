let avatarFile = null;
let coverFile = null;
let originalUsername = '';
let selectedCategory = '';
let selectedSkills = [];
let currentExperience = {
    position: '',
    company: '',
    location: '',
    start: '',
    end: '',
    current: false,
    description: ''
};

// Aviation categories
const aviationCategories = [
    'Pilot (Captain)', 'Pilot (First Officer)', 'Pilot (Helicopter)', 
    'Flight Attendant', 'Cabin Crew Manager', 'Purser',
    'Aircraft Engineer', 'Avionics Technician', 'Maintenance Controller',
    'Air Traffic Controller', 'ATC Supervisor', 'Flight Dispatcher',
    'Aircraft Broker', 'Sales Director', 'Leasing Manager',
    'Ground Handling', 'Ramp Agent', 'Load Controller',
    'Flight Instructor', 'Simulator Instructor', 'Check Captain',
    'Safety Officer', 'Quality Assurance', 'Compliance Manager',
    'Operations Manager', 'Chief Pilot', 'Director of Operations',
    'CEO/Executive', 'Finance Director', 'HR Director',
    'Marketing Manager', 'Customer Service', 'Flight Planner',
    'Fuel Manager', 'Catering Manager', 'Security Manager'
];

// Aviation skills
const aviationSkills = [
    'CRM', 'TEM', 'SMS', 'SOP Development',
    'Flight Planning', 'Fuel Management', 'Weight & Balance',
    'Aircraft Systems', 'Avionics', 'Troubleshooting',
    'Maintenance Planning', 'NDT', 'Component Repair',
    'Air Law', 'Meteorology', 'Navigation',
    'Human Factors', 'Crew Resource Management', 'Safety Management',
    'Emergency Procedures', 'First Aid', 'Security Procedures',
    'Customer Service', 'Cabin Safety', 'In-Flight Service',
    'Sales & Marketing', 'Contract Negotiation', 'Leasing',
    'Financial Analysis', 'Budgeting', 'Regulatory Compliance'
];

// Initialize edit functionality
function initEditProfile() {
    const editButton = document.getElementById('edit-button');
    const backButton = document.getElementById('edit-back-button');
    const saveButton = document.getElementById('edit-save-button');
    const editPage = document.getElementById('edit-profile-page');
    
    // Category selection
    const categoryBtn = document.getElementById('select-category-btn');
    const categoryBackBtn = document.getElementById('category-back-button');
    const categorySaveBtn = document.getElementById('category-save-button');
    const categoryPage = document.getElementById('category-page');
    
    // Experience selection
    const experienceBtn = document.getElementById('select-experience-btn');
    const experienceBackBtn = document.getElementById('experience-back-button');
    const experienceSaveBtn = document.getElementById('experience-save-button');
    const experiencePage = document.getElementById('experience-page');
    
    // Skills selection
    const skillsBtn = document.getElementById('select-skills-btn');
    const skillsBackBtn = document.getElementById('skills-back-button');
    const skillsSaveBtn = document.getElementById('skills-save-button');
    const skillsPage = document.getElementById('skills-page');
    
    // File uploads
    const avatarUpload = document.getElementById('edit-avatar-upload');
    const coverUpload = document.getElementById('edit-cover-upload');
    const usernameInput = document.getElementById('edit-username');
    
    // Event listeners
    editButton.addEventListener('click', openEditProfile);
    backButton.addEventListener('click', closeEditProfile);
    saveButton.addEventListener('click', saveProfileChanges);
    
    categoryBtn.addEventListener('click', openCategoryPage);
    categoryBackBtn.addEventListener('click', closeCategoryPage);
    categorySaveBtn.addEventListener('click', saveCategory);
    
    experienceBtn.addEventListener('click', openExperiencePage);
    experienceBackBtn.addEventListener('click', closeExperiencePage);
    experienceSaveBtn.addEventListener('click', saveExperience);
    
    skillsBtn.addEventListener('click', openSkillsPage);
    skillsBackBtn.addEventListener('click', closeSkillsPage);
    skillsSaveBtn.addEventListener('click', saveSkills);
    
    avatarUpload.addEventListener('change', handleAvatarUpload);
    coverUpload.addEventListener('change', handleCoverUpload);
    
    // Real-time username availability check
    usernameInput.addEventListener('input', debounce(checkUsernameAvailability, 500));
    
    // Populate category and skills pages
    populateCategories();
    populateSkills();
}

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

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
        availabilityMsg.className = 'username-availability taken';
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
        availabilityMsg.className = 'username-availability taken';
    } else {
        availabilityMsg.style.display = 'block';
        availabilityMsg.textContent = 'Username is available';
        availabilityMsg.className = 'username-availability available';
    }
}

function showLoader() {
    const loader = document.getElementById('full-page-loader');
    loader.style.display = 'flex';
    setTimeout(() => {
        loader.style.display = 'none';
    }, 5000); // 5 seconds loader
}

async function openEditProfile() {
    showLoader();
    
    setTimeout(async () => {
        const editPage = document.getElementById('edit-profile-page');
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();
        
        if (error) {
            console.error('Error loading profile for edit:', error);
            showError('Failed to load profile for editing');
            return;
        }
        
        // Populate form fields
        document.getElementById('edit-full-name').value = profile.full_name || '';
        document.getElementById('edit-username').value = profile.username || '';
        document.getElementById('edit-bio').value = profile.bio || '';
        document.getElementById('edit-website').value = profile.website || '';
        document.getElementById('edit-category-display').value = profile.category || '';
        document.getElementById('edit-category').value = profile.category || '';
        document.getElementById('edit-experience-display').value = profile.experience || '';
        document.getElementById('edit-experience').value = profile.experience || '';
        document.getElementById('edit-skills-display').value = profile.skills || '';
        document.getElementById('edit-skills').value = profile.skills || '';
        
        // Set preview images
        const avatarPreview = document.getElementById('avatar-preview');
        if (profile.avatar_url) {
            avatarPreview.src = profile.avatar_url;
        } else {
            const initials = profile.full_name ? 
                profile.full_name.split(' ').map(n => n[0]).join('') : 'U';
            avatarPreview.src = `https://ui-avatars.com/api/?name=${initials}&background=0056b3&color=fff&size=120`;
        }
        
        const coverPreview = document.getElementById('cover-preview');
        if (profile.cover_photo_url) {
            coverPreview.src = profile.cover_photo_url;
        } else {
            coverPreview.style.backgroundColor = '#0056b3';
        }
        
        // Store original username for comparison
        originalUsername = profile.username || '';
        
        // Reset file inputs
        avatarFile = null;
        coverFile = null;
        document.getElementById('edit-avatar-upload').value = '';
        document.getElementById('edit-cover-upload').value = '';
        document.getElementById('username-availability').style.display = 'none';
        
        // If profile has skills, parse them
        if (profile.skills) {
            selectedSkills = profile.skills.split(',').map(skill => skill.trim());
            updateSelectedSkillsDisplay();
        }
        
        // If profile has category, set it
        if (profile.category) {
            selectedCategory = profile.category;
            highlightSelectedCategory();
        }
        
        // If profile has experience, parse it
        if (profile.experience) {
            try {
                currentExperience = JSON.parse(profile.experience);
                populateExperienceForm();
            } catch (e) {
                console.error('Error parsing experience:', e);
            }
        }
        
        editPage.style.display = 'block';
    }, 5000); // Wait for loader to finish
}

function closeEditProfile() {
    document.getElementById('edit-profile-page').style.display = 'none';
}

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

function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (file) {
        coverFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('cover-preview').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function uploadToCloudinary(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'web_unsigned_upload');
    
    try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dwwhpznwb/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error(`Error uploading ${type} to Cloudinary:`, error);
        return null;
    }
}

async function saveProfileChanges(e) {
    e.preventDefault();
    
    const saveButton = document.getElementById('edit-save-button');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    const fullName = document.getElementById('edit-full-name').value.trim();
    const username = document.getElementById('edit-username').value.trim().toLowerCase();
    const bio = document.getElementById('edit-bio').value.trim();
    const website = document.getElementById('edit-website').value.trim();
    const category = document.getElementById('edit-category').value;
    const experience = document.getElementById('edit-experience').value;
    const skills = document.getElementById('edit-skills').value;
    
    // Check username availability one more time
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
            avatarUrl = await uploadToCloudinary(avatarFile, 'avatar');
            if (!avatarUrl) throw new Error('Failed to upload avatar');
        }
        
        // Upload cover if changed
        let coverUrl = null;
        if (coverFile) {
            coverUrl = await uploadToCloudinary(coverFile, 'cover');
            if (!coverUrl) throw new Error('Failed to upload cover photo');
        }
        
        // Update profile data
        const updates = {
            full_name: fullName,
            username: username,
            username_slug: username.toLowerCase().replace(/\s+/g, '-'),
            bio: bio,
            website: website,
            category: category,
            experience: experience,
            skills: skills,
            updated_at: new Date().toISOString()
        };
        
        if (avatarUrl) updates.avatar_url = avatarUrl;
        if (coverUrl) updates.cover_photo_url = coverUrl;
        
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

// Category Page Functions
function populateCategories() {
    const categoryGrid = document.querySelector('.category-grid');
    categoryGrid.innerHTML = '';
    
    aviationCategories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.textContent = category;
        item.addEventListener('click', () => {
            document.querySelectorAll('.category-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            selectedCategory = category;
        });
        categoryGrid.appendChild(item);
    });
}

function highlightSelectedCategory() {
    if (!selectedCategory) return;
    
    const categories = document.querySelectorAll('.category-item');
    categories.forEach(item => {
        if (item.textContent === selectedCategory) {
            item.classList.add('selected');
        }
    });
}

function openCategoryPage() {
    showLoader();
    
    setTimeout(() => {
        document.getElementById('category-page').style.display = 'block';
        highlightSelectedCategory();
    }, 5000);
}

function closeCategoryPage() {
    document.getElementById('category-page').style.display = 'none';
}

function saveCategory() {
    document.getElementById('edit-category-display').value = selectedCategory;
    document.getElementById('edit-category').value = selectedCategory;
    closeCategoryPage();
}

// Experience Page Functions
function populateExperienceForm() {
    if (!currentExperience) return;
    
    document.getElementById('experience-position').value = currentExperience.position || '';
    document.getElementById('experience-company').value = currentExperience.company || '';
    document.getElementById('experience-location').value = currentExperience.location || '';
    document.getElementById('experience-start').value = currentExperience.start || '';
    document.getElementById('experience-end').value = currentExperience.end || '';
    document.getElementById('experience-current').checked = currentExperience.current || false;
    document.getElementById('experience-description').value = currentExperience.description || '';
}

function openExperiencePage() {
    showLoader();
    
    setTimeout(() => {
        document.getElementById('experience-page').style.display = 'block';
        populateExperienceForm();
    }, 5000);
}

function closeExperiencePage() {
    document.getElementById('experience-page').style.display = 'none';
}

function saveExperience() {
    currentExperience = {
        position: document.getElementById('experience-position').value.trim(),
        company: document.getElementById('experience-company').value.trim(),
        location: document.getElementById('experience-location').value.trim(),
        start: document.getElementById('experience-start').value,
        end: document.getElementById('experience-current').checked ? '' : document.getElementById('experience-end').value,
        current: document.getElementById('experience-current').checked,
        description: document.getElementById('experience-description').value.trim()
    };
    
    const experienceJson = JSON.stringify(currentExperience);
    document.getElementById('edit-experience-display').value = 
        `${currentExperience.position} at ${currentExperience.company}`;
    document.getElementById('edit-experience').value = experienceJson;
    
    closeExperiencePage();
}

// Skills Page Functions
function populateSkills() {
    const skillsGrid = document.querySelector('.skills-grid');
    skillsGrid.innerHTML = '';
    
    aviationSkills.forEach(skill => {
        const item = document.createElement('div');
        item.className = 'skill-item';
        item.textContent = skill;
        
        if (selectedSkills.includes(skill)) {
            item.classList.add('selected');
        }
        
        item.addEventListener('click', () => {
            if (item.classList.contains('selected')) {
                item.classList.remove('selected');
                selectedSkills = selectedSkills.filter(s => s !== skill);
            } else {
                if (selectedSkills.length < 10) {
                    item.classList.add('selected');
                    selectedSkills.push(skill);
                } else {
                    showError('You can select maximum 10 skills');
                }
            }
            updateSelectedSkillsDisplay();
        });
        
        skillsGrid.appendChild(item);
    });
}

function updateSelectedSkillsDisplay() {
    const selectedList = document.getElementById('selected-skills-list');
    selectedList.innerHTML = '';
    
    selectedSkills.forEach(skill => {
        const skillElement = document.createElement('div');
        skillElement.className = 'selected-skill';
        skillElement.innerHTML = `
            ${skill}
            <button type="button" class="remove-skill" data-skill="${skill}">&times;</button>
        `;
        selectedList.appendChild(skillElement);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-skill').forEach(button => {
        button.addEventListener('click', (e) => {
            const skillToRemove = e.target.getAttribute('data-skill');
            selectedSkills = selectedSkills.filter(s => s !== skillToRemove);
            updateSelectedSkillsDisplay();
            
            // Also remove selection from grid
            document.querySelectorAll('.skill-item').forEach(item => {
                if (item.textContent === skillToRemove) {
                    item.classList.remove('selected');
                }
            });
        });
    });
}

function openSkillsPage() {
    showLoader();
    
    setTimeout(() => {
        document.getElementById('skills-page').style.display = 'block';
        updateSelectedSkillsDisplay();
    }, 5000);
}

function closeSkillsPage() {
    document.getElementById('skills-page').style.display = 'none';
}

function saveSkills() {
    const skillsString = selectedSkills.join(', ');
    document.getElementById('edit-skills-display').value = skillsString;
    document.getElementById('edit-skills').value = skillsString;
    closeSkillsPage();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    initEditProfile();
});
