// DOM Elements
const skeletonLoader = document.getElementById('skeleton-loader');
const profileContent = document.getElementById('profile-content');
const profileBanner = document.getElementById('profile-banner');
const profileAvatar = document.getElementById('profile-avatar');
const profileUsername = document.getElementById('profile-username');
const profileCategory = document.getElementById('profile-category');
const profileBio = document.getElementById('profile-bio');
const profileWebsite = document.getElementById('profile-website');
const followerCount = document.getElementById('follower-count');
const followingCount = document.getElementById('following-count');
const postCount = document.getElementById('post-count');
const editProfileButton = document.getElementById('edit-profile-button');
const postsGrid = document.getElementById('posts-grid');
const likedPostsGrid = document.getElementById('liked-posts-grid');
const headerTitle = document.getElementById('header-title');
const editModal = document.getElementById('edit-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editModalCancel = document.getElementById('edit-modal-cancel');
const editModalSave = document.getElementById('edit-modal-save');
const editAvatarPreview = document.getElementById('edit-avatar-preview');
const editAvatarButton = document.getElementById('edit-avatar-button');
const avatarUpload = document.getElementById('avatar-upload');
const editName = document.getElementById('edit-name');
const editUsername = document.getElementById('edit-username');
const editCategory = document.getElementById('edit-category');
const editBio = document.getElementById('edit-bio');
const editWebsite = document.getElementById('edit-website');
const copyProfileLink = document.getElementById('copy-profile-link');
const postTabs = document.querySelectorAll('.post-tab');

// State variables
let currentUser = null;
let profileData = null;
let userPosts = [];
let likedPosts = [];

// Initialize the profile page
async function init() {
    try {
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        // Load all profile data
        await loadProfileData(user.id);
        await loadUserPosts(user.id);
        await loadLikedPosts(user.id);

        setupEventListeners();
        
    } catch (error) {
        console.error("Profile initialization error:", error);
        displayErrorState(error.message || "Failed to load profile");
    }
}

// Load profile data with proper error handling
async function loadProfileData(userId) {
    try {
        showLoadingState(true);
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
                id,
                username,
                full_name,
                avatar_url,
                bio,
                website,
                category,
                followers,
                following,
                verified,
                banner_url
            `)
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;
        if (!profile) throw new Error("Profile not found");
        if (!profile.username) {
            console.warn("Username missing in profile:", profile);
            throw new Error("Username is required");
        }

        profileData = profile;
        updateProfileUI(profile);
        
    } catch (error) {
        console.error("Error loading profile:", error);
        throw error;
    } finally {
        showLoadingState(false);
    }
}

// Update profile UI with validated data
function updateProfileUI(profile) {
    // Username with fallback
    const safeUsername = profile.username || 'user';
    profileUsername.textContent = `@${safeUsername}`;
    editUsername.value = safeUsername;

    // Name and avatar
    const displayName = profile.full_name || safeUsername;
    const initials = displayName.charAt(0).toUpperCase();
    profileAvatar.textContent = initials;
    editAvatarPreview.textContent = initials;
    headerTitle.textContent = displayName;
    editName.value = profile.full_name || '';

    // Stats
    followerCount.textContent = formatNumber(profile.followers || 0);
    followingCount.textContent = formatNumber(profile.following || 0);

    // Category
    profileCategory.textContent = profile.category || "No category";
    profileCategory.style.color = profile.category ? '' : '#777';
    editCategory.value = profile.category || '';

    // Bio
    if (profile.bio) {
        profileBio.textContent = profile.bio;
        profileBio.style.display = 'block';
        editBio.value = profile.bio;
    } else {
        profileBio.style.display = 'none';
        editBio.value = '';
    }

    // Website
    if (profile.website) {
        profileWebsite.href = profile.website;
        profileWebsite.textContent = profile.website.replace(/^https?:\/\//, '');
        profileWebsite.style.display = 'inline';
        editWebsite.value = profile.website;
    } else {
        profileWebsite.style.display = 'none';
        editWebsite.value = '';
    }

    // Banner
    if (profile.banner_url) {
        profileBanner.style.backgroundImage = `url(${profile.banner_url})`;
        profileBanner.style.backgroundSize = 'cover';
    }
}

// Loading state management
function showLoadingState(show) {
    skeletonLoader.style.display = show ? 'flex' : 'none';
    profileContent.style.display = show ? 'none' : 'block';
}

// Error handling
function displayErrorState(message) {
    skeletonLoader.style.display = 'none';
    profileContent.innerHTML = `
        <div class="profile-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <button onclick="location.reload()">
                <i class="fas fa-sync-alt"></i> Try Again
            </button>
        </div>
    `;
    profileContent.style.display = 'block';
}

// Post loading functions
async function loadUserPosts(userId) {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        userPosts = error ? [] : posts;
        displayPosts();
    } catch (error) {
        console.error("Error loading posts:", error);
        userPosts = [];
        displayPosts();
    }
}

async function loadLikedPosts(userId) {
    try {
        const { data: likes, error: likesError } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', userId);

        if (likesError || !likes?.length) {
            likedPosts = [];
        } else {
            const postIds = likes.map(like => like.post_id);
            const { data: posts, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .in('id', postIds);

            likedPosts = postsError ? [] : posts;
        }
        displayLikedPosts();
    } catch (error) {
        console.error("Error loading liked posts:", error);
        likedPosts = [];
        displayLikedPosts();
    }
}

// Post display functions
function displayPosts() {
    postsGrid.innerHTML = userPosts.length ? 
        userPosts.map(post => createPostItem(post)).join('') : 
        createEmptyState("No posts yet");
}

function displayLikedPosts() {
    likedPostsGrid.innerHTML = likedPosts.length ? 
        likedPosts.map(post => createPostItem(post)).join('') : 
        createEmptyState("No liked posts yet");
}

function createPostItem(post) {
    return `
        <div class="post-item" onclick="window.location.href='post.html?id=${post.id}'">
            ${post.image_url ? `
                <img src="${post.image_url}" alt="Post">
            ` : post.video_url ? `
                <div class="video-container">
                    <video>
                        <source src="${post.video_url}" type="video/mp4">
                    </video>
                    <div class="play-indicator">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
            ` : `
                <div class="text-post">
                    ${post.content || 'Post'}
                </div>
            `}
        </div>
    `;
}

function createEmptyState(message) {
    return `
        <div class="empty-state">
            <i class="far fa-folder-open"></i>
            <p>${message}</p>
        </div>
    `;
}

// Tab switching
function handleTabClick(tab) {
    postTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    const tabType = tab.dataset.tab;
    postsGrid.style.display = tabType === 'posts' ? 'grid' : 'none';
    likedPostsGrid.style.display = tabType === 'liked' ? 'grid' : 'none';
}

// Event listeners
function setupEventListeners() {
    // Edit profile
    editProfileButton.addEventListener('click', () => editModal.classList.add('show'));
    editModalClose.addEventListener('click', () => editModal.classList.remove('show'));
    editModalCancel.addEventListener('click', () => editModal.classList.remove('show'));
    
    // Save changes
    editModalSave.addEventListener('click', saveProfileChanges);
    
    // Avatar upload
    editAvatarButton.addEventListener('click', () => avatarUpload.click());
    avatarUpload.addEventListener('change', handleAvatarUpload);
    
    // Copy profile link
    copyProfileLink.addEventListener('click', copyProfileUrl);
    
    // Post tabs
    postTabs.forEach(tab => {
        tab.addEventListener('click', () => handleTabClick(tab));
    });
}

async function saveProfileChanges() {
    try {
        const updates = {
            full_name: editName.value.trim(),
            username: editUsername.value.trim(),
            category: editCategory.value.trim(),
            bio: editBio.value.trim(),
            website: editWebsite.value.trim()
        };

        // Validate username
        if (!updates.username) {
            throw new Error("Username cannot be empty");
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id);

        if (error) throw error;

        // Refresh profile data
        await loadProfileData(currentUser.id);
        editModal.classList.remove('show');
        
    } catch (error) {
        console.error("Error saving profile:", error);
        alert(`Save failed: ${error.message}`);
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'profile-avatar';
        img.alt = 'Profile Avatar';

        // Update main avatar
        if (profileAvatar.classList.contains('initials-avatar')) {
            profileAvatar.replaceWith(img);
        } else {
            profileAvatar.src = e.target.result;
        }

        // Update edit modal avatar
        if (editAvatarPreview.classList.contains('initials-avatar')) {
            const previewImg = document.createElement('img');
            previewImg.src = e.target.result;
            previewImg.className = 'edit-avatar';
            editAvatarPreview.replaceWith(previewImg);
        } else {
            editAvatarPreview.src = e.target.result;
        }

        // TODO: Upload to Supabase storage
    };
    reader.readAsDataURL(file);
}

function copyProfileUrl() {
    const url = `${window.location.origin}/profile.html?user=${profileData.username}`;
    navigator.clipboard.writeText(url)
        .then(() => alert("Profile link copied!"))
        .catch(() => alert("Failed to copy link"));
}

// Helper function
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
