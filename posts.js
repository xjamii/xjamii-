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

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <img src="${post.profiles.avatar_url || ''}" 
                         class="post-user-avatar" 
                         onerror="this.onerror=null;this.src='';this.outerHTML='<div class=\'post-user-avatar\' style=\'background-color: #${getRandomColor()};\'>${getInitials(post.profiles.full_name || post.profiles.username)}</div>'">
                    <div class="post-user-info">
                        <div class="post-user-name">
                            ${post.profiles.full_name || post.profiles.username}
                            ${post.profiles.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                        </div>
                        <div class="post-username">@${post.profiles.username}</div>
                    </div>
                </div>
                <div class="post-content">${post.content || ''}</div>
                ${mediaContent ? `<div class="post-media">${mediaContent}</div>` : ''}
                <div class="post-time">${formatTime(post.created_at)}</div>
                <div class="post-footer">
                    <div class="post-action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', ${isLiked})">
                        <i class="fas fa-heart"></i>
                        <span>${post.like_count || 0}</span>
                    </div>
                    <div class="post-action commented" onclick="focusCommentInput('${post.id}')">
                        <i class="fas fa-comment"></i>
                        <span>${post.comment_count || 0}</span>
                    </div>
                    <div class="post-action" onclick="sharePost('${post.id}')">
                        <i class="fas fa-share"></i>
                    </div>
                </div>
            </div>
        `;
    }

    function getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
    }

    function getRandomColor() {
        const colors = ['FF5733', '33FF57', '3357FF', 'F3FF33', 'FF33F3'];
        return colors[Math.floor(Math.random() * colors.length)];
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
            
            // Reload posts to show updated like count
            await loadPosts();
            
        } catch (error) {
            console.error("Error toggling like:", error);
            alert("Failed to update like. Please try again.");
        }
    }

    function focusCommentInput(postId) {
        // Implement comment functionality as needed
        console.log("Focus comment input for post:", postId);
    }

    function sharePost(postId) {
        // Implement share functionality as needed
        console.log("Share post:", postId);
    }

    function setupPostInteractions() {
        // Add any additional event listeners here
    }
