   // DOM Elements
        const userInfoContainer = document.getElementById('user-info-container');
        const postInput = document.getElementById('post-content');
        const postButton = document.getElementById('submit-post');
        const bottomPostButton = document.getElementById('bottom-post-button');
        const mediaButton = document.getElementById('media-button');
        const mediaUpload = document.getElementById('media-upload');
        const mediaPreview = document.getElementById('media-preview');
        const mediaGrid = document.getElementById('media-grid');
        const errorMessage = document.getElementById('error-message');
        const body = document.body;

        // State variables
        let uploadedFiles = [];
        let videoCount = 0;
        let currentUser = null;
        let currentProfile = null;

        // Check for dark mode preference
        if (localStorage.getItem('darkMode') === 'true') {
            body.classList.add('dark-mode');
        }

        // Initialize the page
        async function init() {
            try {
                // Check if user is logged in
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                
                if (authError || !user) {
                    window.location.href = 'login.html';
                    return;
                }
                
                currentUser = user;
                
                // Load user profile
                await loadUserProfile();
                
                // Set up event listeners
                setupEventListeners();
                
            } catch (error) {
                console.error("Initialization error:", error);
                showError("Failed to initialize. Please try again.");
                window.location.href = 'login.html';
            }
        }

        // Load user profile data from Supabase
        async function loadUserProfile() {
            try {
                // Show skeleton loader
                showSkeletonLoader();
                
                // Get user profile from profiles table
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single();
                
                if (profileError) throw profileError;
                
                currentProfile = profile;
                
                // Display the user profile
                displayUserProfile(profile);
                
            } catch (error) {
                console.error("Error loading profile:", error);
                showError("Failed to load profile. Please try again.");
                displayDefaultProfile();
            }
        }

        // Show skeleton loader
        function showSkeletonLoader() {
            userInfoContainer.innerHTML = `
                <div class="skeleton-loader">
                    <div class="skeleton-avatar"></div>
                    <div class="skeleton-details">
                        <div class="skeleton-name"></div>
                        <div class="skeleton-username"></div>
                    </div>
                </div>
            `;
        }

        // Display user profile with actual data
        function displayUserProfile(profile) {
            const avatarContent = profile.avatar_url 
                ? `<img src="${profile.avatar_url}" alt="${profile.full_name || profile.username}" onerror="handleAvatarError(this)">`
                : createInitialAvatar(profile.full_name || profile.username);
            
            const verifiedBadge = profile.is_verified 
                ? '<i class="fas fa-check-circle verified-badge"></i>' 
                : '';
            
            userInfoContainer.innerHTML = `
                <div class="loaded-user-info">
                    <div class="user-avatar">
                        ${avatarContent}
                    </div>
                    <div class="user-details">
                        <div class="user-name">
                            ${profile.full_name || profile.username}
                            ${verifiedBadge}
                        </div>
                        <div class="user-username">@${profile.username}</div>
                    </div>
                </div>
            `;
        }

        // Create initial avatar with colored background
        function createInitialAvatar(name) {
            const initial = name ? name.charAt(0).toUpperCase() : 'U';
            const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3'];
            const color = colors[initial.charCodeAt(0) % colors.length];
            
            return `
                <div class="avatar-initial" style="background-color: ${color}">
                    ${initial}
                </div>
            `;
        }

        // Handle avatar image loading errors
        function handleAvatarError(imgElement) {
            const displayName = imgElement.alt || 'User';
            imgElement.replaceWith(createInitialAvatar(displayName));
        }

        // Display default profile if loading fails
        function displayDefaultProfile() {
            userInfoContainer.innerHTML = `
                <div class="loaded-user-info">
                    <div class="user-avatar">
                        ${createInitialAvatar('User')}
                    </div>
                    <div class="user-details">
                        <div class="user-name">User</div>
                        <div class="user-username">@user</div>
                    </div>
                </div>
            `;
        }

        // Set up event listeners
        function setupEventListeners() {
            // Media upload handling
            mediaButton.addEventListener('click', () => mediaUpload.click());
            mediaUpload.addEventListener('change', handleMediaUpload);
            
            // Post submission
            postButton.addEventListener('click', handlePost);
            bottomPostButton.addEventListener('click', handlePost);
            
            // Error message dismissal
            errorMessage.addEventListener('click', () => {
                errorMessage.style.display = 'none';
            });
        }

        // Handle media upload
        function handleMediaUpload(e) {
            const newFiles = Array.from(e.target.files);
            
            // Validate files
            if (uploadedFiles.length + newFiles.length > 5) {
                showError("You can upload up to 5 files");
                return;
            }
            
            newFiles.forEach(file => {
                if (file.type.startsWith('video/')) {
                    if (videoCount >= 1) {
                        showError("You can only upload 1 video per post");
                        return;
                    }
                    if (file.size > 100 * 1024 * 1024) {
                        showError("Video file size must be less than 100MB");
                        return;
                    }
                    videoCount++;
                } else if (file.size > 10 * 1024 * 1024) {
                    showError("Image file size must be less than 10MB");
                    return;
                }
                
                uploadedFiles.push(file);
            });
            
            displayMediaPreview();
        }

        // Display media preview
        function displayMediaPreview() {
            mediaGrid.innerHTML = '';
            
            uploadedFiles.forEach((file, index) => {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    const mediaItem = document.createElement('div');
                    mediaItem.className = 'media-item';
                    
                    mediaItem.innerHTML = file.type.startsWith('video/') ? `
                        <video controls><source src="${event.target.result}" type="${file.type}"></video>
                        <div class="remove-media" data-index="${index}"><i class="fas fa-trash"></i></div>
                    ` : `
                        <img src="${event.target.result}" alt="Preview">
                        <div class="remove-media" data-index="${index}"><i class="fas fa-trash"></i></div>
                    `;
                    
                    mediaGrid.appendChild(mediaItem);
                    mediaItem.querySelector('.remove-media').addEventListener('click', () => removeMediaItem(index));
                };
                
                reader.readAsDataURL(file);
            });
            
            mediaPreview.style.display = uploadedFiles.length ? 'block' : 'none';
        }

        // Remove media item
        function removeMediaItem(index) {
            if (uploadedFiles[index].type.startsWith('video/')) videoCount--;
            uploadedFiles.splice(index, 1);
            displayMediaPreview();
        }

        // Handle post submission
        async function handlePost() {
            const content = postInput.value.trim();
            
            if (!content && !uploadedFiles.length) {
                showError("Please add some content or media to your post");
                return;
            }
            
            // Set loading state
            setLoadingState(true);
            
            try {
                // Upload media files to Cloudinary
                const mediaUrls = [];
                
                if (uploadedFiles.length > 0) {
                    for (const file of uploadedFiles) {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('upload_preset', 'your_cloudinary_upload_preset'); // Replace with your upload preset
                        
                        const response = await fetch('https://api.cloudinary.com/v1_1/your_cloud_name/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const data = await response.json();
                        
                        mediaUrls.push({
                            url: data.secure_url,
                            type: file.type.startsWith('video/') ? 'video' : 'image'
                        });
                    }
                }
                
                // Create post in database
                const { data: post, error: insertError } = await supabase
                    .from('posts')
                    .insert([{
                        user_id: currentUser.id,
                        content: content,
                        image_url: mediaUrls.find(m => m.type === 'image')?.url || null,
                        video_url: mediaUrls.find(m => m.type === 'video')?.url || null,
                        like_count: 0,
                        comment_count: 0,
                        views: 0,
                        likers: []
                    }])
                    .select();
                
                if (insertError) throw insertError;
                
                // Redirect to home page after successful post
                window.location.href = 'index.html';
                
            } catch (error) {
                console.error("Post error:", error);
                showError("Failed to create post. Please try again.");
                setLoadingState(false);
            }
        }

        // Set loading state for buttons
        function setLoadingState(isLoading) {
            if (isLoading) {
                postButton.innerHTML = '<div class="spinner"></div>';
                bottomPostButton.innerHTML = '<div class="spinner"></div> Posting...';
                postButton.disabled = true;
                bottomPostButton.disabled = true;
            } else {
                postButton.innerHTML = 'Post';
                bottomPostButton.innerHTML = '<i class="fas fa-paper-plane"></i> Post';
                postButton.disabled = false;
                bottomPostButton.disabled = false;
            }
        }

        // Show error message
        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }

        // Initialize the page when loaded
        document.addEventListener('DOMContentLoaded', init);
