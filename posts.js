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
                    <i class="fas fa-newspaper"></i>
                    <p>No posts yet. Be the first to post!</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = posts.map(post => createPostElement(post, user.id)).join('');
        
        // Initialize media viewers
        setupMediaViewers();
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
    
    // Media content with Cloudinary optimizations
    const mediaContent = post.video_url 
        ? createVideoElement(post.video_url)
        : post.image_url 
        ? createImageElement(post.image_url)
        : '';

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
                    <div class="post-time">${formatTime(post.created_at)}</div>
                </div>
            </div>
            <div class="post-content">
                ${post.content || ''}
            </div>
            ${mediaContent}
            <div class="post-stats">
                <div class="post-likes">
                    <span class="likes-count">${post.like_count || 0}</span> likes
                </div>
                <div class="post-viewers">
                    <i class="fas fa-eye viewers-icon"></i>
                    <span>${post.views || 0} views</span>
                </div>
            </div>
            <div class="post-actions">
                <div class="post-action like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                </div>
                <div class="post-action comment-btn" data-post-id="${post.id}">
                    <i class="far fa-comment"></i>
                </div>
                <div class="post-action share-btn" data-post-id="${post.id}">
                    <i class="fas fa-share"></i>
                </div>
            </div>
        </div>
    `;
}

function createImageElement(imageUrl) {
    // Add Cloudinary transformations for optimal display
    const optimizedUrl = imageUrl.replace('/upload/', '/upload/f_auto,q_auto:low,w_600/');
    
    return `
        <div class="post-media">
            <img src="${optimizedUrl}" 
                 alt="Post image" 
                 loading="lazy" 
                 class="post-image"
                 onclick="openMediaViewer('${imageUrl}', 'image')">
        </div>
    `;
}

function createVideoElement(videoUrl) {
    // Add Cloudinary transformations for optimal display
    const optimizedUrl = videoUrl.replace('/upload/', '/upload/f_auto,q_auto:low,w_600/');
    
    return `
        <div class="post-media">
            <video controls class="post-video">
                <source src="${optimizedUrl}" type="video/mp4">
            </video>
        </div>
    `;
}

function setupMediaViewers() {
    // Click to view full image
    document.querySelectorAll('.post-image').forEach(img => {
        img.addEventListener('click', function(e) {
            if (e.target.tagName === 'IMG') {
                openMediaViewer(this.src.replace('/f_auto,q_auto:low,w_600/', '/upload/'), 'image');
            }
        });
    });
}

function openMediaViewer(url, type) {
    // Implement a modal viewer similar to Twitter
    const viewer = document.createElement('div');
    viewer.className = 'media-viewer';
    viewer.innerHTML = `
        <div class="media-viewer-content">
            <span class="close-viewer">&times;</span>
            ${type === 'image' 
                ? `<img src="${url}" alt="Full size" style="max-width: 100%; max-height: 90vh;">` 
                : `<video controls autoplay style="max-width: 100%; max-height: 90vh;">
                    <source src="${url}" type="video/mp4">
                   </video>`}
        </div>
    `;
    
    viewer.querySelector('.close-viewer').addEventListener('click', () => {
        document.body.removeChild(viewer);
    });
    
    viewer.addEventListener('click', (e) => {
        if (e.target === viewer) {
            document.body.removeChild(viewer);
        }
    });
    
    document.body.appendChild(viewer);
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
        const likeCountEl = document.querySelector(`.post[data-post-id="${postId}"] .likes-count`);
        
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
            console.log("Comment on post:", postId);
        });
    });
    
    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.getAttribute('data-post-id');
            console.log("Share post:", postId);
        });
    });
}

// Add to window for image click handler
window.openMediaViewer = openMediaViewer;
