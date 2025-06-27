 // Load posts when page loads
    document.addEventListener('DOMContentLoaded', async () => {
        await loadPosts();
    });

    async function loadPosts() {
        try {
            // Show loading state
            document.getElementById('posts-container').innerHTML = `
                <div class="skeleton-loader">
                    <div style="height: 120px; background-color: #f0f0f0; border-radius: 12px; margin-bottom: 16px;"></div>
                    <div style="height: 120px; background-color: #f0f0f0; border-radius: 12px; margin-bottom: 16px;"></div>
                    <div style="height: 120px; background-color: #f0f0f0; border-radius: 12px; margin-bottom: 16px;"></div>
                </div>
            `;

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;

            // Get posts with user profiles
            const { data: posts, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles (
                        username,
                        full_name,
                        avatar_url,
                        is_verified
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Display posts
            const postsContainer = document.getElementById('posts-container');
            
            if (posts.length === 0) {
                postsContainer.innerHTML = `
                    <div class="no-posts">
                        <i class="fas fa-newspaper" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <p>No posts yet. Be the first to post!</p>
                    </div>
                `;
                return;
            }

            postsContainer.innerHTML = posts.map(post => createPostElement(post, user.id)).join('');
            
            // Initialize Swiper for each post with media
            document.querySelectorAll('.swiper-container').forEach(container => {
                new Swiper(container, {
                    loop: true,
                    on: {
                        slideChange: function() {
                            const counter = this.el.querySelector('.photo-counter');
                            if (counter) {
                                counter.textContent = `${this.realIndex + 1}/${this.slides.length - 2}`;
                            }
                        },
                    },
                });
            });
            
            // Add event listeners for like/comment actions
            setupPostInteractions();

        } catch (error) {
            console.error("Error loading posts:", error);
            document.getElementById('posts-container').innerHTML = `
                <div class="error-message">
                    Failed to load posts. Please try again.
                </div>
            `;
        }
    }

    function createPostElement(post, currentUserId) {
        const isLiked = post.likers && post.likers.includes(currentUserId);
        const mediaContent = post.video_url 
            ? `<video controls><source src="${post.video_url}" type="video/mp4"></video>`
            : post.image_url 
            ? `<img src="${post.image_url}" alt="Post image">`
            : '';

        const mediaSwiper = post.image_url ? `
            <div class="swiper-container">
                <div class="swiper-wrapper">
                    <div class="swiper-slide">
                        <img src="${post.image_url}" alt="Post image">
                    </div>
                </div>
                <div class="photo-counter">1/1</div>
            </div>
        ` : '';

        return `
            <div class="post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar">${getInitials(post.profiles.full_name || post.profiles.username)}</div>
                    <div class="post-user-info">
                        <div class="post-user">
                            ${post.profiles.full_name || post.profiles.username}
                            ${post.profiles.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                        </div>
                        <div class="post-username">@${post.profiles.username}</div>
                    </div>
                </div>
                <div class="post-top-right">
                    <button class="follow-btn">Follow</button>
                    <span class="post-time-right">${formatTime(post.created_at)}</span>
                    <div class="post-more">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
                    <div class="post-more-menu">
                        <div class="post-more-option">
                            <i class="fas fa-edit"></i>
                            <span>Edit</span>
                        </div>
                        <div class="post-more-option">
                            <i class="fas fa-bookmark"></i>
                            <span>Save</span>
                        </div>
                        <div class="post-more-option">
                            <i class="fas fa-share"></i>
                            <span>Share</span>
                        </div>
                        <div class="post-more-option">
                            <i class="fas fa-trash-alt"></i>
                            <span>Delete</span>
                        </div>
                        <div class="post-more-option">
                            <i class="fas fa-flag"></i>
                            <span>Report</span>
                        </div>
                        <div class="post-more-option">
                            <i class="fas fa-times"></i>
                            <span>Cancel</span>
                        </div>
                    </div>
                </div>
                <div class="post-content">
                    ${post.content || ''}
                </div>
                ${mediaSwiper || mediaContent}
                <div class="post-stats">
                    <div class="post-likes">
                        <span class="likes-count">${post.like_count || 0}</span>
                    </div>
                    <div class="post-viewers">
                        <i class="fas fa-eye viewers-icon"></i>
                        <span>${post.views || 0} views</span>
                    </div>
                </div>
                <div class="post-actions">
                    <div class="post-action like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        <span class="like-count">${post.like_count || 0}</span>
                    </div>
                    <div class="post-action comment-btn" data-post-id="${post.id}">
                        <i class="far fa-comment"></i>
                        <span class="comment-count">${post.comment_count || 0}</span>
                    </div>
                    <div class="post-action share-btn" data-post-id="${post.id}">
                        <i class="fas fa-share"></i>
                        <span>Share</span>
                    </div>
                </div>
            </div>
        `;
    }

    function getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
    }

    function formatTime(timestamp) {
        const now = new Date();
        const postTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now - postTime) / 1000);
        
        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        return `${Math.floor(diffInSeconds / 86400)}d`;
    }

    async function toggleLike(postId, isLiked) {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;
            
            // Get current post data
            const { data: post, error: postError } = await supabase
                .from('posts')
                .select('likers, like_count')
                .eq('id', postId)
                .single();
            
            if (postError) throw postError;
            
            const currentLikers = post.likers || [];
            const newLikers = isLiked 
                ? currentLikers.filter(id => id !== user.id)
                : [...currentLikers, user.id];
            
            // Update post in database
            const { error } = await supabase
                .from('posts')
                .update({
                    likers: newLikers,
                    like_count: newLikers.length
                })
                .eq('id', postId);
            
            if (error) throw error;
            
            // Update UI
            const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
            const likeCountEl = likeBtn.querySelector('.like-count');
            
            likeBtn.classList.toggle('liked');
            const heartIcon = likeBtn.querySelector('i');
            heartIcon.className = likeBtn.classList.contains('liked') ? 'fas fa-heart' : 'far fa-heart';
            likeCountEl.textContent = newLikers.length;
            
            // Animation
            if (!isLiked) {
                const likeAnim = document.createElement('div');
                likeAnim.className = 'like-animation';
                likeAnim.innerHTML = '❤️';
                likeBtn.appendChild(likeAnim);
                setTimeout(() => likeAnim.remove(), 800);
            }
            
        } catch (error) {
            console.error("Error toggling like:", error);
            alert("Failed to update like. Please try again.");
        }
    }

    function setupPostInteractions() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.getAttribute('data-post-id');
                const isLiked = this.classList.contains('liked');
                toggleLike(postId, isLiked);
            });
        });
        
        // Comment buttons
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.getAttribute('data-post-id');
                // Implement comment functionality as needed
                console.log("Comment on post:", postId);
            });
        });
        
        // Share buttons
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.getAttribute('data-post-id');
                // Implement share functionality as needed
                console.log("Share post:", postId);
            });
        });
        
        // Follow buttons
        document.querySelectorAll('.follow-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.classList.toggle('following');
                this.textContent = this.classList.contains('following') ? 'Following' : 'Follow';
            });
        });
        
        // More options menu
        document.querySelectorAll('.post-more').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.nextElementSibling.classList.toggle('show');
            });
        });
        
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.post-more-menu') && !e.target.closest('.post-more')) {
                document.querySelectorAll('.post-more-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    }
