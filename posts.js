// Load posts when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadPosts();
    setupRealTimeUpdates();
});

// Set up real-time updates for posts
function setupRealTimeUpdates() {
    const postsChannel = supabase
        .channel('posts_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, handlePostChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, handleCommentChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, handleFollowChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, handleReportChange)
        .subscribe();
}

// Handle post changes in real-time
async function handlePostChange(payload) {
    const postId = payload.new.id;
    const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
    
    if (!postElement) {
        if (payload.eventType === 'INSERT') {
            // New post added, reload posts
            await loadPosts();
        }
        return;
    }

    if (payload.eventType === 'UPDATE') {
        // Update like count
        const likeCountEl = postElement.querySelector('.like-count');
        if (likeCountEl) {
            likeCountEl.textContent = payload.new.like_count || 0;
        }
        
        // Update like button state
        const { data: { user } } = await supabase.auth.getUser();
        const isLiked = payload.new.likers && payload.new.likers.includes(user.id);
        const likeBtn = postElement.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.classList.toggle('liked', isLiked);
            const heartIcon = likeBtn.querySelector('i');
            heartIcon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
        }
        
        // Update comment count
        const commentCountEl = postElement.querySelector('.comment-count');
        if (commentCountEl) {
            commentCountEl.textContent = payload.new.comment_count || 0;
        }
        
        // Update view count
        const viewsEl = postElement.querySelector('.post-viewers span');
        if (viewsEl) {
            viewsEl.textContent = `${payload.new.views || 0} views`;
        }
    } else if (payload.eventType === 'DELETE') {
        postElement.remove();
    }
}

// Handle comment changes in real-time
function handleCommentChange(payload) {
    // Implement comment real-time updates as needed
    console.log('Comment change:', payload);
}

// Handle follow changes in real-time
function handleFollowChange(payload) {
    // Implement follow real-time updates as needed
    console.log('Follow change:', payload);
}

// Handle report changes in real-time
function handleReportChange(payload) {
    // Implement report real-time updates as needed
    console.log('Report change:', payload);
}

// Track post views
async function trackPostView(postId) {
    try {
        const { error } = await supabase.rpc('increment_post_views', { post_id: postId });
        if (error) throw error;
    } catch (error) {
        console.error("Error tracking view:", error);
    }
}

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
        
        // Add event listeners for interactions
        setupPostInteractions();

        // Track views for visible posts
        posts.forEach(post => {
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

function createPostElement(post, currentUserId) {
    const isLiked = post.likers && post.likers.includes(currentUserId);
    const isOwner = post.user_id === currentUserId;
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

    // Process content for mentions, hashtags, and links
    const processedContent = processPostContent(post.content || '');

    // Create follow button only if not the owner
    const followButton = !isOwner ? `
        <button class="follow-btn" data-user-id="${post.user_id}">
            ${post.is_following ? 'Following' : 'Follow'}
        </button>
    ` : '';

    // Create more options menu based on ownership
    const moreOptionsMenu = isOwner ? `
        <div class="post-more-menu">
            <div class="post-more-option edit-post" data-post-id="${post.id}">
                <i class="fas fa-edit"></i>
                <span>Edit</span>
            </div>
            <div class="post-more-option delete-post" data-post-id="${post.id}">
                <i class="fas fa-trash-alt"></i>
                <span>Delete</span>
            </div>
            <div class="post-more-option cancel-more">
                <i class="fas fa-times"></i>
                <span>Cancel</span>
            </div>
        </div>
    ` : `
        <div class="post-more-menu">
            <div class="post-more-option report-post" data-post-id="${post.id}">
                <i class="fas fa-flag"></i>
                <span>Report</span>
            </div>
            <div class="post-more-option cancel-more">
                <i class="fas fa-times"></i>
                <span>Cancel</span>
            </div>
        </div>
    `;

    return `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <a href="profile.html?user_id=${post.user_id}" class="post-avatar-link">
                    <div class="post-avatar">${getInitials(post.profiles.full_name || post.profiles.username)}</div>
                </a>
                <div class="post-user-info">
                    <a href="profile.html?user_id=${post.user_id}" class="post-user-link">
                        <div class="post-user">
                            ${post.profiles.full_name || post.profiles.username}
                            ${post.profiles.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                        </div>
                        <div class="post-username">@${post.profiles.username}</div>
                    </a>
                </div>
            </div>
            <div class="post-top-right">
                ${followButton}
                <span class="post-time-right">${formatTime(post.created_at)}</span>
                <div class="post-more">
                    <i class="fas fa-ellipsis-h"></i>
                </div>
                ${moreOptionsMenu}
            </div>
            <div class="post-content" data-full-text="${post.content || ''}">
                ${processedContent}
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

// Process post content for mentions, hashtags, and links
function processPostContent(content) {
    if (!content) return '';
    
    // Process mentions (@username)
    content = content.replace(/@(\w+)/g, '<a href="profile.html?username=$1" class="mention-link">@$1</a>');
    
    // Process hashtags (#tag)
    content = content.replace(/#(\w+)/g, '<a href="search.html?q=%23$1" class="hashtag-link">#$1</a>');
    
    // Process URLs
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="url-link">$1</a>');
    
    return content;
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

async function toggleFollow(userId, isFollowing) {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (isFollowing) {
            // Unfollow user
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', userId);
            
            if (error) throw error;
        } else {
            // Follow user
            const { error } = await supabase
                .from('follows')
                .insert([{
                    follower_id: user.id,
                    following_id: userId
                }]);
            
            if (error) throw error;
        }
        
        // Update UI
        const followBtn = document.querySelector(`.follow-btn[data-user-id="${userId}"]`);
        followBtn.textContent = isFollowing ? 'Follow' : 'Following';
        followBtn.classList.toggle('following', !isFollowing);
        
    } catch (error) {
        console.error("Error toggling follow:", error);
        alert("Failed to update follow status. Please try again.");
    }
}

async function deletePost(postId) {
    try {
        if (!confirm("Are you sure you want to delete this post?")) return;
        
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);
        
        if (error) throw error;
        
        // The post will be removed via real-time update
        
    } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post. Please try again.");
    }
}

async function reportPost(postId) {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        const { error } = await supabase
            .from('reports')
            .insert([{
                reporter_id: user.id,
                post_id: postId,
                reason: 'Inappropriate content'
            }]);
        
        if (error) throw error;
        
        // Update UI to show reported status
        const reportBtn = document.querySelector(`.report-post[data-post-id="${postId}"]`);
        if (reportBtn) {
            reportBtn.innerHTML = '<i class="fas fa-check"></i><span>Reported</span>';
            reportBtn.style.color = '#4CAF50';
            reportBtn.style.pointerEvents = 'none';
        }
        
        alert("Thank you for reporting. We'll review this post.");
        
    } catch (error) {
        console.error("Error reporting post:", error);
        alert("Failed to report post. Please try again.");
    }
}

function showCommentPopup(postId) {
    // Create comment popup
    const popup = document.createElement('div');
    popup.className = 'comment-popup';
    popup.innerHTML = `
        <div class="comment-popup-header">
            <h3>Comments</h3>
            <button class="close-comment-popup"><i class="fas fa-times"></i></button>
        </div>
        <div class="comment-list">
            <div class="comment-loading">
                <div class="spinner"></div>
                Loading comments...
            </div>
        </div>
        <div class="comment-input-container">
            <input type="text" placeholder="Write a comment..." class="comment-input">
            <button class="send-comment-btn" data-post-id="${postId}">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Load comments
    loadComments(postId);
    
    // Set up event listeners for the popup
    setupCommentPopupListeners(popup, postId);
}

function setupCommentPopupListeners(popup, postId) {
    // Close button
    popup.querySelector('.close-comment-popup').addEventListener('click', () => {
        popup.remove();
    });
    
    // Send comment button
    popup.querySelector('.send-comment-btn').addEventListener('click', async () => {
        const input = popup.querySelector('.comment-input');
        const commentText = input.value.trim();
        
        if (!commentText) return;
        
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;
            
            const { error } = await supabase
                .from('comments')
                .insert([{
                    post_id: postId,
                    user_id: user.id,
                    content: commentText
                }]);
            
            if (error) throw error;
            
            // Clear input
            input.value = '';
            
            // The comment will appear via real-time update
            
        } catch (error) {
            console.error("Error posting comment:", error);
            alert("Failed to post comment. Please try again.");
        }
    });
}

async function loadComments(postId) {
    try {
        const { data: comments, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles (
                    username,
                    full_name,
                    avatar_url
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const commentList = document.querySelector('.comment-list');
        commentList.innerHTML = comments.length > 0 
            ? comments.map(comment => createCommentElement(comment)).join('')
            : '<div class="no-comments">No comments yet. Be the first to comment!</div>';
        
    } catch (error) {
        console.error("Error loading comments:", error);
        document.querySelector('.comment-list').innerHTML = `
            <div class="error-message">
                Failed to load comments. Please try again.
            </div>
        `;
    }
}

function createCommentElement(comment) {
    const isOwner = comment.user_id === currentUserId;
    
    // Process comment content for mentions, hashtags, and links
    const processedContent = processPostContent(comment.content);
    
    return `
        <div class="comment" data-comment-id="${comment.id}">
            <div class="comment-header">
                <a href="profile.html?user_id=${comment.user_id}" class="comment-avatar-link">
                    <div class="comment-avatar">${getInitials(comment.profiles.full_name || comment.profiles.username)}</div>
                </a>
                <div class="comment-user-info">
                    <a href="profile.html?user_id=${comment.user_id}" class="comment-user-link">
                        <div class="comment-user">
                            ${comment.profiles.full_name || comment.profiles.username}
                        </div>
                        <div class="comment-username">@${comment.profiles.username}</div>
                    </a>
                </div>
                <div class="comment-time">${formatTime(comment.created_at)}</div>
                <div class="comment-more">
                    <i class="fas fa-ellipsis-h"></i>
                    <div class="comment-more-menu">
                        ${isOwner ? `
                            <div class="comment-more-option delete-comment" data-comment-id="${comment.id}">
                                <i class="fas fa-trash-alt"></i>
                                <span>Delete</span>
                            </div>
                        ` : `
                            <div class="comment-more-option report-comment" data-comment-id="${comment.id}">
                                <i class="fas fa-flag"></i>
                                <span>Report</span>
                            </div>
                        `}
                        <div class="comment-more-option cancel-more">
                            <i class="fas fa-times"></i>
                            <span>Cancel</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="comment-content">
                ${processedContent}
            </div>
            <div class="comment-actions">
                <div class="comment-action like-comment-btn ${comment.is_liked ? 'liked' : ''}" data-comment-id="${comment.id}">
                    <i class="${comment.is_liked ? 'fas' : 'far'} fa-heart"></i>
                    <span class="like-count">${comment.like_count || 0}</span>
                </div>
                <div class="comment-action reply-comment-btn" data-comment-id="${comment.id}">
                    <i class="far fa-comment"></i>
                    <span>Reply</span>
                </div>
            </div>
        </div>
    `;
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
            showCommentPopup(postId);
        });
    });
    
    // Share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.getAttribute('data-post-id');
            showSharePopup(postId);
        });
    });
    
    // Follow buttons
    document.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const userId = this.getAttribute('data-user-id');
            const isFollowing = this.textContent === 'Following';
            await toggleFollow(userId, isFollowing);
        });
    });
    
    // More options menu
    document.querySelectorAll('.post-more').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            document.querySelectorAll('.post-more-menu').forEach(menu => {
                menu.classList.remove('show');
            });
            this.nextElementSibling.classList.add('show');
        });
    });
    
    // Edit post option
    document.querySelectorAll('.edit-post').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.getAttribute('data-post-id');
            window.location.href = `edit-post.html?post_id=${postId}`;
        });
    });
    
    // Delete post option
    document.querySelectorAll('.delete-post').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.getAttribute('data-post-id');
            deletePost(postId);
        });
    });
    
    // Report post option
    document.querySelectorAll('.report-post').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.getAttribute('data-post-id');
            reportPost(postId);
        });
    });
    
    // Cancel more options
    document.querySelectorAll('.cancel-more').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.post-more-menu').classList.remove('show');
        });
    });
    
    // Click outside to close menus
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.post-more-menu') && !e.target.closest('.post-more')) {
            document.querySelectorAll('.post-more-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
    
    // Double click to like post
    document.querySelectorAll('.post').forEach(post => {
        let lastClick = 0;
        post.addEventListener('click', function(e) {
            const now = new Date().getTime();
            if (now - lastClick < 300) {
                // Double click detected
                const likeBtn = this.querySelector('.like-btn');
                if (likeBtn && !likeBtn.classList.contains('liked')) {
                    const postId = likeBtn.getAttribute('data-post-id');
                    toggleLike(postId, false);
                }
            }
            lastClick = now;
        });
    });
    
    // Show more/less for long content
    document.querySelectorAll('.post-content').forEach(content => {
        const fullText = content.getAttribute('data-full-text');
        if (fullText.length > 200) {
            content.innerHTML = `${fullText.substring(0, 200)}... <span class="see-more">See more</span>`;
            
            content.querySelector('.see-more').addEventListener('click', function(e) {
                e.stopPropagation();
                content.innerHTML = fullText;
            });
        }
    });
}

function showSharePopup(postId) {
    // Create share popup
    const popup = document.createElement('div');
    popup.className = 'share-popup';
    popup.innerHTML = `
        <div class="share-popup-header">
            <h3>Share Post</h3>
            <button class="close-share-popup"><i class="fas fa-times"></i></button>
        </div>
        <div class="share-options">
            <button class="share-option copy-link" data-post-id="${postId}">
                <i class="fas fa-link"></i>
                <span>Copy Link</span>
            </button>
            ${navigator.share ? `
                <button class="share-option native-share" data-post-id="${postId}">
                    <i class="fas fa-share-alt"></i>
                    <span>Share via...</span>
                </button>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Set up event listeners for the popup
    setupSharePopupListeners(popup, postId);
}

function setupSharePopupListeners(popup, postId) {
    // Close button
    popup.querySelector('.close-share-popup').addEventListener('click', () => {
        popup.remove();
    });
    
    // Copy link button
    popup.querySelector('.copy-link').addEventListener('click', () => {
        const postUrl = `${window.location.origin}/post.html?id=${postId}`;
        navigator.clipboard.writeText(postUrl)
            .then(() => {
                alert('Link copied to clipboard!');
                popup.remove();
            })
            .catch(err => {
                console.error('Failed to copy link:', err);
                alert('Failed to copy link. Please try again.');
            });
    });
    
    // Native share button
    if (navigator.share) {
        popup.querySelector('.native-share').addEventListener('click', () => {
            const postUrl = `${window.location.origin}/post.html?id=${postId}`;
            navigator.share({
                title: 'Check out this post',
                url: postUrl
            })
            .then(() => popup.remove())
            .catch(err => console.error('Error sharing:', err));
        });
    }
}
