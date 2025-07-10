// Cloudinary Configuration
const cloudinaryConfig = {
    cloudName: 'dwwhpznwb',
    uploadPreset: 'web_usigned_upload',
    apiKey: 'your_api_key' // Replace with your actual API key
};

// Global variables
let avatarFile = null;
let coverFile = null;
let originalUsername = '';
let selectedCategories = [];
let selectedSkills = [];
let experienceData = [];

// Initialize edit profile functionality
function initEditProfile() {
    const editButton = document.getElementById('edit-button');
    const backFromEdit = document.getElementById('back-from-edit');
    const saveProfileBtn = document.getElementById('save-profile-changes');
    
    // Category page elements
    const selectCategoryBtn = document.getElementById('select-category-btn');
    const backFromCategory = document.getElementById('back-from-category');
    const saveCategoryBtn = document.getElementById('save-category');
    
    // Experience page elements
    const selectExperienceBtn = document.getElementById('select-experience-btn');
    const backFromExperience = document.getElementById('back-from-experience');
    const saveExperienceBtn = document.getElementById('save-experience');
    
    // Skills page elements
    const selectSkillsBtn = document.getElementById('select-skills-btn');
    const backFromSkills = document.getElementById('back-from-skills');
    const saveSkillsBtn = document.getElementById('save-skills');
    
    // File upload elements
    const avatarUpload = document.getElementById('edit-avatar-upload');
    const coverUpload = document.getElementById('edit-cover-upload');
    
    // Username input
    const usernameInput = document.getElementById('edit-username');
    
    // Event listeners
    editButton.addEventListener('click', openEditProfile);
    backFromEdit.addEventListener('click', closeEditProfile);
    saveProfileBtn.addEventListener('click', saveProfileChanges);
    
    selectCategoryBtn.addEventListener('click', openCategoryPage);
    backFromCategory.addEventListener('click', closeCategoryPage);
    saveCategoryBtn.addEventListener('click', saveCategory);
    
    selectExperienceBtn.addEventListener('click', openExperiencePage);
    backFromExperience.addEventListener('click', closeExperiencePage);
    saveExperienceBtn.addEventListener('click', saveExperience);
    
    selectSkillsBtn.addEventListener('click', openSkillsPage);
    backFromSkills.addEventListener('click', closeSkillsPage);
    saveSkillsBtn.addEventListener('click', saveSkills);
    
    avatarUpload.addEventListener('change', handleAvatarUpload);
    coverUpload.addEventListener('change', handleCoverUpload);
    
    // Real-time username availability check
    usernameInput.addEventListener('input', debounce(checkUsernameAvailability, 500));
    
    // Populate category options
    populateCategories();
    
    // Populate skills options
    populateSkills();
    
    // Populate years for experience
    populateYears();
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
    
    // Load profile data after 5 seconds (simulated)
    setTimeout(async () => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .single();
            
            if (error) throw error;
            
            // Populate form fields
            document.getElementById('edit-full-name').value = profile.full_name || '';
            document.getElementById('edit-username').value = profile.username || '';
            document.getElementById('edit-bio').value = profile.bio || '';
            document.getElementById('edit-website').value = profile.website || '';
            document.getElementById('edit-category').value = profile.category || '';
            document.getElementById('edit-category-display').value = profile.category || '';
            document.getElementById('edit-experience').value = profile.experience || '';
            document.getElementById('edit-experience-display').value = profile.experience ? 'Experience added' : '';
            document.getElementById('edit-skills').value = profile.skills || '';
            document.getElementById('edit-skills-display').value = profile.skills ? 'Skills selected' : '';
            
            // Set avatar preview
            const avatarPreview = document.getElementById('avatar-preview');
            if (profile.avatar_url) {
                avatarPreview.src = profile.avatar_url;
            } else {
                const initials = profile.full_name ? 
                    profile.full_name.split(' ').map(n => n[0]).join('') : 'U';
                avatarPreview.src = `https://ui-avatars.com/api/?name=${initials}&background=0056b3&color=fff&size=120`;
            }
            
            // Set cover preview
            const coverPreview = document.getElementById('cover-preview');
            const coverPlaceholder = document.getElementById('cover-placeholder');
            if (profile.cover_photo_url) {
                coverPreview.src = profile.cover_photo_url;
                coverPreview.style.display = 'block';
                coverPlaceholder.style.display = 'none';
            } else {
                coverPreview.style.display = 'none';
                coverPlaceholder.style.display = 'flex';
            }
            
            // Store original username
            originalUsername = profile.username || '';
            
            // Hide preloader
            preloader.style.display = 'none';
            
        } catch (error) {
            console.error('Error loading profile for edit:', error);
            showError('Failed to load profile for editing');
            preloader.style.display = 'none';
        }
    }, 5000);
}

// Close edit profile page
function closeEditProfile() {
    document.getElementById('edit-profile-page').style.display = 'none';
}

// Handle avatar upload
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

// Handle cover upload
function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (file) {
        coverFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            const coverPreview = document.getElementById('cover-preview');
            const coverPlaceholder = document.getElementById('cover-placeholder');
            coverPreview.src = event.target.result;
            coverPreview.style.display = 'block';
            coverPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// Check username availability
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

// Upload image to Cloudinary
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

// Save profile changes
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
    const experience = document.getElementById('edit-experience').value;
    const skills = document.getElementById('edit-skills').value;
    
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
        
        // Prepare updates
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

// Category Page Functions
function openCategoryPage() {
    const categoryPage = document.getElementById('category-page');
    const preloader = document.getElementById('category-preloader');
    
    categoryPage.style.display = 'block';
    preloader.style.display = 'flex';
    
    setTimeout(() => {
        preloader.style.display = 'none';
    }, 5000);
}

function closeCategoryPage() {
    document.getElementById('category-page').style.display = 'none';
}

function populateCategories() {
    const categories = [
        // Commercial Aviation
        'Airline Pilot', 'First Officer', 'Captain', 'Flight Instructor',
        'Flight Attendant', 'Purser', 'Cabin Crew Manager', 'Ground Staff',
        'Air Traffic Controller', 'Dispatcher', 'Flight Operations Officer',
        
        // Technical Roles
        'Aircraft Engineer', 'Avionics Technician', 'Maintenance Technician',
        'Quality Assurance', 'Safety Inspector', 'Aircraft Mechanic',
        
        // Management
        'Airline CEO', 'Operations Manager', 'Flight Operations Manager',
        'Maintenance Manager', 'Training Manager', 'Safety Manager',
        
        // Helicopter
        'Helicopter Pilot', 'HEMS Pilot', 'Offshore Pilot', 'Flight Paramedic',
        
        // Other
        'Aviation Consultant', 'Broker', 'Charter Operator', 'FBO Manager',
        'Aviation Lawyer', 'Aviation Journalist', 'Aircraft Sales'
    ];
    
    const categoryGrid = document.getElementById('category-grid');
    categoryGrid.innerHTML = '';
    
    const currentCategory = document.getElementById('edit-category').value;
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = `category-item ${currentCategory === category ? 'selected' : ''}`;
        item.textContent = category;
        item.addEventListener('click', () => {
            document.querySelectorAll('.category-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
        });
        categoryGrid.appendChild(item);
    });
}

function saveCategory() {
    const selectedItem = document.querySelector('.category-item.selected');
    if (selectedItem) {
        document.getElementById('edit-category').value = selectedItem.textContent;
        document.getElementById('edit-category-display').value = selectedItem.textContent;
    }
    closeCategoryPage();
}

// Experience Page Functions
function openExperiencePage() {
    const experiencePage = document.getElementById('experience-page');
    const preloader = document.getElementById('experience-preloader');
    
    experiencePage.style.display = 'block';
    preloader.style.display = 'flex';
    
    // Load existing experience if available
    const experienceText = document.getElementById('edit-experience').value;
    if (experienceText) {
        try {
            const experience = JSON.parse(experienceText);
            document.getElementById('experience-position').value = experience.position || '';
            document.getElementById('experience-company').value = experience.company || '';
            document.getElementById('experience-start-year').value = experience.startYear || '';
            document.getElementById('experience-end-year').value = experience.endYear || '';
            document.getElementById('experience-description').value = experience.description || '';
        } catch (e) {
            console.error('Error parsing experience:', e);
        }
    }
    
    setTimeout(() => {
        preloader.style.display = 'none';
    }, 5000);
}

function closeExperiencePage() {
    document.getElementById('experience-page').style.display = 'none';
}

function populateYears() {
    const startYearSelect = document.getElementById('experience-start-year');
    const endYearSelect = document.getElementById('experience-end-year');
    
    const currentYear = new Date().getFullYear();
    const earliestYear = currentYear - 50;
    
    startYearSelect.innerHTML = '<option value="">Start Year</option>';
    endYearSelect.innerHTML = '<option value="">End Year</option><option value="Present">Present</option>';
    
    for (let year = currentYear; year >= earliestYear; year--) {
        startYearSelect.add(new Option(year, year));
        endYearSelect.add(new Option(year, year));
    }
}

function saveExperience() {
    const position = document.getElementById('experience-position').value.trim();
    const company = document.getElementById('experience-company').value.trim();
    const startYear = document.getElementById('experience-start-year').value;
    const endYear = document.getElementById('experience-end-year').value;
    const description = document.getElementById('experience-description').value.trim();
    
    if (position && company && startYear) {
        const experience = {
            position,
            company,
            startYear,
            endYear,
            description
        };
        
        document.getElementById('edit-experience').value = JSON.stringify(experience);
        document.getElementById('edit-experience-display').value = `${position} at ${company}`;
    }
    
    closeExperiencePage();
}

// Skills Page Functions
function openSkillsPage() {
    const skillsPage = document.getElementById('skills-page');
    const preloader = document.getElementById('skills-preloader');
    
    skillsPage.style.display = 'block';
    preloader.style.display = 'flex';
    
    // Load selected skills if available
    const skillsText = document.getElementById('edit-skills').value;
    if (skillsText) {
        selectedSkills = skillsText.split(',').map(skill => skill.trim()).filter(skill => skill);
        updateSelectedSkillsDisplay();
    }
    
    setTimeout(() => {
        preloader.style.display = 'none';
    }, 5000);
}

function closeSkillsPage() {
    document.getElementById('skills-page').style.display = 'none';
}

function populateSkills() {
    const skills = [
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
    
    const skillsGrid = document.getElementById('skills-grid');
    skillsGrid.innerHTML = '';
    
    skills.forEach(skill => {
        const item = document.createElement('div');
        item.className = `skill-item ${selectedSkills.includes(skill) ? 'selected' : ''}`;
        item.textContent = skill;
        item.addEventListener('click', () => {
            if (selectedSkills.includes(skill)) {
                selectedSkills = selectedSkills.filter(s => s !== skill);
                item.classList.remove('selected');
            } else if (selectedSkills.length < 10) {
                selectedSkills.push(skill);
                item.classList.add('selected');
            }
            updateSelectedSkillsDisplay();
        });
        skillsGrid.appendChild(item);
    });
}

function updateSelectedSkillsDisplay() {
    const skillsChips = document.getElementById('skills-chips');
    const selectedCount = document.getElementById('selected-count');
    
    skillsChips.innerHTML = '';
    selectedCount.textContent = selectedSkills.length;
    
    selectedSkills.forEach(skill => {
        const chip = document.createElement('div');
        chip.className = 'skill-chip';
        chip.innerHTML = `${skill} <i class="fas fa-times"></i>`;
        
        chip.querySelector('i').addEventListener('click', (e) => {
            e.stopPropagation();
            selectedSkills = selectedSkills.filter(s => s !== skill);
            updateSelectedSkillsDisplay();
            
            // Also remove selection from grid
            document.querySelectorAll('.skill-item').forEach(item => {
                if (item.textContent === skill) {
                    item.classList.remove('selected');
                }
            });
        });
        
        skillsChips.appendChild(chip);
    });
}

function saveSkills() {
    document.getElementById('edit-skills').value = selectedSkills.join(', ');
    document.getElementById('edit-skills-display').value = selectedSkills.length > 0 
        ? `${selectedSkills.length} skills selected` 
        : '';
    closeSkillsPage();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    initEditProfile();
});
