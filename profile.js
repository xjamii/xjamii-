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
let isLoading = false;

// Initialize the page
async function init() {
    try {
        // Check dark mode before showing preloader
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
        
        // Show skeleton immediately
        showSkeleton();
        
        // Check if user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        
        // Load profile data
        await loadProfileData(user.id);
        
        // Set up event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error("Initialization error:", error);
        displayErrorState();
    } finally {
        // Ensure skeleton is hidden after all operations
        hideSkeleton();
    }
}

// Show skeleton loader
function showSkeleton() {
    isLoading = true;
    skeletonLoader.style.display = 'flex';
    profileContent.style.opacity = '0.5';
    profileContent.style.pointerEvents = 'none';
}

// Hide skeleton loader
function hideSkeleton() {
    isLoading = false;
    skeletonLoader.style.display = 'none';
    profileContent.style.opacity = '1';
    profileContent.style.pointerEvents = 'auto';
}

// Load profile data from Supabase
async function loadProfileData(profileId) {
    showSkeleton();
    
    try {
        // Get profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();
        
        if (profileError) throw profileError;
        if (!profile) throw new Error("Profile not found");
        
        // Ensure username exists
        if (!profile.username) {
            profile.username = generateFallbackUsername(profile);
        }
        
        profileData = profile;
        
        // Get stats
        const followers = profile.followers || 0;
        const following = profile.following || 0;
        
        // Get real post count
        const { count: postsCount, error: postsError } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profileId);
        
        const posts = postsError ? 0 : postsCount;
        
        // Load user posts and liked posts in parallel
        await Promise.all([
            loadUserPosts(profileId),
            loadLikedPosts(profileId)
        ]);
        
        // Display the profile
        displayProfile(profile, followers, following, posts);
        
    } catch (error) {
        console.error("Error loading profile:", error);
        displayErrorState();
    }
}

// Generate fallback username if missing
function generateFallbackUsername(profile) {
    if (profile.full_name) {
        return profile.full_name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
    }
    return 'user' + Math.floor(Math.random() * 10000);
}

// Load user posts
async function loadUserPosts(userId) {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        userPosts = posts || [];
        displayPosts();
        
    } catch (error) {
        console.error("Error loading posts:", error);
        userPosts = [];
        displayPosts();
    }
}

// Load liked posts
async function loadLikedPosts(userId) {
    try {
        const { data: likes, error: likesError } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', userId);
        
        if (likesError) throw likesError;
        
        if (likes.length > 0) {
            const postIds = likes.map(like => like.post_id);
            const { data: posts, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .in('id', postIds)
                .order('created_at', { ascending: false });
            
            if (postsError) throw postsError;
            
            likedPosts = posts || [];
        } else {
            likedPosts = [];
        }
        
        displayLikedPosts();
        
    } catch (error) {
        console.error("Error loading liked posts:", error);
        likedPosts = [];
        displayLikedPosts();
    }
}

// Display user posts
function displayPosts() {
    postsGrid.innerHTML = '';
    
    if (userPosts.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No posts yet';
        postsGrid.appendChild(emptyMessage);
        return;
    }
    
    userPosts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        
        if (post.image_url) {
            postItem.innerHTML = `<img src="${post.image_url}" alt="Post" loading="lazy">`;
        } else if (post.video_url) {
            postItem.innerHTML = `
                <div class="video-container">
                    <video>
                        <source src="${post.video_url}" type="video/mp4">
                    </video>
                    <div class="video-badge">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
            `;
        } else {
            postItem.innerHTML = `
                <div class="text-post">
                    ${post.content || 'Post'}
                </div>
            `;
        }
        
        postItem.addEventListener('click', () => {
            window.location.href = `post.html?id=${post.id}`;
        });
        
        postsGrid.appendChild(postItem);
    });
}

// Display liked posts
function displayLikedPosts() {
    likedPostsGrid.innerHTML = '';
    
    if (likedPosts.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No liked posts yet';
        likedPostsGrid.appendChild(emptyMessage);
        return;
    }
    
    likedPosts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        
        if (post.image_url) {
            postItem.innerHTML = `<img src="${post.image_url}" alt="Post" loading="lazy">`;
        } else if (post.video_url) {
            postItem.innerHTML = `
                <div class="video-container">
                    <video>
                        <source src="${post.video_url}" type="video/mp4">
                    </video>
                    <div class="video-badge">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
            `;
        } else {
            postItem.innerHTML = `
                <div class="text-post">
                    ${post.content || 'Post'}
                </div>
            `;
        }
        
        postItem.addEventListener('click', () => {
            window.location.href = `post.html?id=${post.id}`;
        });
        
        likedPostsGrid.appendChild(postItem);
    });
}

// Display the profile with data
function displayProfile(profile, followers, following, posts) {
    // Set banner (if available)
    if (profile.banner_url) {
        profileBanner.style.backgroundImage = `url(${profile.banner_url})`;
        profileBanner.style.backgroundSize = 'cover';
        profileBanner.style.backgroundPosition = 'center';
    }
    
    // Set avatar based on username's first letter
    const displayName = profile.full_name || profile.username || 'User';
    const firstLetter = displayName.charAt(0).toUpperCase();
    
    if (profileAvatar.classList.contains('initials-avatar')) {
        profileAvatar.textContent = firstLetter;
    }
    
    if (editAvatarPreview.classList.contains('initials-avatar')) {
        editAvatarPreview.textContent = firstLetter;
    }
    
    // Set names with proper validation
    if (profile.username) {
        profileUsername.textContent = `@${profile.username}`;
        editUsername.value = profile.username;
    } else {
        profileUsername.textContent = '@user';
        editUsername.value = '';
    }
    
    editName.value = profile.full_name || '';
    
    // Update header title
    headerTitle.textContent = profile.full_name || profile.username || 'Profile';
    
    // Set category
    if (profile.category) {
        profileCategory.textContent = profile.category;
        profileCategory.style.color = '';
        profileCategory.style.fontStyle = '';
    } else {
        profileCategory.textContent = "No category";
        profileCategory.style.color = '#777';
        profileCategory.style.fontStyle = 'italic';
    }
    editCategory.value = profile.category || '';
    
    // Set bio
    if (profile.bio) {
        profileBio.textContent = profile.bio;
        profileBio.style.display = 'block';
        profileBio.style.color = '';
    } else {
        profileBio.textContent = 'No bio yet';
        profileBio.style.display = 'block';
        profileBio.style.color = '#777';
    }
    editBio.value = profile.bio || '';
    
    // Set website
    if (profile.website) {
        profileWebsite.href = profile.website;
        profileWebsite.textContent = profile.website.replace(/^https?:\/\//, '');
        profileWebsite.style.display = 'inline';
    } else {
        profileWebsite.style.display = 'none';
    }
    editWebsite.value = profile.website || '';
    
    // Set stats
    followerCount.textContent = formatNumber(followers);
    followingCount.textContent = formatNumber(following);
    postCount.textContent = formatNumber(posts);
    
    // Hide skeleton and show content
    hideSkeleton();
}

// Format large numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Display error state
function displayErrorState() {
    hideSkeleton();
    
    // Set error states
    profileUsername.textContent = '@user';
    profileBio.textContent = 'Failed to load profile data. Please try again later.';
    profileBio.style.color = '#ff4444';
    profileBio.style.display = 'block';
    
    // Disable edit button
    editProfileButton.disabled = true;
}

// Handle tab switching
function handleTabClick(tab) {
    if (isLoading) return;
    
    postTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    const tabType = tab.getAttribute('data-tab');
    if (tabType === 'posts') {
        postsGrid.style.display = 'grid';
        likedPostsGrid.style.display = 'none';
    } else if (tabType === 'liked') {
        postsGrid.style.display = 'none';
        likedPostsGrid.style.display = 'grid';
    }
}

// Set up event listeners
function setupEventListeners() {
    // Edit profile button
    editProfileButton.addEventListener('click', () => {
        if (!isLoading) {
            editModal.classList.add('show');
        }
    });
    
    // Close modal buttons
    editModalClose.addEventListener('click', () => {
        editModal.classList.remove('show');
    });
    
    editModalCancel.addEventListener('click', () => {
        editModal.classList.remove('show');
    });
    
    // Save changes button
    editModalSave.addEventListener('click', async () => {
        if (isLoading) return;
        
        const newName = editName.value.trim();
        const newUsername = editUsername.value.trim().toLowerCase();
        const newCategory = editCategory.value.trim();
        const newBio = editBio.value.trim();
        const newWebsite = editWebsite.value.trim();
        
        try {
            showSkeleton();
            
            // Update in database
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: newName || null,
                    username: newUsername,
                    category: newCategory || null,
                    bio: newBio || null,
                    website: newWebsite || null
                })
                .eq('id', currentUser.id);
            
            if (error) throw error;
            
            // Update UI
            if (newName) {
                headerTitle.textContent = newName;
            }
            
            if (newUsername) {
                profileUsername.textContent = `@${newUsername}`;
            }
            
            profileCategory.textContent = newCategory || "No category";
            profileCategory.style.color = newCategory ? '' : '#777';
            profileCategory.style.fontStyle = newCategory ? '' : 'italic';
            
            profileBio.textContent = newBio || 'No bio yet';
            profileBio.style.color = newBio ? '' : '#777';
            
            if (newWebsite) {
                profileWebsite.href = newWebsite;
                profileWebsite.textContent = newWebsite.replace(/^https?:\/\//, '');
                profileWebsite.style.display = 'inline';
            } else {
                profileWebsite.style.display = 'none';
            }
            
            editModal.classList.remove('show');
            
        } catch (error) {
            console.error("Error updating profile:", error);
            alert('Failed to update profile. Please try again.');
        } finally {
            hideSkeleton();
        }
    });
    
    // Change avatar button
    editAvatarButton.addEventListener('click', () => {
        if (!isLoading) {
            avatarUpload.click();
        }
    });
    
    // Avatar upload
    avatarUpload.addEventListener('change', (e) => {
        if (isLoading) return;
        
        const file = e.target.files[0];
        if (file) {
            showSkeleton();
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    // Upload to storage
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${currentUser.id}-avatar.${fileExt}`;
                    const filePath = `avatars/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, file, { upsert: true });
                    
                    if (uploadError) throw uploadError;
                    
                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(filePath);
                    
                    // Update profile with avatar URL
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ avatar_url: publicUrl })
                        .eq('id', currentUser.id);
                    
                    if (updateError) throw updateError;
                    
                    // Update UI
                    const img = document.createElement('img');
                    img.src = publicUrl;
                    img.className = 'profile-avatar';
                    img.alt = 'Profile Avatar';
                    
                    if (profileAvatar.classList.contains('initials-avatar')) {
                        profileAvatar.replaceWith(img);
                        profileAvatar = img;
                    } else {
                        profileAvatar.src = publicUrl;
                    }
                    
                    const imgPreview = document.createElement('img');
                    imgPreview.src = publicUrl;
                    imgPreview.className = 'edit-avatar';
                    imgPreview.alt = 'Profile Avatar';
                    
                    if (editAvatarPreview.classList.contains('initials-avatar')) {
                        editAvatarPreview.replaceWith(imgPreview);
                        editAvatarPreview = imgPreview;
                    } else {
                        editAvatarPreview.src = publicUrl;
                    }
                    
                } catch (error) {
                    console.error("Error uploading avatar:", error);
                    alert('Failed to upload avatar. Please try again.');
                } finally {
                    hideSkeleton();
                }
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Copy profile link
    copyProfileLink.addEventListener('click', () => {
        if (isLoading) return;
        
        const profileLink = `${window.location.origin}/profile.html?user=${profileData.username || currentUser.id}`;
        navigator.clipboard.writeText(profileLink).then(() => {
            alert('Profile link copied to clipboard!');
        });
    });
    
    // Post tabs
    postTabs.forEach(tab => {
        tab.addEventListener('click', () => handleTabClick(tab));
    });
}

// Initialize the page when loaded
document.addEventListener('DOMContentLoaded', init);
