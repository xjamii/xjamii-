/* 
let currentUserId = null;

/* ===== Post Loading ===== */
async function loadPosts() {
    try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        currentUserId = user.id;

        // Get posts with profiles
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

        displayPosts(posts);
        setupRealTimeUpdates();

    } catch (error) {
        console.error("Error loading posts:", error);
        showFeedback('Failed to load posts');
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = `<div class="no-posts">No posts found</div>`;
        return;
    }

    container.innerHTML = posts.map(post => createPostElement(post)).join('');

    // Initialize Swiper for media posts
    document.querySelectorAll('.swiper-container').forEach(el => {
        new Swiper(el, {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
            },
        });
    });

    setupPostInteractions();
}

function createPostElement(post) {
    const isLiked = post.likers?.includes(currentUserId) || false;
    const isOwner = post.user_id === currentUserId;
    const mediaContent = processPostMedia(post.media);

    return `
        <div class="post" data-post-id="${post.id}">
            <div class="post-header">
                <div class="user-info">
                    <img src="${post.profiles.avatar_url || ''}" alt="${post.profiles.full_name}" 
                         onerror="this.onerror=null;this.src='default-avatar.jpg'">
                    <div>
                        <h4>${post.profiles.full_name}</h4>
                        <small>@${post.profiles.username}</small>
                    </div>
                </div>
                <div class="post-actions">
                    ${!isOwner ? `<button class="follow-btn" data-user-id="${post.user_id}">Follow</button>` : ''}
                    <button class="more-btn">⋯</button>
                </div>
            </div>
            <div class="post-content">${post.content}</div>
            ${mediaContent}
            <div class="post-stats">
                <span>${post.like_count} likes</span>
                <span>${post.comment_count} comments</span>
                <span>${post.views} views</span>
            </div>
            <div class="post-actions">
                <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <button class="comment-btn" data-post-id="${post.id}">
                    <i class="far fa-comment"></i>
                </button>
                <button class="share-btn" data-post-id="${post.id}">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
    `;
}

function processPostMedia(media) {
    if (!media) return '';
    
    // Handle both array and single object
    const mediaItems = Array.isArray(media) ? media : [media];
    
    if (mediaItems.length === 1) {
        const item = mediaItems[0];
        return item.type === 'video' 
            ? `<video controls><source src="${item.url}"></video>`
            : `<img src="${item.url}" alt="Post media">`;
    }
    
    return `
        <div class="swiper-container">
            <div class="swiper-wrapper">
                ${mediaItems.map(item => `
                    <div class="swiper-slide">
                        ${item.type === 'video'
                            ? `<video controls><source src="${item.url}"></video>`
                            : `<img src="${item.url}" alt="Post media">`}
                    </div>
                `).join('')}
            </div>
            <div class="swiper-pagination"></div>
        </div>
    `;
}

/* ===== Interactions ===== */
function setupPostInteractions() {
    // Like functionality
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const postId = btn.dataset.postId;
            const isLiked = btn.classList.contains('liked');
            
            // Optimistic UI update
            btn.classList.toggle('liked', !isLiked);
            btn.innerHTML = `<i class="${!isLiked ? 'fas' : 'far'} fa-heart"></i>`;
            
            // Update database
            const { error } = await supabase.rpc(isLiked ? 'unlike_post' : 'like_post', {
                post_id: postId,
                user_id: currentUserId
            });
            
            if (error) {
                console.error("Like error:", error);
                // Revert UI on error
                btn.classList.toggle('liked', isLiked);
                btn.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>`;
            }
        });
    });
    
    // Other interaction setup...
}

/* ===== Real-time Updates ===== */
function setupRealTimeUpdates() {
    supabase.channel('posts')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'posts'
        }, payload => {
            if (payload.eventType === 'UPDATE') {
                updatePostUI(payload.new);
            }
        })
        .subscribe();
}

function updatePostUI(updatedPost) {
    const postEl = document.querySelector(`.post[data-post-id="${updatedPost.id}"]`);
    if (!postEl) return;
    
    // Update like status
    const isLiked = updatedPost.likers?.includes(currentUserId);
    const likeBtn = postEl.querySelector('.like-btn');
    if (likeBtn) {
        likeBtn.classList.toggle('liked', isLiked);
        likeBtn.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>`;
    }
    
    // Update counts
    const statsEl = postEl.querySelector('.post-stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <span>${updatedPost.like_count} likes</span>
            <span>${updatedPost.comment_count} comments</span>
            <span>${updatedPost.views} views</span>
        `;
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', loadPosts);
