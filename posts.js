class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.mediaViewer = null;
    this.currentMediaIndex = 0;
    this.startY = 0;
    this.startX = 0;
    this.isRefreshing = false;
    this.isLoadingMore = false;
    this.currentUserId = null; // Will be set when component loads
  }

  connectedCallback() {
    this.getCurrentUser().then(() => this.render());
  }

  static get observedAttributes() {
    return ['post-data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'post-data' && oldValue !== newValue) {
      this.render();
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;
    } catch (error) {
      console.error("Error getting current user:", error);
      this.currentUserId = null;
    }
  }

  formatTime(dateString) {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return postDate.toLocaleDateString();
  }

  getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  processContent(content) {
    if (!content) return '';
    
    // Process mentions (@username)
    content = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    // Process hashtags (#tag)
    content = content.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
    
    // Process URLs
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="url" target="_blank">$1</a>');
    
    return content;
  }

  render() {
    try {
      const postData = this.getAttribute('post-data');
      if (!postData) {
        this.innerHTML = `
          <div class="post-loading">
            <div class="loader"></div>
          </div>
        `;
        return;
      }

      const post = JSON.parse(postData);
      const profile = post.profile || {
        username: 'unknown',
        full_name: 'Unknown User',
        avatar_url: '',
        is_verified: false,
        user_id: ''
      };

      // Create avatar HTML
      const avatarHtml = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" class="post-avatar" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'20\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
        : `<div class="post-avatar initials">${this.getInitials(profile.full_name)}</div>`;

      // Check if content needs "See more"
      const content = post.content || '';
      const showSeeMore = content.length > 200;
      const displayedContent = showSeeMore ? content.substring(0, 200) + '...' : content;

      this.innerHTML = `
        <div class="post-container">
          <div class="post">
            <div class="post-header">
              <a href="/profile.html?user_id=${profile.user_id}" class="post-avatar-link" style="text-decoration: none">
                ${avatarHtml}
              </a>
              <div class="post-user-info">
                <a href="/profile.html?user_id=${profile.user_id}" class="post-user-link" style="text-decoration: none">
                  <div class="post-user">
                    ${profile.full_name || profile.username}
                    ${profile.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                  </div>
                  <div class="post-username" style="text-decoration: none">@${profile.username}</div>
                </a>
              </div>
              <span class="post-time">${this.formatTime(post.created_at)}</span>
            </div>
            ${content ? `
              <p class="post-content" data-full-content="${content.replace(/"/g, '&quot;')}">
                ${this.processContent(displayedContent)}
                ${showSeeMore ? '<span class="see-more">See more</span>' : ''}
              </p>
            ` : ''}
            ${this.renderMedia(post.media || [])}
            <div class="post-actions">
              <div class="post-action comment-action"><i class="far fa-comment"></i> ${post.comment_count || 0}</div>
              <div class="post-action like-action ${post.is_liked ? 'liked' : ''}">
                <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i> ${post.like_count || 0}
              </div>
              <div class="post-action share-action"><i class="fas fa-arrow-up-from-bracket"></i></div>
              ${this.currentUserId === post.user_id ? `<div class="post-more"><i class="fas fa-ellipsis-h"></i></div>` : ''}
            </div>
          </div>
        </div>
      `;

      this.setupEventListeners(post);

    } catch (error) {
      console.error("Error rendering post:", error);
      this.innerHTML = `<div class="post-error">Error loading post</div>`;
    }
  }

  renderMedia(mediaItems) {
    if (!mediaItems || !mediaItems.length) return '';
    
    if (mediaItems.length === 1) {
      const media = mediaItems[0];
      if (media.media_type === 'video') {
        return `
          <div class="media-container video-container">
            <div class="video-preview" data-media-index="0">
              <video class="post-media" preload="metadata">
                <source src="${media.media_url}" type="video/mp4">
              </video>
              <div class="video-play-button"><i class="fas fa-play"></i></div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="media-container">
            <img src="${media.media_url}" class="post-media" data-media-index="0">
          </div>
        `;
      }
    }
    
    return `
      <div class="media-grid">
        ${mediaItems.slice(0, 4).map((media, index) => `
          <div class="grid-media-container">
            ${media.media_type === 'video' 
              ? `<div class="video-preview" data-media-index="${index}">
                  <video class="grid-media" preload="metadata">
                    <source src="${media.media_url}" type="video/mp4">
                  </video>
                  <div class="video-play-button"><i class="fas fa-play"></i></div>
                </div>`
              : `<img src="${media.media_url}" class="grid-media" data-media-index="${index}">`}
          </div>
        `).join('')}
        ${mediaItems.length > 4 ? `
          <div class="media-count-overlay">
            +${mediaItems.length - 4}
          </div>` : ''}
      </div>
    `;
  }

  setupEventListeners(post) {
    // Like action
    this.querySelector('.like-action')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const likeBtn = e.currentTarget;
      const isLiked = likeBtn.classList.contains('liked');
      const icon = likeBtn.querySelector('i');
      const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
      
      // Optimistic UI update
      likeBtn.classList.toggle('liked');
      icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
      
      if (countEl) {
        let count = parseInt(countEl.textContent) || 0;
        countEl.textContent = isLiked ? count - 1 : count + 1;
      }
      
      // API call to like/unlike
      try {
        if (isLiked) {
          await supabase.from('post_likes').delete()
            .eq('post_id', post.id)
            .eq('user_id', this.currentUserId);
        } else {
          await supabase.from('post_likes').insert({
            post_id: post.id,
            user_id: this.currentUserId
          });
        }
      } catch (error) {
        console.error("Error updating like:", error);
        // Revert UI if API call fails
        likeBtn.classList.toggle('liked');
        icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
        if (countEl) {
          let count = parseInt(countEl.textContent) || 0;
          countEl.textContent = isLiked ? count + 1 : count - 1;
        }
      }
    });

    // More options
    this.querySelector('.post-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showMoreOptions(e, post);
    });

    // Share action
    this.querySelector('.share-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sharePost(post.id);
    });

    // Comment action - open comment page
    this.querySelector('.comment-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCommentPage(post);
    });

    // Mentions
    this.querySelectorAll('.mention').forEach(mention => {
      mention.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = e.target.textContent.substring(1);
        window.location.href = `/profile.html?username=${username}`;
      });
    });

    // Media click handlers
    this.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
      media.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaIndex = parseInt(media.getAttribute('data-media-index') || media.parentElement.getAttribute('data-media-index') || 0);
        this.showMediaViewer(post.media, mediaIndex);
      });
    });

    // See more click handler
    this.querySelector('.see-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCommentPage(post);
    });

    // Post content click handler (opens comment page)
    this.querySelector('.post-content')?.addEventListener('click', (e) => {
      if (!e.target.classList.contains('mention') && !e.target.classList.contains('hashtag') && !e.target.classList.contains('url')) {
        this.openCommentPage(post);
      }
    });

    // Setup pull-to-refresh if this is the first post
    if (this.previousElementSibling === null) {
      this.setupPullToRefresh();
    }
  }

  async openCommentPage(post) {
    // Create comment page overlay
    const commentPage = document.createElement('div');
    commentPage.className = 'comment-page-overlay';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'comment-page-header';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'comment-page-close';
    closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    closeBtn.addEventListener('click', () => {
      commentPage.classList.add('closing');
      setTimeout(() => commentPage.remove(), 300);
      document.body.style.overflow = '';
    });
    
    const title = document.createElement('div');
    title.className = 'comment-page-title';
    title.textContent = 'Comments';
    
    header.appendChild(closeBtn);
    header.appendChild(title);
    
    // Create content container that will scroll
    const contentContainer = document.createElement('div');
    contentContainer.className = 'comment-page-content-container';
    
    // Create post preview
    const postPreview = document.createElement('div');
    postPreview.className = 'comment-page-post-preview';
    
    // Clone the post content (simplified for the preview)
    const profile = post.profile || {
      username: 'unknown',
      full_name: 'Unknown User',
      avatar_url: '',
      is_verified: false,
      user_id: ''
    };
    
    const avatarHtml = profile.avatar_url 
      ? `<img src="${profile.avatar_url}" class="post-avatar" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'20\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
      : `<div class="post-avatar initials">${this.getInitials(profile.full_name)}</div>`;
    
    postPreview.innerHTML = `
      <div class="comment-page-post">
        <div class="post-header">
          <a href="/profile.html?user_id=${profile.user_id}" class="post-avatar-link" style="text-decoration: none">
            ${avatarHtml}
          </a>
          <div class="post-user-info">
            <a href="/profile.html?user_id=${profile.user_id}" class="post-user-link" style="text-decoration: none">
              <div class="post-user">
                ${profile.full_name || profile.username}
                ${profile.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
              </div>
              <div class="post-username" style="text-decoration: none">@${profile.username}</div>
            </a>
          </div>
          <span class="post-time">${this.formatTime(post.created_at)}</span>
        </div>
        ${post.content ? `<p class="post-content">${this.processContent(post.content)}</p>` : ''}
        ${this.renderMediaForCommentPage(post.media || [])}
        <div class="post-actions">
          <div class="post-action like-action ${post.is_liked ? 'liked' : ''}">
            <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i> ${post.like_count || 0}
          </div>
          <div class="post-action comment-action"><i class="far fa-comment"></i> ${post.comment_count || 0}</div>
          <div class="post-action share-action"><i class="fas fa-arrow-up-from-bracket"></i></div>
          ${this.currentUserId === post.user_id ? `<div class="post-more"><i class="fas fa-ellipsis-h"></i></div>` : ''}
        </div>
      </div>
    `;
    
    // Create comments section
    const commentsSection = document.createElement('div');
    commentsSection.className = 'comment-page-comments';
    
    // Create loading indicator
    commentsSection.innerHTML = `
      <div class="comments-loading">
        <div class="loader"></div>
      </div>
    `;
    
    // Create comment input
    const commentInput = document.createElement('div');
    commentInput.className = 'comment-page-input-container';
    commentInput.innerHTML = `
      <input type="text" class="comment-page-input" placeholder="Write a comment...">
      <button class="comment-page-send"><i class="fas fa-paper-plane"></i></button>
    `;
    
    // Assemble the page
    contentContainer.appendChild(postPreview);
    contentContainer.appendChild(commentsSection);
    
    commentPage.appendChild(header);
    commentPage.appendChild(contentContainer);
    commentPage.appendChild(commentInput);
    
    document.body.appendChild(commentPage);
    document.body.style.overflow = 'hidden';
    
    // Load comments
    this.loadComments(post.id, commentsSection);
    
    // Setup event listeners for the comment page
    this.setupCommentPageEventListeners(commentPage, post);
    
    // Focus the input
    setTimeout(() => {
      commentPage.querySelector('.comment-page-input')?.focus();
    }, 300);
  }

  async loadComments(postId, container) {
    try {
      // Fetch comments with user profiles
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile:profiles(*),
          likes:comment_likes(count),
          is_liked:comment_likes!inner(user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process comments data
      const processedComments = comments.map(comment => ({
        ...comment,
        like_count: comment.likes[0]?.count || 0,
        is_liked: comment.is_liked.some(like => like.user_id === this.currentUserId)
      }));
      
      // Render comments
      if (processedComments.length === 0) {
        container.innerHTML = `
          <div class="no-comments">
            <i class="far fa-comment-dots"></i>
            <div>No comments yet</div>
          </div>
        `;
      } else {
        container.innerHTML = processedComments.map(comment => this.renderComment(comment)).join('');
      }
      
      // Add event listeners to comments
      container.querySelectorAll('.comment').forEach(commentEl => {
        const commentId = commentEl.dataset.commentId;
        const comment = processedComments.find(c => c.id === commentId);
        if (comment) {
          this.setupCommentEventListeners(commentEl, comment);
        }
      });
      
    } catch (error) {
      console.error("Error loading comments:", error);
      container.innerHTML = `
        <div class="comments-error">
          <i class="fas fa-exclamation-circle"></i>
          <div>Error loading comments</div>
        </div>
      `;
    }
  }

  renderComment(comment) {
    const profile = comment.profile || {
      username: 'unknown',
      full_name: 'Unknown User',
      avatar_url: '',
      is_verified: false,
      user_id: ''
    };
    
    const avatarHtml = profile.avatar_url 
      ? `<img src="${profile.avatar_url}" class="comment-avatar" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'40\\'><rect width=\\'40\\' height=\\'40\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'16\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
      : `<div class="comment-avatar initials">${this.getInitials(profile.full_name)}</div>`;
    
    return `
      <div class="comment" data-comment-id="${comment.id}">
        <div class="comment-header">
          <a href="/profile.html?user_id=${profile.user_id}" class="comment-avatar-link">
            ${avatarHtml}
          </a>
          <div class="comment-user-info">
            <a href="/profile.html?user_id=${profile.user_id}" class="comment-user-link">
              <div class="comment-user">
                ${profile.full_name || profile.username}
                ${profile.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
              </div>
              <div class="comment-username">@${profile.username}</div>
            </a>
          </div>
          <span class="comment-time">${this.formatTime(comment.created_at)}</span>
          ${this.currentUserId === comment.user_id ? `<div class="comment-more"><i class="fas fa-ellipsis-h"></i></div>` : ''}
        </div>
        <div class="comment-content">${this.processContent(comment.content)}</div>
        <div class="comment-actions">
          <button class="comment-action reply-action" data-username="${profile.username}">
            <i class="far fa-comment-dots"></i> Reply
          </button>
          <div class="comment-action like-action ${comment.is_liked ? 'liked' : ''}">
            <i class="${comment.is_liked ? 'fas' : 'far'} fa-heart"></i> ${comment.like_count || 0}
          </div>
        </div>
      </div>
    `;
  }

  setupCommentEventListeners(commentEl, comment) {
    // Like action
    commentEl.querySelector('.like-action')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const likeBtn = e.currentTarget;
      const isLiked = likeBtn.classList.contains('liked');
      const icon = likeBtn.querySelector('i');
      const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
      
      // Optimistic UI update
      likeBtn.classList.toggle('liked');
      icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
      
      if (countEl) {
        let count = parseInt(countEl.textContent) || 0;
        countEl.textContent = isLiked ? count - 1 : count + 1;
      }
      
      // API call to like/unlike
      try {
        if (isLiked) {
          await supabase.from('comment_likes').delete()
            .eq('comment_id', comment.id)
            .eq('user_id', this.currentUserId);
        } else {
          await supabase.from('comment_likes').insert({
            comment_id: comment.id,
            user_id: this.currentUserId
          });
        }
      } catch (error) {
        console.error("Error updating comment like:", error);
        // Revert UI if API call fails
        likeBtn.classList.toggle('liked');
        icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
        if (countEl) {
          let count = parseInt(countEl.textContent) || 0;
          countEl.textContent = isLiked ? count + 1 : count - 1;
        }
      }
    });
    
    // Reply action
    commentEl.querySelector('.reply-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const username = e.currentTarget.dataset.username;
      const input = this.querySelector('.comment-page-input');
      input.value = `@${username} `;
      input.focus();
    });
    
    // More options
    commentEl.querySelector('.comment-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCommentMoreOptions(e, comment);
    });
  }

  showCommentMoreOptions(e, comment) {
    // Remove any existing popups
    document.querySelectorAll('.more-options-popup').forEach(el => el.remove());
    
    const popup = document.createElement('div');
    popup.className = 'more-options-popup';
    popup.innerHTML = `
      <div class="more-options-content">
        <div class="more-option edit-option"><i class="fas fa-edit"></i> Edit</div>
        <div class="more-option delete-option"><i class="fas fa-trash-alt"></i> Delete</div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Position the popup
    const rect = e.target.getBoundingClientRect();
    popup.style.left = `${rect.left - 100}px`;
    popup.style.top = `${rect.top - 10}px`;
    
    // Close when clicking outside
    const clickHandler = (event) => {
      if (!popup.contains(event.target)) {
        popup.remove();
        document.removeEventListener('click', clickHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', clickHandler);
    }, 0);
    
    // Add option handlers
    popup.querySelector('.edit-option')?.addEventListener('click', () => {
      popup.remove();
      this.openEditCommentPage(comment);
    });
    
    popup.querySelector('.delete-option')?.addEventListener('click', async () => {
      popup.remove();
      try {
        await supabase.from('comments').delete().eq('id', comment.id);
        document.querySelector(`.comment[data-comment-id="${comment.id}"]`)?.remove();
      } catch (error) {
        console.error("Error deleting comment:", error);
        alert("Failed to delete comment. Please try again.");
      }
    });
  }

  openEditCommentPage(comment) {
    // Create edit page overlay
    const editPage = document.createElement('div');
    editPage.className = 'edit-page-overlay';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'edit-page-header';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'edit-page-close';
    closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    closeBtn.addEventListener('click', () => {
      editPage.classList.add('closing');
      setTimeout(() => editPage.remove(), 300);
      document.body.style.overflow = '';
    });
    
    const title = document.createElement('div');
    title.className = 'edit-page-title';
    title.textContent = 'Edit Comment';
    
    const saveBtn = document.createElement('div');
    saveBtn.className = 'edit-page-save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      const newContent = textarea.value.trim();
      if (newContent && newContent !== comment.content) {
        try {
          await supabase.from('comments')
            .update({ content: newContent })
            .eq('id', comment.id);
          
          // Close the edit page
          editPage.classList.add('closing');
          setTimeout(() => editPage.remove(), 300);
          document.body.style.overflow = '';
          
          // Update the comment in the UI
          const commentEl = document.querySelector(`.comment[data-comment-id="${comment.id}"] .comment-content`);
          if (commentEl) {
            commentEl.innerHTML = this.processContent(newContent);
          }
        } catch (error) {
          console.error("Error updating comment:", error);
          alert("Failed to update comment. Please try again.");
        }
      }
    });
    
    header.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(saveBtn);
    
    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-page-textarea';
    textarea.value = comment.content;
    textarea.placeholder = 'Edit your comment...';
    
    // Assemble the page
    editPage.appendChild(header);
    editPage.appendChild(textarea);
    
    document.body.appendChild(editPage);
    document.body.style.overflow = 'hidden';
    
    // Focus the textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 300);
  }

  setupCommentPageEventListeners(commentPage, post) {
    // Like action
    commentPage.querySelector('.like-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const likeBtn = e.currentTarget;
      const isLiked = likeBtn.classList.contains('liked');
      const icon = likeBtn.querySelector('i');
      const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
      
      likeBtn.classList.toggle('liked');
      icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
      
      if (countEl) {
        let count = parseInt(countEl.textContent) || 0;
        countEl.textContent = isLiked ? count - 1 : count + 1;
      }
    });

    // More options
    commentPage.querySelector('.post-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showMoreOptions(e, post);
    });

    // Share action
    commentPage.querySelector('.share-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sharePost(post.id);
    });

    // Comment button focuses input
    commentPage.querySelector('.comment-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      commentPage.querySelector('.comment-page-input')?.focus();
    });

    // Media click handlers
    commentPage.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
      media.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaIndex = parseInt(media.getAttribute('data-media-index') || media.parentElement.getAttribute('data-media-index') || 0);
        this.showMediaViewer(post.media, mediaIndex);
      });
    });

    // Send comment button
    commentPage.querySelector('.comment-page-send')?.addEventListener('click', async () => {
      const input = commentPage.querySelector('.comment-page-input');
      const commentText = input.value.trim();
      if (commentText) {
        try {
          const { data: comment, error } = await supabase
            .from('comments')
            .insert({
              post_id: post.id,
              user_id: this.currentUserId,
              content: commentText
            })
            .select()
            .single();
          
          if (error) throw error;
          
          // Clear input
          input.value = '';
          
          // Reload comments
          const commentsSection = commentPage.querySelector('.comment-page-comments');
          this.loadComments(post.id, commentsSection);
          
        } catch (error) {
          console.error("Error posting comment:", error);
          alert("Failed to post comment. Please try again.");
        }
      }
    });

    // Press Enter to send comment
    commentPage.querySelector('.comment-page-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        commentPage.querySelector('.comment-page-send')?.click();
      }
    });
  }

  showMoreOptions(e, post) {
    const isOwner = this.currentUserId === post.user_id;
    
    // Remove any existing popups
    document.querySelectorAll('.more-options-popup').forEach(el => el.remove());
    
    const popup = document.createElement('div');
    popup.className = 'more-options-popup';
    popup.innerHTML = `
      <div class="more-options-content">
        ${isOwner ? `
          <div class="more-option edit-option"><i class="fas fa-edit"></i> Edit</div>
          <div class="more-option delete-option"><i class="fas fa-trash-alt"></i> Delete</div>
        ` : `
          <div class="more-option report-option"><i class="fas fa-flag"></i> Report</div>
        `}
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Position the popup
    const rect = e.target.getBoundingClientRect();
    popup.style.left = `${rect.left - 100}px`;
    popup.style.top = `${rect.top - 10}px`;
    
    // Close when clicking outside
    const clickHandler = (event) => {
      if (!popup.contains(event.target)) {
        popup.remove();
        document.removeEventListener('click', clickHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', clickHandler);
    }, 0);
    
    // Add option handlers
    popup.querySelector('.edit-option')?.addEventListener('click', () => {
      popup.remove();
      this.openEditPostPage(post);
    });
    
    popup.querySelector('.delete-option')?.addEventListener('click', async () => {
      popup.remove();
      try {
        await supabase.from('posts').delete().eq('id', post.id);
        this.remove(); // Remove the post component from DOM
      } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post. Please try again.");
      }
    });
    
    popup.querySelector('.report-option')?.addEventListener('click', () => {
      popup.remove();
      alert("Report submitted. Thank you for your feedback.");
    });
  }

  openEditPostPage(post) {
    // Create edit page overlay
    const editPage = document.createElement('div');
    editPage.className = 'edit-page-overlay';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'edit-page-header';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'edit-page-close';
    closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    closeBtn.addEventListener('click', () => {
      editPage.classList.add('closing');
      setTimeout(() => editPage.remove(), 300);
      document.body.style.overflow = '';
    });
    
    const title = document.createElement('div');
    title.className = 'edit-page-title';
    title.textContent = 'Edit Post';
    
    const saveBtn = document.createElement('div');
    saveBtn.className = 'edit-page-save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      const newContent = textarea.value.trim();
      if (newContent && newContent !== post.content) {
        try {
          await supabase.from('posts')
            .update({ content: newContent })
            .eq('id', post.id);
          
          // Close the edit page
          editPage.classList.add('closing');
          setTimeout(() => editPage.remove(), 300);
          document.body.style.overflow = '';
          
          // Update the post in the UI
          this.setAttribute('post-data', JSON.stringify({
            ...post,
            content: newContent
          }));
        } catch (error) {
          console.error("Error updating post:", error);
          alert("Failed to update post. Please try again.");
        }
      }
    });
    
    header.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(saveBtn);
    
    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-page-textarea';
    textarea.value = post.content || '';
    textarea.placeholder = 'Edit your post...';
    
    // Assemble the page
    editPage.appendChild(header);
    editPage.appendChild(textarea);
    
    document.body.appendChild(editPage);
    document.body.style.overflow = 'hidden';
    
    // Focus the textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 300);
  }

  // ... (rest of your existing methods remain the same)
}

customElements.define('post-component', PostComponent);
