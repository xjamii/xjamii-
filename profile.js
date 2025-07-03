
    
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

        // Initialize the page
        async function init() {
            try {
                // Check dark mode before showing preloader
                if (localStorage.getItem('darkMode') === 'true') {
                    document.body.classList.add('dark-mode');
                }
                
                // Check if user is logged in
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                
                if (authError || !user) {
                    window.location.href = 'login.html';
                    return;
                }
                
                currentUser = user;
                
                // Load profile data (in a real app, you'd get the profile ID from URL params)
                await loadProfileData(user.id);
                
                // Set up event listeners
                setupEventListeners();
                
            } catch (error) {
                console.error("Initialization error:", error);
                displayErrorState();
            }
        }

        // Load profile data from Supabase
        async function loadProfileData(profileId) {
            try {
                // Show skeleton loader
                skeletonLoader.style.display = 'flex';
                profileContent.style.display = 'none';
                
                // Get profile data
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', profileId)
                    .single();
                
                if (profileError) throw profileError;
                
                profileData = profile;
                
                // Get stats (in a real app, you'd have these in your database)
                const followers = profile.followers || 0;
                const following = profile.following || 0;
                
                // Get real post count
                const { count: postsCount, error: postsError } = await supabase
                    .from('posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', profileId);
                
                const posts = postsError ? 0 : postsCount;
                
                // Load user posts
                await loadUserPosts(profileId);
                
                // Load liked posts
                await loadLikedPosts(profileId);
                
                // Display the profile
                displayProfile(profile, followers, following, posts);
                
            } catch (error) {
                console.error("Error loading profile:", error);
                displayErrorState();
            }
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
                emptyMessage.textContent = 'No posts yet';
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.gridColumn = '1 / -1';
                emptyMessage.style.padding = '20px';
                emptyMessage.style.color = '#777';
                postsGrid.appendChild(emptyMessage);
                return;
            }
            
            userPosts.forEach(post => {
                const postItem = document.createElement('div');
                postItem.className = 'post-item';
                
                if (post.image_url) {
                    postItem.innerHTML = `<img src="${post.image_url}" alt="Post">`;
                } else if (post.video_url) {
                    postItem.innerHTML = `
                        <div style="position: relative; width: 100%; height: 100%;">
                            <video style="width: 100%; height: 100%; object-fit: cover;">
                                <source src="${post.video_url}" type="video/mp4">
                            </video>
                            <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; padding: 2px 5px; border-radius: 4px; font-size: 12px;">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                    `;
                } else {
                    postItem.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background-color: #f0f0f0; color: #777; padding: 10px; text-align: center;">
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
                emptyMessage.textContent = 'No liked posts yet';
                emptyMessage.style.textAlign = 'center';
                emptyMessage.style.gridColumn = '1 / -1';
                emptyMessage.style.padding = '20px';
                emptyMessage.style.color = '#777';
                likedPostsGrid.appendChild(emptyMessage);
                return;
            }
            
            likedPosts.forEach(post => {
                const postItem = document.createElement('div');
                postItem.className = 'post-item';
                
                if (post.image_url) {
                    postItem.innerHTML = `<img src="${post.image_url}" alt="Post">`;
                } else if (post.video_url) {
                    postItem.innerHTML = `
                        <div style="position: relative; width: 100%; height: 100%;">
                            <video style="width: 100%; height: 100%; object-fit: cover;">
                                <source src="${post.video_url}" type="video/mp4">
                            </video>
                            <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; padding: 2px 5px; border-radius: 4px; font-size: 12px;">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                    `;
                } else {
                    postItem.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background-color: #f0f0f0; color: #777; padding: 10px; text-align: center;">
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
            profileAvatar.textContent = firstLetter;
            editAvatarPreview.textContent = firstLetter;
            
            // Set names
            profileUsername.textContent = `@${profile.username}`;
            editName.value = profile.full_name || '';
            editUsername.value = profile.username || '';
            
            // Update header title
            headerTitle.textContent = profile.full_name || profile.username;
            
            // Set category
            if (profile.category) {
                profileCategory.textContent = profile.category;
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
            } else {
                profileBio.style.display = 'none';
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
            skeletonLoader.style.display = 'none';
            profileContent.style.display = 'block';
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
            skeletonLoader.style.display = 'none';
            profileContent.style.display = 'block';
            
            // Set error states
            profileUsername.textContent = '@error';
            profileBio.textContent = 'Failed to load profile data. Please try again later.';
            profileBio.style.color = '#ff4444';
        }

        // Handle tab switching
        function handleTabClick(tab) {
            // Remove active class from all tabs
            postTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show the corresponding content
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
                editModal.classList.add('show');
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
                // In a real app, you would save the changes to the database here
                const newName = editName.value.trim();
                const newUsername = editUsername.value.trim();
                const newCategory = editCategory.value.trim();
                const newBio = editBio.value.trim();
                const newWebsite = editWebsite.value.trim();
                
                if (newName) {
                    headerTitle.textContent = newName;
                }
                
                if (newUsername) {
                    profileUsername.textContent = `@${newUsername}`;
                }
                
                if (newCategory) {
                    profileCategory.textContent = newCategory;
                    profileCategory.style.color = '';
                    profileCategory.style.fontStyle = '';
                } else {
                    profileCategory.textContent = "No category";
                    profileCategory.style.color = '#777';
                    profileCategory.style.fontStyle = 'italic';
                }
                
                if (newBio) {
                    profileBio.textContent = newBio;
                    profileBio.style.display = 'block';
                    profileBio.style.color = '';
                    profileBio.style.fontStyle = '';
                } else {
                    profileBio.style.display = 'none';
                }
                
                if (newWebsite) {
                    profileWebsite.href = newWebsite;
                    profileWebsite.textContent = newWebsite.replace(/^https?:\/\//, '');
                    profileWebsite.style.display = 'inline';
                } else {
                    profileWebsite.style.display = 'none';
                }
                
                editModal.classList.remove('show');
                alert('Profile updated successfully!');
            });
            
            // Change avatar button
            editAvatarButton.addEventListener('click', () => {
                avatarUpload.click();
            });
            
            // Avatar upload
            avatarUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        // In a real app, you would upload this to storage
                        // For now, we'll just update the preview
                        const img = document.createElement('img');
                        img.src = event.target.result;
                        img.className = 'profile-avatar';
                        img.alt = 'Profile Avatar';
                        
                        // Replace initials avatar with image
                        if (profileAvatar.classList.contains('initials-avatar')) {
                            profileAvatar.replaceWith(img);
                            profileAvatar = img;
                        } else {
                            profileAvatar.src = event.target.result;
                        }
                        
                        // Update edit modal preview
                        if (editAvatarPreview.classList.contains('initials-avatar')) {
                            const imgPreview = document.createElement('img');
                            imgPreview.src = event.target.result;
                            imgPreview.className = 'edit-avatar';
                            imgPreview.alt = 'Profile Avatar';
                            editAvatarPreview.replaceWith(imgPreview);
                            editAvatarPreview = imgPreview;
                        } else {
                            editAvatarPreview.src = event.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Copy profile link
            copyProfileLink.addEventListener('click', () => {
                const profileLink = `${window.location.origin}/profile.html?user=${profileData.username}`;
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
