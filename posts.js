
/* ===== Connection System ===== */
async function checkPostConnectionStatus(postUserId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
            .from('connections')
            .select('id, sender_id, status')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${postUserId}),and(sender_id.eq.${postUserId},receiver_id.eq.${user.id})`)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) return { status: 'not_connected' };

        return {
            status: data.status,
            isSender: data.sender_id === user.id,
            connectionId: data.id
        };
    } catch (error) {
        console.error("Connection check error:", error);
        return { status: 'error' };
    }
}

async function handleConnectionClick(button) {
    const userId = button.dataset.userId;
    const connectionId = button.dataset.connectionId;
    const isAccept = button.classList.contains('accept');
    
    // Set loading state
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (isAccept) {
            // Accept connection request
            await supabase
                .from('connections')
                .update({ status: 'accepted' })
                .eq('id', connectionId);
            
            button.innerHTML = '<i class="fas fa-check"></i> Connected';
            button.classList.replace('accept', 'connected');
            button.removeAttribute('data-connection-id');
        } else if (connectionId) {
            // Remove existing connection
            await supabase
                .from('connections')
                .delete()
                .eq('id', connectionId);
            
            button.innerHTML = '<i class="fas fa-user-plus"></i> Connect';
            button.classList.remove('pending', 'connected');
            button.removeAttribute('data-connection-id');
        } else {
            // Send new connection request
            const { data, error } = await supabase
                .from('connections')
                .insert([{
                    sender_id: user.id,
                    receiver_id: userId,
                    status: 'pending'
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            button.innerHTML = '<i class="fas fa-clock"></i> Pending';
            button.classList.add('pending');
            button.dataset.connectionId = data.id;
        }
    } catch (error) {
        console.error("Connection action failed:", error);
        button.innerHTML = originalHTML;
        showFeedback('Failed to complete connection action');
    } finally {
        button.disabled = false;
    }
}

/* ===== Post Creation ===== */
function createPostElement(post, currentUserId) {
    const isLiked = post.likers && post.likers.includes(currentUserId);
    const isOwner = post.user_id === currentUserId;
    const likeCount = post.like_count || 0;
    const commentCount = post.comment_count || 0;
    
    // Process content for mentions, hashtags and links
    const processedContent = processPostContent(post.content || '');
    const postTime = formatTime(post.created_at);
    
    // Get initials for avatar
    const initials = getInitials(post.profiles.full_name || post.profiles.username);
    
    // Media content
    let mediaContent = '';
    if (post.video_url) {
        mediaContent = `
            <video controls class="post-image">
                <source src="${post.video_url}" type="video/mp4">
            </video>
        `;
    } else if (post.image_url) {
        mediaContent = `
            <img src="${post.image_url}" alt="Post image" class="post-image">
        `;
    }
    
    // Connection button
    let connectButton = '';
    if (!isOwner) {
        const connectionStatus = post.connection_status || 'not_connected';
        
        if (connectionStatus === 'accepted') {
            connectButton = `
                <button class="connect-btn connected" disabled>
                    <i class="fas fa-check"></i> Connected
                </button>
            `;
        } 
        else if (connectionStatus === 'pending') {
            if (post.connection_is_sender) {
                connectButton = `
                    <button class="connect-btn pending" disabled>
                        <i class="fas fa-clock"></i> Pending
                    </button>
                `;
            } else {
                connectButton = `
                    <button class="connect-btn accept" data-connection-id="${post.connection_id}">
                        <i class="fas fa-user-plus"></i> Accept
                    </button>
                `;
            }
        }
        else {
            connectButton = `
                <button class="connect-btn" data-user-id="${post.user_id}">
                    <i class="fas fa-user-plus"></i> Connect
                </button>
            `;
        }
    }
    
    return `
        <div class="post-container" data-post-id="${post.id}">
            <div class="post">
                <div class="post-header">
                    <div class="post-avatar">
                        ${initials}
                    </div>
                    <div class="post-user-info">
                        <div class="post-user">
                            ${post.profiles.full_name || post.profiles.username}
                            ${post.profiles.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                            <span class="post-time">${postTime}</span>
                        </div>
                        <div class="post-username">@${post.profiles.username}</div>
                    </div>
                    ${connectButton}
                </div>
                <p class="post-content">
                    ${processedContent}
                </p>
                ${mediaContent}
                <div class="post-actions">
                    <div class="post-action like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        <span class="like-count">${likeCount}</span>
                    </div>
                    <div class="post-action comment-btn" data-post-id="${post.id}">
                        <i class="far fa-comment"></i>
                        <span class="comment-count">${commentCount}</span>
                    </div>
                    <div class="post-action share" data-post-id="${post.id}">
                        <i class="fas fa-arrow-up-from-bracket"></i>
                    </div>
                    <div class="post-action views">
                        <i class="fas fa-chart-bar"></i>
                        <span>${post.views || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* ===== Post Loading ===== */
async function loadPosts() {
    try {
        // Show loading state
        document.getElementById('posts-container').innerHTML = `
            <div class="skeleton-loader">
                <div class="skeleton-post"></div>
                <div class="skeleton-post"></div>
                <div class="skeleton-post"></div>
            </div>
        `;

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        // Get posts with connection status
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:user_id (
                    username,
                    full_name,
                    avatar_url,
                    is_verified
                ),
                connections:connections!or(
                    sender_id.eq.${user.id},
                    receiver_id.eq.${user.id}
                ) (
                    id,
                    sender_id,
                    status
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Process posts to add connection info
        const processedPosts = posts.map(post => {
            const connection = post.connections[0] || null;
            let connection_status = 'not_connected';
            let connection_is_sender = false;
            let connection_id = null;
            
            if (connection) {
                connection_status = connection.status;
                connection_id = connection.id;
                connection_is_sender = connection.sender_id === user.id;
            }
            
            return {
                ...post,
                connection_status,
                connection_is_sender,
                connection_id
            };
        });

        // Display posts
        const postsContainer = document.getElementById('posts-container');
        
        if (processedPosts.length === 0) {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <i class="fas fa-newspaper"></i>
                    <p>No posts yet. Be the first to post!</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = processedPosts.map(post => 
            createPostElement(post, user.id)).join('');
        
        // Setup interactions
        setupPostInteractions();

        // Track views for visible posts
        processedPosts.forEach(post => {
            trackPostView(post.id);
        });

    } catch (error) {
        console.error("Error loading posts:", error);
        document.getElementById('posts-container').innerHTML = `
            <div class="error-message">
                Failed to load posts. Please try again.
            </div>
        `;
    }
}

/* ===== Post Interactions ===== */
function setupPostInteractions() {
    // Connection buttons
    document.querySelectorAll('.connect-btn:not(.connected):not(.pending)').forEach(btn => {
        btn.addEventListener('click', () => handleConnectionClick(btn));
    });

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
            showCommentPopup(postId);
        });
    });
    
    // Share buttons
    document.querySelectorAll('.post-action.share').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.getAttribute('data-post-id');
            showSharePopup(postId);
        });
    });
    
    // Double click to like
    document.querySelectorAll('.post-container').forEach(post => {
        let lastClick = 0;
        post.addEventListener('click', function(e) {
            const now = new Date().getTime();
            if (now - lastClick < 300) {
                const likeBtn = this.querySelector('.like-btn');
                if (likeBtn && !likeBtn.classList.contains('liked')) {
                    const postId = likeBtn.getAttribute('data-post-id');
                    toggleLike(postId, false);
                }
            }
            lastClick = now;
        });
    });
}

/* ===== Helper Functions ===== */
function processPostContent(content) {
    if (!content) return '';
    
    // Process mentions (@username)
    content = content.replace(/@(\w+)/g, '<a href="profile.html?username=$1" class="mention">@$1</a>');
    
    // Process hashtags (#tag)
    content = content.replace(/#(\w+)/g, '<a href="search.html?q=%23$1" class="hashtag">#$1</a>');
    
    // Process URLs
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="url-link">$1</a>');
    
    return content;
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
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

async function trackPostView(postId) {
    try {
        await supabase.rpc('increment_post_views', { post_id: postId });
    } catch (error) {
        console.error("Error tracking view:", error);
    }
}

/* ===== Initialize ===== */
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    setupRealTimeUpdates();
});

/* ===== Real-time Updates ===== */
function setupRealTimeUpdates() {
    const channel = supabase
        .channel('posts_updates')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'posts'
        }, handlePostChange)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'connections'
        }, handleConnectionChange)
        .subscribe();
}

function handlePostChange(payload) {
    // Your existing post change handling
}

function handleConnectionChange(payload) {
    // Update connection status in UI if needed
    const postElement = document.querySelector(`.post-container[data-user-id="${payload.new.receiver_id}"], 
                                               .post-container[data-user-id="${payload.new.sender_id}"]`);
    if (postElement) {
        loadPosts(); // Refresh affected posts
    }
}
