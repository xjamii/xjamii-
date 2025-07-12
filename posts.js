

class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.mediaViewer = null;
    this.currentMediaIndex = 0;
    this.startY = 0;
    this.startX = 0;
    this.isRefreshing = false;
    this.isLoadingMore = false;
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ['post-data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'post-data' && oldValue !== newValue) {
      this.render();
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

async toggleLike(postId, isCurrentlyLiked) {
  try {
    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return { success: false, error: 'Not authenticated' };
    }
    
    const currentUserId = user.id;
    console.log(`Toggling like for post ${postId} by user ${currentUserId}`);

    if (!isCurrentlyLiked) {
      // Add like
      const { data, error } = await supabase
        .from('likes')
        .insert([{ 
          post_id: postId, 
          profile_id: currentUserId 
        }])
        .select();
      
      if (error) {
        console.error('Like insertion error:', error);
        throw error;
      }
      console.log('Like added successfully:', data);
      
      // Update the post's like count in the database
      await supabase.rpc('increment_like_count', { post_id: postId });
      
      return { success: true, newLikeState: true };
    } else {
      // Remove like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('profile_id', currentUserId);
      
      if (error) {
        console.error('Like deletion error:', error);
        throw error;
      }
      console.log('Like removed successfully');
      
      // Update the post's like count in the database
      await supabase.rpc('decrement_like_count', { post_id: postId });
      
      return { success: true, newLikeState: false };
    }
  } catch (err) {
    console.error('Error in toggleLike:', {
      message: err.message,
      code: err.code,
      details: err.details
    });
    return { 
      success: false, 
      error: err.message 
    };
  }
}

  async checkLikeStatus(postId) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false; // User not authenticated
    }
    
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('profile_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
      console.error('Error checking like status:', error);
      return false;
    }
    
    return !!data; // Returns true if like exists, false otherwise
  } catch (err) {
    console.error('Error in checkLikeStatus:', err);
    return false;
  }
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

         // Check like status from database
    const isLiked = await this.checkLikeStatus(post.id);
    post.is_liked = isLiked; // Update the post object with current like status
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
              <div class="post-more"><i class="fas fa-ellipsis-h"></i></div>
              <div class="post-action views"><i class="fas fa-chart-bar"></i> ${post.views || 0}</div>
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
  
  // Optimistic UI update
  likeBtn.classList.toggle('liked');
  const icon = likeBtn.querySelector('i');
  icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
  
  // Update count immediately
  const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
  if (countEl) {
    let count = parseInt(countEl.textContent) || 0;
    countEl.textContent = isLiked ? count - 1 : count + 1;
  }
  
  try {
    const { success, error } = await this.toggleLike(post.id, isLiked);
    
    if (!success) {
      throw new Error(error || 'Failed to update like');
    }
    
    // Update the post object with the new state
    post.is_liked = !isLiked;
    post.like_count = parseInt(countEl.textContent);
  } catch (error) {
    // Revert UI if API call failed
    likeBtn.classList.toggle('liked');
    icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
    if (countEl) {
      let count = parseInt(countEl.textContent) || 0;
      countEl.textContent = isLiked ? count + 1 : count - 1;
    }
    
    console.error('Like update failed:', error);
    alert(`Error: ${error.message}. Please try again.`);
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

    // URLs - already handled by anchor tags in processContent

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

  showMediaViewer(mediaItems, startIndex = 0) {
    if (!mediaItems || !mediaItems.length) return;
    
    // Create media viewer overlay
    this.mediaViewer = document.createElement('div');
    this.mediaViewer.className = 'media-viewer-overlay';
    this.currentMediaIndex = startIndex;
    
    // Create close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'media-viewer-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => this.closeMediaViewer());
    
    // Create media container
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media-viewer-container';
    
    // Add touch and mouse events for dragging
    mediaContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    mediaContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    mediaContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    mediaContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
    
    // Create media content
    const mediaContent = document.createElement('div');
    mediaContent.className = 'media-viewer-content';
    
    // Add media items
    mediaItems.forEach((media, index) => {
      const mediaItem = document.createElement('div');
      mediaItem.className = `media-viewer-item ${index === startIndex ? 'active' : ''}`;
      
      if (media.media_type === 'video') {
        const video = document.createElement('video');
        video.className = 'media-viewer-video';
        video.setAttribute('controls', '');
        video.innerHTML = `<source src="${media.media_url}" type="video/mp4">`;
        mediaItem.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.className = 'media-viewer-image';
        img.src = media.media_url;
        mediaItem.appendChild(img);
      }
      
      mediaContent.appendChild(mediaItem);
    });
    
    // Add navigation arrows if multiple items
    let prevBtn, nextBtn;
    if (mediaItems.length > 1) {
      prevBtn = document.createElement('div');
      prevBtn.className = 'media-viewer-nav media-viewer-prev';
      prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.navigateMedia(-1);
      });
      
      nextBtn = document.createElement('div');
      nextBtn.className = 'media-viewer-nav media-viewer-next';
      nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.navigateMedia(1);
      });
    }
    
    // Add dots indicator if multiple items
    let dotsContainer;
    if (mediaItems.length > 1) {
      dotsContainer = document.createElement('div');
      dotsContainer.className = 'media-viewer-dots';
      
      mediaItems.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = `media-viewer-dot ${index === startIndex ? 'active' : ''}`;
        dot.addEventListener('click', () => this.goToMedia(index));
        dotsContainer.appendChild(dot);
      });
    }
    
    // Assemble the viewer
    mediaContainer.appendChild(mediaContent);
    if (prevBtn) mediaContainer.appendChild(prevBtn);
    if (nextBtn) mediaContainer.appendChild(nextBtn);
    if (dotsContainer) mediaContainer.appendChild(dotsContainer);
    
    this.mediaViewer.appendChild(closeBtn);
    this.mediaViewer.appendChild(mediaContainer);
    
    document.body.appendChild(this.mediaViewer);
    document.body.style.overflow = 'hidden';
    
    // Start playing video if the first item is a video
    if (mediaItems[startIndex]?.media_type === 'video') {
      setTimeout(() => {
        const video = this.mediaViewer.querySelector('.media-viewer-item.active video');
        if (video) {
          video.play().catch(e => console.log('Video play error:', e));
        }
      }, 300);
    }
  }

  closeMediaViewer() {
    if (!this.mediaViewer) return;
    
    // Pause any playing videos
    const videos = this.mediaViewer.querySelectorAll('video');
    videos.forEach(video => video.pause());
    
    this.mediaViewer.classList.add('closing');
    setTimeout(() => {
      this.mediaViewer.remove();
      this.mediaViewer = null;
      document.body.style.overflow = '';
    }, 300);
  }

  navigateMedia(direction) {
    const mediaItems = this.mediaViewer.querySelectorAll('.media-viewer-item');
    if (!mediaItems.length) return;
    
    const newIndex = (this.currentMediaIndex + direction + mediaItems.length) % mediaItems.length;
    this.goToMedia(newIndex);
  }

  goToMedia(index) {
    const mediaItems = this.mediaViewer?.querySelectorAll('.media-viewer-item');
    if (!mediaItems || index < 0 || index >= mediaItems.length) return;
    
    // Pause current video if it's a video
    const currentVideo = mediaItems[this.currentMediaIndex]?.querySelector('video');
    if (currentVideo) currentVideo.pause();
    
    // Update active item
    mediaItems[this.currentMediaIndex]?.classList.remove('active');
    mediaItems[index].classList.add('active');
    this.currentMediaIndex = index;
    
    // Update dots
    const dots = this.mediaViewer?.querySelectorAll('.media-viewer-dot');
    if (dots) {
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }
    
    // Play new video if it's a video
    const newVideo = mediaItems[index]?.querySelector('video');
    if (newVideo) {
      newVideo.currentTime = 0;
      newVideo.play().catch(e => console.log('Video play error:', e));
    }
  }

  // Touch event handlers for swipe and drag to close
  handleTouchStart(e) {
    if (!this.mediaViewer) return;
    this.startY = e.touches[0].clientY;
    this.startX = e.touches[0].clientX;
    this.isDragging = false;
  }

  handleTouchMove(e) {
    if (!this.mediaViewer || !this.startY) return;
    
    const y = e.touches[0].clientY;
    const x = e.touches[0].clientX;
    const dy = y - this.startY;
    const dx = x - this.startX;
    
    // Check if it's a horizontal swipe (for changing media)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      e.preventDefault();
      this.isDragging = true;
      if (dx > 0) {
        this.navigateMedia(-1); // Swipe right
      } else {
        this.navigateMedia(1); // Swipe left
      }
      this.startX = x;
      return;
    }
    
    // Vertical drag to close
    if (Math.abs(dy) > 30) {
      e.preventDefault();
      this.isDragging = true;
      const opacity = 1 - Math.min(Math.abs(dy) / 200, 0.8);
      const scale = 1 - Math.min(Math.abs(dy) / 1000, 0.1);
      
      const mediaContainer = this.mediaViewer.querySelector('.media-viewer-container');
      mediaContainer.style.transform = `translateY(${dy}px) scale(${scale})`;
      mediaContainer.style.opacity = opacity;
    }
  }

  handleTouchEnd(e) {
    if (!this.mediaViewer || !this.isDragging) return;
    
    const mediaContainer = this.mediaViewer.querySelector('.media-viewer-container');
    const y = e.changedTouches[0].clientY;
    const dy = y - this.startY;
    
    if (Math.abs(dy) > 100) {
      this.closeMediaViewer();
    } else {
      mediaContainer.style.transform = '';
      mediaContainer.style.opacity = '';
    }
    
    this.startY = 0;
    this.startX = 0;
    this.isDragging = false;
  }

  // Mouse event handlers for drag to close
  handleMouseDown(e) {
    if (!this.mediaViewer) return;
    this.startY = e.clientY;
    this.startX = e.clientX;
    this.isDragging = false;
    
    const handleMouseMove = (e) => {
      const y = e.clientY;
      const dy = y - this.startY;
      
      if (Math.abs(dy) > 30) {
        this.isDragging = true;
        const opacity = 1 - Math.min(Math.abs(dy) / 200, 0.8);
        const scale = 1 - Math.min(Math.abs(dy) / 1000, 0.1);
        
        const mediaContainer = this.mediaViewer.querySelector('.media-viewer-container');
        mediaContainer.style.transform = `translateY(${dy}px) scale(${scale})`;
        mediaContainer.style.opacity = opacity;
      }
    };
    
    const handleMouseUp = (e) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (!this.isDragging) return;
      
      const y = e.clientY;
      const dy = y - this.startY;
      
      if (Math.abs(dy) > 100) {
        this.closeMediaViewer();
      } else {
        const mediaContainer = this.mediaViewer.querySelector('.media-viewer-container');
        mediaContainer.style.transform = '';
        mediaContainer.style.opacity = '';
      }
      
      this.startY = 0;
      this.startX = 0;
      this.isDragging = false;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  openCommentPage(post) {
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
          <div class="post-more"><i class="fas fa-ellipsis-h"></i></div>
          <div class="post-action views"><i class="fas fa-chart-bar"></i> ${post.views || 0}</div>
        </div>
      </div>
    `;
    
    // Create comments section
    const commentsSection = document.createElement('div');
    commentsSection.className = 'comment-page-comments';
    commentsSection.innerHTML = `
      <div class="comments-list">
        <div class="no-comments">
          <i class="far fa-comment-dots"></i>
          <div>No comments yet</div>
        </div>
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
    commentPage.appendChild(header);
    commentPage.appendChild(postPreview);
    commentPage.appendChild(commentsSection);
    commentPage.appendChild(commentInput);
    
    document.body.appendChild(commentPage);
    document.body.style.overflow = 'hidden';
    
    // Setup event listeners for the comment page
    this.setupCommentPageEventListeners(commentPage, post);
    
    // Focus the input
    setTimeout(() => {
      commentPage.querySelector('.comment-page-input')?.focus();
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
    commentPage.querySelector('.comment-page-send')?.addEventListener('click', () => {
      const input = commentPage.querySelector('.comment-page-input');
      const commentText = input.value.trim();
      if (commentText) {
        // TODO: Send comment to server
        console.log('Posting comment:', commentText);
        input.value = '';
      }
    });

    // Press Enter to send comment
    commentPage.querySelector('.comment-page-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const input = commentPage.querySelector('.comment-page-input');
        const commentText = input.value.trim();
        if (commentText) {
          // TODO: Send comment to server
          console.log('Posting comment:', commentText);
          input.value = '';
        }
      }
    });
  }

  renderMediaForCommentPage(mediaItems) {
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

  showMoreOptions(e, post) {
    const isOwner = true; // Replace with actual owner check
    
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
      console.log('Edit post', post.id);
      popup.remove();
    });
    
    popup.querySelector('.delete-option')?.addEventListener('click', () => {
      console.log('Delete post', post.id);
      popup.remove();
    });
    
    popup.querySelector('.report-option')?.addEventListener('click', () => {
      console.log('Report post', post.id);
      popup.remove();
    });
  }

  sharePost(postId) {
    const postUrl = `${window.location.origin}/post.html?id=${postId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post',
        url: postUrl
      }).catch(err => {
        console.log('Error sharing:', err);
        this.copyToClipboard(postUrl);
      });
    } else {
      this.copyToClipboard(postUrl);
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    });
  }

  setupPullToRefresh() {
    let startY = 0;
    let touchStart = false;
    const refreshContainer = document.createElement('div');
    refreshContainer.className = 'refresh-container';
    refreshContainer.innerHTML = '<div class="refresh-loader"><i class="fas fa-sync-alt"></i></div>';
    this.parentNode.insertBefore(refreshContainer, this);

    this.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0 && !this.isRefreshing) {
        startY = e.touches[0].pageY;
        touchStart = true;
      }
    }, { passive: true });

    this.addEventListener('touchmove', (e) => {
      if (!touchStart || this.isRefreshing) return;
      
      const y = e.touches[0].pageY;
      const dy = y - startY;
      
      if (dy > 0) {
        e.preventDefault();
        const pullDistance = Math.min(dy, 150);
        const progress = Math.min(pullDistance / 150, 1);
        refreshContainer.style.opacity = progress;
        refreshContainer.style.transform = `translateY(${pullDistance}px)`;
        refreshContainer.querySelector('.refresh-loader').style.transform = `rotate(${progress * 360}deg)`;
      }
    }, { passive: false });

    this.addEventListener('touchend', (e) => {
      if (!touchStart || this.isRefreshing) return;
      
      const y = e.changedTouches[0].pageY;
      const dy = y - startY;
      
      if (dy > 100) {
        this.isRefreshing = true;
        refreshContainer.classList.add('refreshing');
        
        // Simulate refresh
        setTimeout(() => {
          refreshContainer.style.transform = 'translateY(0)';
          refreshContainer.classList.remove('refreshing');
          this.isRefreshing = false;
          
          // TODO: Actually refresh content
          console.log('Refreshing content...');
        }, 1000);
      } else {
        refreshContainer.style.transform = 'translateY(0)';
        refreshContainer.style.opacity = '0';
      }
      
      touchStart = false;
    });
  }
}

customElements.define('post-component', PostComponent);

