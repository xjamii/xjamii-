// posts.js - Complete Implementation

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC3wBG1yIxl3FB4oVp-7rDGlj_LE3SP2b8",
    authDomain: "x-jamii.firebaseapp.com",
    projectId: "x-jamii",
    storageBucket: "x-jamii.appspot.com",
    messagingSenderId: "927548667044",
    appId: "1:927548667044:web:835e597909f51a2e4da231",
    measurementId: "G-9S45DQ04HZ"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Global State
let currentUser = null;
let posts = [];
let lastVisiblePost = null;
let isFetching = false;

// DOM Elements
const elements = {
    postsContainer: document.getElementById('posts-container'),
    commentsPopup: document.getElementById('comments-popup'),
    likesPopup: document.getElementById('likes-popup'),
    commentLikesPopup: document.getElementById('comment-likes-popup'),
    replyLikesPopup: document.getElementById('reply-likes-popup'),
    sharePopup: document.getElementById('share-popup')
};

// Initialize Application
function init() {
    checkAuthState();
    setupEventListeners();
    renderPosts();
    handlePageSpecificLoad();
}

// Authentication State
function checkAuthState() {
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        updateUIForAuthState();
    });
}

function updateUIForAuthState() {
    // Update UI elements based on auth state
    document.querySelectorAll('.post-action, .comment-action, .reply-action').forEach(el => {
        el.style.cursor = currentUser ? 'pointer' : 'default';
    });
}

// Post Rendering
async function renderPosts(loadMore = false) {
    if (isFetching) return;
    isFetching = true;

    try {
        if (!loadMore) {
            elements.postsContainer.innerHTML = createLoadingSpinner();
        }

        let query = db.collection('posts')
            .orderBy('timestamp', 'desc')
            .limit(5);

        if (loadMore && lastVisiblePost) {
            query = query.startAfter(lastVisiblePost);
        }

        const snapshot = await query.get();
        
        if (snapshot.empty) {
            if (!loadMore) {
                elements.postsContainer.innerHTML = '<p class="no-posts">No posts yet</p>';
            }
            return;
        }

        lastVisiblePost = snapshot.docs[snapshot.docs.length - 1];
        
        if (!loadMore) {
            elements.postsContainer.innerHTML = '';
        }

        const newPosts = await Promise.all(
            snapshot.docs.map(async doc => await enrichPostData(doc))
        );

        posts = loadMore ? [...posts, ...newPosts] : newPosts;
        newPosts.forEach(post => elements.postsContainer.appendChild(createPostElement(post)));

        initializeMediaGalleries();
    } catch (error) {
        console.error("Error loading posts:", error);
        if (!loadMore) {
            elements.postsContainer.innerHTML = '<p class="error">Error loading posts</p>';
        }
    } finally {
        isFetching = false;
    }
}

async function enrichPostData(doc) {
    const post = doc.data();
    post.id = doc.id;
    
    // Get user data
    const userSnap = await db.collection('users').doc(post.userId).get();
    post.user = userSnap.data();
    
    // Check if liked
    if (currentUser) {
        const likeSnap = await db.collection('posts')
            .doc(post.id)
            .collection('likes')
            .doc(currentUser.uid)
            .get();
        post.isLiked = likeSnap.exists;
    }
    
    return post;
}

function createPostElement(post) {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.dataset.postId = post.id;

    postEl.innerHTML = `
        ${createPostHeader(post)}
        <div class="post-content">${formatPostContent(post.content)}</div>
        ${createMediaContent(post)}
        ${createPostStats(post)}
        ${createPostActions(post)}
        <div class="like-animation"></div>
    `;

    return postEl;
}

function createPostHeader(post) {
    return `
        <div class="post-header">
            <div class="post-avatar" onclick="navigateToProfile('${post.user.username}')">
                ${post.user.photoURL ? 
                    `<img src="${post.user.photoURL}" alt="${post.user.displayName}">` : 
                    post.user.displayName.charAt(0)}
            </div>
            <div class="post-user-info">
                <div class="post-user" onclick="navigateToProfile('${post.user.username}')">
                    ${post.user.displayName} 
                    ${post.user.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                </div>
                <div class="post-username" onclick="navigateToProfile('${post.user.username}')">
                    @${post.user.username}
                </div>
            </div>
            <div class="post-top-right">
                <span class="post-time-right">${formatTime(post.timestamp)}</span>
                <div class="post-more"><i class="fas fa-ellipsis-h"></i></div>
                ${createPostMenu(post)}
            </div>
        </div>
    `;
}

function createPostMenu(post) {
    return `
        <div class="post-more-menu">
            ${currentUser?.uid === post.userId ? `
                <div class="post-more-option edit-post">
                    <i class="fas fa-edit"></i><span>Edit</span>
                </div>
                <div class="post-more-option delete-post">
                    <i class="fas fa-trash-alt"></i><span>Delete</span>
                </div>
            ` : ''}
            <div class="post-more-option report-post">
                <i class="fas fa-flag"></i><span>Report</span>
            </div>
        </div>
    `;
}

function createMediaContent(post) {
    if (!post.media || post.media.length === 0) return '';

    if (post.media.length === 1) {
        return post.media[0].type === 'video' ? createVideoPlayer(post.media[0]) : createSingleImage(post.media[0]);
    }

    return createMediaGallery(post.media);
}

function createVideoPlayer(media) {
    return `
        <div class="video-container">
            <video preload="metadata">
                <source src="${media.url}" type="video/mp4">
            </video>
            <div class="video-overlay">
                <i class="fas fa-play play-button"></i>
            </div>
            <div class="video-loader" style="display:none;">
                <div class="spinner"></div>
            </div>
        </div>
    `;
}

function createSingleImage(media) {
    return `
        <div class="single-image-container">
            <img src="${media.url}" alt="Post image" loading="lazy">
        </div>
    `;
}

function createMediaGallery(media) {
    return `
        <div class="swiper-container">
            <div class="swiper-wrapper">
                ${media.map(item => `
                    <div class="swiper-slide">
                        <img src="${item.url}" alt="Post image" loading="lazy">
                    </div>
                `).join('')}
            </div>
            <div class="photo-counter">1/${media.length}</div>
        </div>
    `;
}

function createPostStats(post) {
    return `
        <div class="post-stats">
            <div class="post-likes" onclick="showLikes('${post.id}')">
                <span class="likes-count">${post.likeCount || 0}</span>
            </div>
            <div class="post-viewers">
                <i class="fas fa-eye viewers-icon"></i>
                <span>${post.viewCount || 0} views</span>
            </div>
        </div>
    `;
}

function createPostActions(post) {
    return `
        <div class="post-actions">
            <div class="post-action like-btn ${post.isLiked ? 'liked' : ''}">
                <i class="${post.isLiked ? 'fas' : 'far'} fa-heart"></i>
                <span class="like-count">${post.likeCount || 0}</span>
            </div>
            <div class="post-action comment-btn">
                <i class="far fa-comment"></i>
                <span class="comment-count">${post.commentCount || 0}</span>
            </div>
            <div class="post-action share-btn">
                <i class="fas fa-share"></i>
                <span class="share-count">${post.shareCount || 0}</span>
            </div>
        </div>
    `;
}

// Comments System
async function showComments(postId) {
    elements.commentsPopup.querySelector('.comment-popup-content').innerHTML = createLoadingSpinner();
    elements.commentsPopup.classList.add('show');

    try {
        const [postSnap, commentsSnap] = await Promise.all([
            db.collection('posts').doc(postId).get(),
            db.collection('posts').doc(postId)
                .collection('comments')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get()
        ]);

        const post = postSnap.data();
        const comments = await Promise.all(
            commentsSnap.docs.map(async doc => await enrichCommentData(doc, postId))
        );

        renderComments(comments, postId);
        setupCommentPosting(postId);
    } catch (error) {
        console.error("Error loading comments:", error);
        showErrorInPopup(elements.commentsPopup, "Error loading comments");
    }
}

async function enrichCommentData(doc, postId) {
    const comment = doc.data();
    const userSnap = await db.collection('users').doc(comment.userId).get();
    
    // Check if liked
    let isLiked = false;
    if (currentUser) {
        const likeSnap = await db.collection('posts').doc(postId)
            .collection('comments').doc(doc.id)
            .collection('likes').doc(currentUser.uid)
            .get();
        isLiked = likeSnap.exists;
    }
    
    return {
        ...comment,
        id: doc.id,
        user: userSnap.data(),
        isLiked
    };
}

function renderComments(comments, postId) {
    elements.commentsPopup.querySelector('.comment-popup-content').innerHTML = comments
        .map(comment => createCommentElement(comment, postId))
        .join('');

    elements.commentsPopup.querySelector('.comment-count').textContent = 
        `${comments.length} comment${comments.length !== 1 ? 's' : ''}`;
}

function createCommentElement(comment, postId) {
    return `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-avatar" onclick="navigateToProfile('${comment.user.username}')">
                ${comment.user.photoURL ? 
                    `<img src="${comment.user.photoURL}" alt="${comment.user.displayName}">` : 
                    comment.user.displayName.charAt(0)}
            </div>
            <div class="comment-content">
                <div class="comment-user" onclick="navigateToProfile('${comment.user.username}')">
                    ${comment.user.displayName}
                    ${comment.user.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                    <span class="comment-username">@${comment.user.username}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-actions">
                    <div class="left-actions">
                        <div class="comment-action like-comment ${comment.isLiked ? 'liked' : ''}" 
                             data-comment-id="${comment.id}">
                            <i class="${comment.isLiked ? 'fas' : 'far'} fa-heart"></i>
                            <span class="like-count">${comment.likeCount || 0}</span>
                        </div>
                        <div class="comment-action reply-btn" 
                             data-username="${comment.user.username}">
                            Reply
                        </div>
                    </div>
                    <div class="right-actions">
                        <div class="comment-likes" 
                             onclick="showCommentLikes('${comment.id}', '${postId}')">
                            ${comment.likeCount || 0} likes
                        </div>
                        ${currentUser?.uid === comment.userId ? `
                            <div class="comment-more">
                                <i class="fas fa-ellipsis-h"></i>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="comment-time">${formatTime(comment.timestamp)}</div>
                ${createCommentReplies(comment, postId)}
            </div>
        </div>
    `;
}

async function createCommentReplies(comment, postId) {
    const repliesSnap = await db.collection('posts').doc(postId)
        .collection('comments').doc(comment.id)
        .collection('replies')
        .orderBy('timestamp')
        .limit(2)
        .get();

    if (repliesSnap.empty) return '';

    const replies = await Promise.all(
        repliesSnap.docs.map(async doc => await enrichReplyData(doc, postId, comment.id))
    );

    return `
        <div class="comment-replies">
            ${replies.map(reply => createReplyElement(reply, postId, comment.id)).join('')}
            ${comment.replyCount > 2 ? `
                <div class="view-replies" 
                     onclick="loadMoreReplies('${comment.id}', '${postId}')">
                    View ${comment.replyCount - 2} more replies
                </div>
            ` : ''}
        </div>
    `;
}

async function enrichReplyData(doc, postId, commentId) {
    const reply = doc.data();
    const userSnap = await db.collection('users').doc(reply.userId).get();
    
    // Check if liked
    let isLiked = false;
    if (currentUser) {
        const likeSnap = await db.collection('posts').doc(postId)
            .collection('comments').doc(commentId)
            .collection('replies').doc(doc.id)
            .collection('likes').doc(currentUser.uid)
            .get();
        isLiked = likeSnap.exists;
    }
    
    return {
        ...reply,
        id: doc.id,
        user: userSnap.data(),
        isLiked
    };
}

function createReplyElement(reply, postId, commentId) {
    return `
        <div class="reply-item" data-reply-id="${reply.id}">
            <div class="reply-avatar" onclick="navigateToProfile('${reply.user.username}')">
                ${reply.user.photoURL ? 
                    `<img src="${reply.user.photoURL}" alt="${reply.user.displayName}">` : 
                    reply.user.displayName.charAt(0)}
            </div>
            <div class="reply-content">
                <div class="reply-user" onclick="navigateToProfile('${reply.user.username}')">
                    ${reply.user.displayName}
                    ${reply.user.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                    <span class="reply-username">@${reply.user.username}</span>
                </div>
                <div class="reply-text">${reply.text}</div>
                <div class="reply-actions">
                    <div class="left-actions">
                        <div class="reply-action like-reply ${reply.isLiked ? 'liked' : ''}" 
                             data-reply-id="${reply.id}">
                            <i class="${reply.isLiked ? 'fas' : 'far'} fa-heart"></i>
                            <span class="like-count">${reply.likeCount || 0}</span>
                        </div>
                    </div>
                    <div class="right-actions">
                        <div class="reply-likes" 
                             onclick="showReplyLikes('${reply.id}', '${commentId}', '${postId}')">
                            ${reply.likeCount || 0} likes
                        </div>
                    </div>
                </div>
                <div class="reply-time">${formatTime(reply.timestamp)}</div>
            </div>
        </div>
    `;
}

// Likes System
async function showLikes(postId) {
    elements.likesPopup.querySelector('.likes-popup-content').innerHTML = createLoadingSpinner();
    elements.likesPopup.classList.add('show');

    try {
        const likesSnap = await db.collection('posts').doc(postId)
            .collection('likes')
            .orderBy('likedAt', 'desc')
            .limit(50)
            .get();

        const likes = await Promise.all(
            likesSnap.docs.map(async doc => await enrichLikeData(doc))
        );

        renderLikes(likes);
    } catch (error) {
        console.error("Error loading likes:", error);
        showErrorInPopup(elements.likesPopup, "Error loading likes");
    }
}

async function showCommentLikes(commentId, postId) {
    elements.commentLikesPopup.querySelector('.comment-likes-popup-content').innerHTML = createLoadingSpinner();
    elements.commentLikesPopup.classList.add('show');

    try {
        const likesSnap = await db.collection('posts').doc(postId)
            .collection('comments').doc(commentId)
            .collection('likes')
            .orderBy('likedAt', 'desc')
            .limit(50)
            .get();

        const likes = await Promise.all(
            likesSnap.docs.map(async doc => await enrichLikeData(doc))
        );

        renderCommentLikes(likes);
    } catch (error) {
        console.error("Error loading comment likes:", error);
        showErrorInPopup(elements.commentLikesPopup, "Error loading likes");
    }
}

async function showReplyLikes(replyId, commentId, postId) {
    elements.replyLikesPopup.querySelector('.reply-likes-popup-content').innerHTML = createLoadingSpinner();
    elements.replyLikesPopup.classList.add('show');

    try {
        const likesSnap = await db.collection('posts').doc(postId)
            .collection('comments').doc(commentId)
            .collection('replies').doc(replyId)
            .collection('likes')
            .orderBy('likedAt', 'desc')
            .limit(50)
            .get();

        const likes = await Promise.all(
            likesSnap.docs.map(async doc => await enrichLikeData(doc))
        );

        renderReplyLikes(likes);
    } catch (error) {
        console.error("Error loading reply likes:", error);
        showErrorInPopup(elements.replyLikesPopup, "Error loading likes");
    }
}

async function enrichLikeData(doc) {
    const userSnap = await db.collection('users').doc(doc.id).get();
    const user = userSnap.data();
    
    // Check if current user follows this user
    let isFollowing = false;
    if (currentUser) {
        const followSnap = await db.collection('users')
            .doc(currentUser.uid)
            .collection('following')
            .doc(doc.id)
            .get();
        isFollowing = followSnap.exists;
    }
    
    return {
        ...user,
        isFollowing
    };
}

function renderLikes(likes) {
    elements.likesPopup.querySelector('.likes-popup-content').innerHTML = 
        likes.map(user => createLikeItem(user)).join('');
    elements.likesPopup.querySelector('.likes-count').textContent = 
        `${likes.length} like${likes.length !== 1 ? 's' : ''}`;
}

function renderCommentLikes(likes) {
    elements.commentLikesPopup.querySelector('.comment-likes-popup-content').innerHTML = 
        likes.map(user => createLikeItem(user)).join('');
    elements.commentLikesPopup.querySelector('.comment-likes-count').textContent = 
        `${likes.length} like${likes.length !== 1 ? 's' : ''}`;
}

function renderReplyLikes(likes) {
    elements.replyLikesPopup.querySelector('.reply-likes-popup-content').innerHTML = 
        likes.map(user => createLikeItem(user)).join('');
    elements.replyLikesPopup.querySelector('.reply-likes-count').textContent = 
        `${likes.length} like${likes.length !== 1 ? 's' : ''}`;
}

function createLikeItem(user) {
    return `
        <div class="like-item">
            <div class="like-avatar" onclick="navigateToProfile('${user.username}')">
                ${user.photoURL ? 
                    `<img src="${user.photoURL}" alt="${user.displayName}">` : 
                    user.displayName.charAt(0)}
            </div>
            <div class="like-user-info">
                <div class="like-user" onclick="navigateToProfile('${user.username}')">
                    ${user.displayName}
                    ${user.verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                </div>
                <div class="like-username" onclick="navigateToProfile('${user.username}')">
                    @${user.username}
                </div>
            </div>
            ${currentUser?.uid !== user.uid ? `
                <button class="like-follow-btn ${user.isFollowing ? 'following' : ''}"
                        data-user-id="${user.uid}">
                    ${user.isFollowing ? 'Following' : 'Follow'}
                </button>
            ` : ''}
        </div>
    `;
}

// Event Handling
function setupEventListeners() {
    // Window events
    window.addEventListener('scroll', handleInfiniteScroll);
    
    // Delegated event listeners
    document.addEventListener('click', handlePostInteractions);
    document.addEventListener('click', handleCommentInteractions);
    document.addEventListener('click', handleReplyInteractions);
    document.addEventListener('click', handleFollowButtons);
    document.addEventListener('click', handleVideoInteractions);
    document.addEventListener('click', handlePopupClosures);
}

function handleInfiniteScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        renderPosts(true);
    }
}

function handlePostInteractions(e) {
    const postEl = e.target.closest('.post');
    if (!postEl) return;
    
    const postId = postEl.dataset.postId;
    
    // Like button
    if (e.target.closest('.like-btn')) {
        handlePostLike(postEl, postId);
    }
    // Comment button
    else if (e.target.closest('.comment-btn')) {
        showComments(postId);
    }
    // More options
    else if (e.target.closest('.post-more')) {
        e.stopPropagation();
        const menu = postEl.querySelector('.post-more-menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

async function handlePostLike(postEl, postId) {
    if (!currentUser) return showAuthAlert();
    
    const likeBtn = postEl.querySelector('.like-btn');
    const isLiked = likeBtn.classList.contains('liked');
    
    try {
        if (isLiked) {
            await db.collection('posts').doc(postId)
                .collection('likes').doc(currentUser.uid).delete();
            
            await db.collection('posts').doc(postId).update({
                likeCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            likeBtn.classList.remove('liked');
            likeBtn.querySelector('i').className = 'far fa-heart';
        } else {
            await db.collection('posts').doc(postId)
                .collection('likes').doc(currentUser.uid).set({
                    likedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            await db.collection('posts').doc(postId).update({
                likeCount: firebase.firestore.FieldValue.increment(1)
            });
            
            likeBtn.classList.add('liked');
            likeBtn.querySelector('i').className = 'fas fa-heart';
            
            // Animation
            const anim = postEl.querySelector('.like-animation');
            anim.innerHTML = '❤️';
            anim.style.display = 'block';
            setTimeout(() => anim.style.display = 'none', 1000);
        }
        
        // Update counts
        const likeCount = parseInt(likeBtn.querySelector('.like-count').textContent);
        likeBtn.querySelector('.like-count').textContent = isLiked ? likeCount - 1 : likeCount + 1;
        postEl.querySelector('.likes-count').textContent = isLiked ? likeCount - 1 : likeCount + 1;
    } catch (error) {
        console.error("Error toggling like:", error);
    }
}

function handleCommentInteractions(e) {
    const commentEl = e.target.closest('.comment-item');
    if (!commentEl) return;
    
    const commentId = commentEl.dataset.commentId;
    const postId = commentEl.closest('.post')?.dataset.postId;
    
    // Like button
    if (e.target.closest('.like-comment')) {
        handleCommentLike(commentEl, commentId, postId);
    }
    // More options
    else if (e.target.closest('.comment-more')) {
        e.stopPropagation();
        // Handle comment menu
    }
}

async function handleCommentLike(commentEl, commentId, postId) {
    if (!currentUser) return showAuthAlert();
    
    const likeBtn = commentEl.querySelector('.like-comment');
    const isLiked = likeBtn.classList.contains('liked');
    
    try {
        if (isLiked) {
            await db.collection('posts').doc(postId)
                .collection('comments').doc(commentId)
                .collection('likes').doc(currentUser.uid).delete();
            
            await db.collection('posts').doc(postId)
                .collection('comments').doc(commentId).update({
                    likeCount: firebase.firestore.FieldValue.increment(-1)
                });
            
            likeBtn.classList.remove('liked');
            likeBtn.querySelector('i').className = 'far fa-heart';
        } else {
            await db.collection('posts').doc(postId)
                .collection('comments').doc(commentId)
                .collection('likes').doc(currentUser.uid).set({
                    likedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            await db.collection('posts').doc(postId)
                .collection('comments').doc(commentId).update({
                    likeCount: firebase.firestore.FieldValue.increment(1)
                });
            
            likeBtn.classList.add('liked');
            likeBtn.querySelector('i').className = 'fas fa-heart';
        }
        
        // Update counts
        const likeCount = parseInt(likeBtn.querySelector('.like-count').textContent);
        const newCount = isLiked ? likeCount - 1 : likeCount + 1;
        likeBtn.querySelector('.like-count').textContent = newCount;
        
        const likesText = commentEl.querySelector('.comment-likes');
        if (likesText) likesText.textContent = `${newCount} like${newCount !== 1 ? 's' : ''}`;
    } catch (error) {
        console.error("Error toggling comment like:", error);
    }
}

function handleReplyInteractions(e) {
    const replyEl = e.target.closest('.reply-item');
    if (!replyEl) return;
    
    const replyId = replyEl.dataset.replyId;
    const commentId = replyEl.closest('.comment-item')?.dataset.commentId;
    const postId = replyEl.closest('.post')?.dataset.postId;
    
    // Like button
    if (e.target.closest('.like-reply')) {
        handleReplyLike(replyEl, replyId, commentId, postId);
    }
}

async function handleReplyLike(replyEl, replyId, commentId, postId) {
    if (!currentUser) return showAuthAlert();
    
    const likeBtn = replyEl.querySelector('.like-reply');
    const isLiked = likeBtn.classList.contains('liked');
    
    try {
        if (isLiked) {
            await db.collection('posts').doc(postId)
                .collection('comments').doc(commentId)
                .collection('replies').doc(replyId)
                .collection('likes').doc(currentUser.uid).delete();
            
            await db.collection('posts').doc(postId)
                .collection('comments').doc(commentId)
                .collection('replies').doc(replyId).update({
                    likeCount: firebase.firestore.FieldValue.increment(-1)
                });
            
            likeBtn.classList.remove('liked');
            likeBtn.querySelector('i').className = 'far fa-heart';
        } else {
            await db.collection('posts').doc(postId)
                .collection('comments').doc(commentId)
                .collection('replies').doc(replyId)
                .collection('likes').doc(currentUser.uid).set({
                    likedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            await db.collection('posts').doc(postId)
                .collection('comments').doc(commentId)
                .collection('replies').doc(replyId).update({
                    likeCount: firebase.firestore.FieldValue.increment(1)
                });
            
            likeBtn.classList.add('liked');
            likeBtn.querySelector('i').className = 'fas fa-heart';
        }
        
        // Update counts
        const likeCount = parseInt(likeBtn.querySelector('.like-count').textContent);
        const newCount = isLiked ? likeCount - 1 : likeCount + 1;
        likeBtn.querySelector('.like-count').textContent = newCount;
        
        const likesText = replyEl.querySelector('.reply-likes');
        if (likesText) likesText.textContent = `${newCount} like${newCount !== 1 ? 's' : ''}`;
    } catch (error) {
        console.error("Error toggling reply like:", error);
    }
}

function handleFollowButtons(e) {
    const followBtn = e.target.closest('.like-follow-btn');
    if (!followBtn || !currentUser) return;
    
    const userId = followBtn.dataset.userId;
    const isFollowing = followBtn.classList.contains('following');
    
    toggleFollow(userId, isFollowing, followBtn);
}

async function toggleFollow(userId, isFollowing, followBtn) {
    try {
        if (isFollowing) {
            await db.collection('users').doc(currentUser.uid)
                .collection('following').doc(userId).delete();
            
            followBtn.classList.remove('following');
            followBtn.textContent = 'Follow';
        } else {
            await db.collection('users').doc(currentUser.uid)
                .collection('following').doc(userId).set({
                    followedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            followBtn.classList.add('following');
            followBtn.textContent = 'Following';
        }
    } catch (error) {
        console.error("Error toggling follow:", error);
    }
}

function handleVideoInteractions(e) {
    const videoContainer = e.target.closest('.video-container');
    if (!videoContainer) return;
    
    const video = videoContainer.querySelector('video');
    const overlay = videoContainer.querySelector('.video-overlay');
    const loader = videoContainer.querySelector('.video-loader');
    
    if (video.paused) {
        overlay.style.display = 'none';
        loader.style.display = 'flex';
        
        video.play().then(() => {
            loader.style.display = 'none';
        }).catch(error => {
            console.error("Error playing video:", error);
            loader.style.display = 'none';
            overlay.style.display = 'flex';
        });
    } else {
        video.pause();
        overlay.style.display = 'flex';
    }
}

function handlePopupClosures(e) {
    // Close popups when clicking outside
    if (!e.target.closest('.post-more-menu') && !e.target.closest('.post-more')) {
        document.querySelectorAll('.post-more-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
    
    if (e.target.classList.contains('drag-handle') || 
        e.target.closest('.drag-handle')) {
        const popup = e.target.closest('.comment-popup, .likes-popup, .comment-likes-popup, .reply-likes-popup');
        if (popup) popup.classList.remove('show');
    }
}

// Helper Functions
function createLoadingSpinner() {
    return '<div class="loading-spinner"><div class="spinner"></div></div>';
}

function showErrorInPopup(popup, message) {
    popup.querySelector('.popup-content').innerHTML = `
        <div class="error">${message}</div>
    `;
}

function showAuthAlert() {
    alert("Please log in to perform this action");
}

function formatPostContent(text) {
    // URLs
    text = text.replace(/(https?:\/\/[^\s]+)/g, url => {
        return `<a href="${url}" target="_blank">${url}</a>`;
    });
    
    // Hashtags
    text = text.replace(/#(\w+)/g, '<a href="/hashtag/$1" class="hashtag">#$1</a>');
    
    // Mentions
    text = text.replace(/@(\w+)/g, '<a href="/profile/$1" class="mention">@$1</a>');
    
    return text;
}

function formatTime(timestamp) {
    const now = new Date();
    const postTime = timestamp.toDate();
    const diff = now - postTime;
    
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    
    if (diff < minute) return 'Just now';
    if (diff < hour) return `${Math.floor(diff / minute)}m`;
    if (diff < day) return `${Math.floor(diff / hour)}h`;
    if (diff < day * 7) return `${Math.floor(diff / day)}d`;
    return postTime.toLocaleDateString();
}

function initializeMediaGalleries() {
    document.querySelectorAll('.swiper-container').forEach(container => {
        new Swiper(container, {
            loop: false,
            on: {
                slideChange: function() {
                    const counter = this.el.querySelector('.photo-counter');
                    if (counter) {
                        counter.textContent = `${this.activeIndex + 1}/${this.slides.length}`;
                    }
                }
            }
        });
    });
}

// Global Functions
window.navigateToProfile = function(username) {
    window.location.href = `/profile/${username}`;
};

window.showComments = showComments;
window.showLikes = showLikes;
window.showCommentLikes = showCommentLikes;
window.showReplyLikes = showReplyLikes;

// Initialize
document.addEventListener('DOMContentLoaded', init);