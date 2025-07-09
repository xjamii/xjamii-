class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.mediaViewer = null;
    this.currentMediaIndex = 0;
    this.startY = 0;
    this.startX = 0;
    this.isRefreshing = false;
    this.isLoading = false;
    this.observer = null;
    this.postsPerBatch = 6;
    this.visiblePosts = new Set();
    this.intersectionObserver = null;
  }

  connectedCallback() {
    this.renderLoader();
    setTimeout(() => this.render(), 300);
    this.setupIntersectionObserver();
  }

  static get observedAttributes() {
    return ['post-data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'post-data' && oldValue !== newValue) {
      this.render();
    }
  }

  disconnectedCallback() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.handlePostVisible(entry.target);
        }
      });
    }, {
      rootMargin: '200px 0px',
      threshold: 0.1
    });
  }

  handlePostVisible(postElement) {
    const postId = postElement.dataset.postId;
    if (!this.visiblePosts.has(postId)) {
      this.visiblePosts.add(postId);
      postElement.classList.add('visible');
      this.loadPostMedia(postElement);
    }
  }

  loadPostMedia(postElement) {
    const mediaElements = postElement.querySelectorAll('img[data-src], video[data-src]');
    mediaElements.forEach(media => {
      if (media.dataset.src) {
        media.src = media.dataset.src;
        media.onload = () => media.classList.add('loaded');
        media.removeAttribute('data-src');
        
        if (media.tagName === 'VIDEO') {
          media.load();
        }
      }
    });
  }

  renderLoader() {
    this.innerHTML = `
      <div class="post-loading">
        <div class="loader"></div>
      </div>
    `;
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
    
    content = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    content = content.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="url" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return content;
  }

  render() {
    try {
      const postData = this.getAttribute('post-data');
      if (!postData) {
        this.renderLoader();
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

      const avatarHtml = profile.avatar_url 
        ? `<img data-src="${profile.avatar_url}" class="post-avatar" alt="${profile.full_name || profile.username}" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'20\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
        : `<div class="post-avatar initials" aria-label="${profile.full_name || profile.username}">${this.getInitials(profile.full_name)}</div>`;

      const content = post.content || '';
      const showSeeMore = content.length > 200;
      const displayedContent = showSeeMore ? content.substring(0, 200) + '...' : content;

      this.innerHTML = `
        <div class="post-container" data-post-id="${post.id}">
          <div class="post">
            <div class="post-header">
              <a href="/profile.html?user_id=${profile.user_id}" class="post-avatar-link" style="text-decoration: none" aria-label="${profile.full_name || profile.username}'s profile">
                ${avatarHtml}
              </a>
              <div class="post-user-info">
                <a href="/profile.html?user_id=${profile.user_id}" class="post-user-link" style="text-decoration: none">
                  <div class="post-user">
                    ${profile.full_name || profile.username}
                    ${profile.is_verified ? '<i class="fas fa-check-circle verified-badge" aria-label="Verified"></i>' : ''}
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
              <button class="post-action comment-action" aria-label="Comment"><i class="far fa-comment"></i> ${post.comment_count || 0}</button>
              <button class="post-action like-action ${post.is_liked ? 'liked' : ''}" aria-label="${post.is_liked ? 'Unlike' : 'Like'}">
                <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i> ${post.like_count || 0}
              </button>
              <button class="post-action share-action" aria-label="Share"><i class="fas fa-arrow-up-from-bracket"></i></button>
              <button class="post-more" aria-label="More options"><i class="fas fa-ellipsis-h"></i></button>
              <div class="post-action views"><i class="fas fa-chart-bar"></i> ${post.views || 0}</div>
            </div>
          </div>
        </div>
      `;

      this.setupEventListeners(post);
      this.intersectionObserver.observe(this.querySelector('.post-container'));

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
              <video class="post-media" preload="none" data-src="${media.media_url}" aria-label="Video content">
                <source data-src="${media.media_url}" type="video/mp4">
              </video>
              <div class="video-play-button"><i class="fas fa-play"></i></div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="media-container">
            <img data-src="${media.media_url}" class="post-media" data-media-index="0" alt="Post image" loading="lazy">
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
                  <video class="grid-media" preload="none" data-src="${media.media_url}" aria-label="Video content">
                    <source data-src="${media.media_url}" type="video/mp4">
                  </video>
                  <div class="video-play-button"><i class="fas fa-play"></i></div>
                </div>`
              : `<img data-src="${media.media_url}" class="grid-media" data-media-index="${index}" alt="Post image" loading="lazy">`}
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
    this.querySelector('.like-action')?.addEventListener('click', (e) => {
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

    this.querySelector('.post-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showMoreOptions(e, post);
    });

    this.querySelector('.share-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sharePost(post.id);
    });

    this.querySelector('.comment-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCommentPage(post);
    });

    this.querySelectorAll('.mention').forEach(mention => {
      mention.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = e.target.textContent.substring(1);
        window.location.href = `/profile.html?username=${username}`;
      });
    });

    this.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
      media.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaIndex = parseInt(media.getAttribute('data-media-index') || media.parentElement.getAttribute('data-media-index') || 0);
        this.showMediaViewer(post.media, mediaIndex);
      });
    });

    this.querySelector('.see-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCommentPage(post);
    });

    this.querySelector('.post-content')?.addEventListener('click', (e) => {
      if (!e.target.classList.contains('mention') && !e.target.classList.contains('hashtag') && !e.target.classList.contains('url')) {
        this.openCommentPage(post);
      }
    });
  }

  showMediaViewer(mediaItems, startIndex = 0) {
    if (!mediaItems || !mediaItems.length) return;
    
    this.mediaViewer = document.createElement('div');
    this.mediaViewer.className = 'media-viewer-overlay';
    this.currentMediaIndex = startIndex;
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'media-viewer-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.addEventListener('click', () => this.closeMediaViewer());
    
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media-viewer-container';
    
    mediaContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    mediaContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    mediaContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
    mediaContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
    
    const mediaContent = document.createElement('div');
    mediaContent.className = 'media-viewer-content';
    
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
    
    mediaContainer.appendChild(mediaContent);
    if (prevBtn) mediaContainer.appendChild(prevBtn);
    if (nextBtn) mediaContainer.appendChild(nextBtn);
    if (dotsContainer) mediaContainer.appendChild(dotsContainer);
    
    this.mediaViewer.appendChild(closeBtn);
    this.mediaViewer.appendChild(mediaContainer);
    
    document.body.appendChild(this.mediaViewer);
    document.body.style.overflow = 'hidden';
    
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
    
    const currentVideo = mediaItems[this.currentMediaIndex]?.querySelector('video');
    if (currentVideo) currentVideo.pause();
    
    mediaItems[this.currentMediaIndex]?.classList.remove('active');
    mediaItems[index].classList.add('active');
    this.currentMediaIndex = index;
    
    const dots = this.mediaViewer?.querySelectorAll('.media-viewer-dot');
    if (dots) {
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }
    
    const newVideo = mediaItems[index]?.querySelector('video');
    if (newVideo) {
      newVideo.currentTime = 0;
      newVideo.play().catch(e => console.log('Video play error:', e));
    }
  }

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
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      e.preventDefault();
      this.isDragging = true;
      if (dx > 0) {
        this.navigateMedia(-1);
      } else {
        this.navigateMedia(1);
      }
      this.startX = x;
      return;
    }
    
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
    const commentPage = document.createElement('div');
    commentPage.className = 'comment-page-overlay';
    
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
    
    const postPreview = document.createElement('div');
    postPreview.className = 'comment-page-post-preview';
    
    const profile = post.profile || {
      username: 'unknown',
      full_name: 'Unknown User',
      avatar_url: '',
      is_verified: false,
      user_id: ''
    };
    
    const avatarHtml = profile.avatar_url 
      ? `<img src="${profile.avatar_url}" class="post-avatar" alt="${profile.full_name || profile.username}" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'20\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
      : `<div class="post-avatar initials" aria-label="${profile.full_name || profile.username}">${this.getInitials(profile.full_name)}</div>`;
    
    postPreview.innerHTML = `
      <div class="comment-page-post">
        <div class="post-header">
          <a href="/profile.html?user_id=${profile.user_id}" class="post-avatar-link" style="text-decoration: none" aria-label="${profile.full_name || profile.username}'s profile">
            ${avatarHtml}
          </a>
          <div class="post-user-info">
            <a href="/profile.html?user_id=${profile.user_id}" class="post-user-link" style="text-decoration: none">
              <div class="post-user">
                ${profile.full_name || profile.username}
                ${profile.is_verified ? '<i class="fas fa-check-circle verified-badge" aria-label="Verified"></i>' : ''}
              </div>
              <div class="post-username" style="text-decoration: none">@${profile.username}</div>
            </a>
          </div>
          <span class="post-time">${this.formatTime(post.created_at)}</span>
        </div>
        ${post.content ? `<p class="post-content">${this.processContent(post.content)}</p>` : ''}
        ${this.renderMediaForCommentPage(post.media || [])}
        <div class="post-actions">
          <button class="post-action like-action ${post.is_liked ? 'liked' : ''}" aria-label="${post.is_liked ? 'Unlike' : 'Like'}">
            <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i> ${post.like_count || 0}
          </button>
          <button class="post-action comment-action" aria-label="Comment"><i class="far fa-comment"></i> ${post.comment_count || 0}</button>
          <button class="post-action share-action" aria-label="Share"><i class="fas fa-arrow-up-from-bracket"></i></button>
          <button class="post-more" aria-label="More options"><i class="fas fa-ellipsis-h"></i></button>
          <div class="post-action views"><i class="fas fa-chart-bar"></i> ${post.views || 0}</div>
        </div>
      </div>
    `;
    
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
    
    const commentInput = document.createElement('div');
    commentInput.className = 'comment-page-input-container';
    commentInput.innerHTML = `
      <input type="text" class="comment-page-input" placeholder="Write a comment...">
      <button class="comment-page-send" aria-label="Send comment"><i class="fas fa-paper-plane"></i></button>
    `;
    
    commentPage.appendChild(header);
    commentPage.appendChild(postPreview);
    commentPage.appendChild(commentsSection);
    commentPage.appendChild(commentInput);
    
    document.body.appendChild(commentPage);
    document.body.style.overflow = 'hidden';
    
    this.setupCommentPageEventListeners(commentPage, post);
    
    setTimeout(() => {
      commentPage.querySelector('.comment-page-input')?.focus();
    }, 300);
  }

  setupCommentPageEventListeners(commentPage, post) {
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

    commentPage.querySelector('.post-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showMoreOptions(e, post);
    });

    commentPage.querySelector('.share-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sharePost(post.id);
    });

    commentPage.querySelector('.comment-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      commentPage.querySelector('.comment-page-input')?.focus();
    });

    commentPage.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
      media.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaIndex = parseInt(media.getAttribute('data-media-index') || media.parentElement.getAttribute('data-media-index') || 0);
        this.showMediaViewer(post.media, mediaIndex);
      });
    });

    commentPage.querySelector('.comment-page-send')?.addEventListener('click', () => {
      const input = commentPage.querySelector('.comment-page-input');
      const commentText = input.value.trim();
      if (commentText) {
        console.log('Posting comment:', commentText);
        input.value = '';
      }
    });

    commentPage.querySelector('.comment-page-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const input = commentPage.querySelector('.comment-page-input');
        const commentText = input.value.trim();
        if (commentText) {
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
              <video class="post-media" preload="metadata" src="${media.media_url}" aria-label="Video content">
                <source src="${media.media_url}" type="video/mp4">
              </video>
              <div class="video-play-button"><i class="fas fa-play"></i></div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="media-container">
            <img src="${media.media_url}" class="post-media" data-media-index="0" alt="Post image" loading="lazy">
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
                  <video class="grid-media" preload="metadata" src="${media.media_url}" aria-label="Video content">
                    <source src="${media.media_url}" type="video/mp4">
                  </video>
                  <div class="video-play-button"><i class="fas fa-play"></i></div>
                </div>`
              : `<img src="${media.media_url}" class="grid-media" data-media-index="${index}" alt="Post image" loading="lazy">`}
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
    const isOwner = true;
    
    document.querySelectorAll('.more-options-popup').forEach(el => el.remove());
    
    const popup = document.createElement('div');
    popup.className = 'more-options-popup';
    popup.innerHTML = `
      <div class="more-options-content">
        ${isOwner ? `
          <button class="more-option edit-option" aria-label="Edit post"><i class="fas fa-edit"></i> Edit</button>
          <button class="more-option delete-option" aria-label="Delete post"><i class="fas fa-trash-alt"></i> Delete</button>
        ` : `
          <button class="more-option report-option" aria-label="Report post"><i class="fas fa-flag"></i> Report</button>
        `}
      </div>
    `;
    
    document.body.appendChild(popup);
    
    const rect = e.target.getBoundingClientRect();
    popup.style.left = `${rect.left - 100}px`;
    popup.style.top = `${rect.top - 10}px`;
    
    const clickHandler = (event) => {
      if (!popup.contains(event.target)) {
        popup.remove();
        document.removeEventListener('click', clickHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', clickHandler);
    }, 0);
    
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
}

customElements.define('post-component', PostComponent);

class PostFeed {
  constructor() {
    this.postsContainer = document.querySelector('#posts-container');
    this.posts = [];
    this.currentIndex = 0;
    this.batchSize = 6;
    this.isLoading = false;
    this.isRefreshing = false;
    this.setupPullToRefresh();
    this.setupInfiniteScroll();
    this.loadInitialPosts();
  }

  async loadInitialPosts() {
    this.showLoader();
    
    try {
      // Simulate API call
      this.posts = await this.fetchPosts();
      this.hideLoader();
      this.loadNextBatch();
    } catch (error) {
      console.error('Error loading posts:', error);
      this.hideLoader();
      this.showError();
    }
  }

  async fetchPosts() {
    // Simulate API call delay
    return new Promise(resolve => {
      setTimeout(() => {
        // Generate mock posts
        const mockPosts = Array.from({ length: 30 }, (_, i) => ({
          id: `post-${i}`,
          content: `This is post content ${i + 1}. ${i % 3 === 0 ? 'With some extra text to make it longer. '.repeat(5) : ''}`,
          created_at: new Date(Date.now() - i * 3600000).toISOString(),
          comment_count: Math.floor(Math.random() * 100),
          like_count: Math.floor(Math.random() * 500),
          views: Math.floor(Math.random() * 1000),
          is_liked: Math.random() > 0.7,
          media: this.generateMockMedia(i),
          profile: {
            user_id: `user-${i}`,
            username: `user${i}`,
            full_name: `User ${i}`,
            avatar_url: i % 2 === 0 ? `https://picsum.photos/200/200?random=${i}` : '',
            is_verified: i % 5 === 0
          }
        }));
        resolve(mockPosts);
      }, 800);
    });
  }

  generateMockMedia(index) {
    const mediaTypes = ['image', 'video'];
    const count = index % 5;
    if (count === 0) return [];
    
    return Array.from({ length: count }, (_, i) => ({
      media_type: mediaTypes[i % 2],
      media_url: i % 2 === 0 
        ? `https://picsum.photos/800/600?random=${index}${i}`
        : `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`
    }));
  }

  showLoader() {
    this.postsContainer.innerHTML = '<div class="posts-loading"><div class="loader"></div></div>';
  }

  hideLoader() {
    const loader = this.postsContainer.querySelector('.posts-loading');
    if (loader) loader.remove();
  }

  showError() {
    this.postsContainer.innerHTML = '<div class="posts-error">Error loading posts. <button id="retry-button">Try again</button></div>';
    document.getElementById('retry-button')?.addEventListener('click', () => this.loadInitialPosts());
  }

  loadNextBatch() {
    if (this.isLoading || this.currentIndex >= this.posts.length) return;
    
    this.isLoading = true;
    const batch = this.posts.slice(this.currentIndex, this.currentIndex + this.batchSize);
    this.currentIndex += this.batchSize;

    const batchLoader = document.createElement('div');
    batchLoader.className = 'batch-loading';
    batchLoader.innerHTML = '<div class="loader small"></div>';
    this.postsContainer.appendChild(batchLoader);

    let loadedCount = 0;
    batch.forEach((post, index) => {
      setTimeout(() => {
        const postElement = document.createElement('post-component');
        postElement.setAttribute('post-data', JSON.stringify(post));
        this.postsContainer.insertBefore(postElement, batchLoader);
        loadedCount++;
        
        if (loadedCount === batch.length) {
          batchLoader.remove();
          this.isLoading = false;
        }
      }, index * 200);
    });
  }

  refreshPosts() {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    this.currentIndex = 0;
    
    const refreshLoader = document.createElement('div');
    refreshLoader.className = 'refresh-loading';
    refreshLoader.innerHTML = '<div class="loader"></div>';
    this.postsContainer.insertBefore(refreshLoader, this.postsContainer.firstChild);

    setTimeout(() => {
      document.querySelectorAll('post-component').forEach(post => post.remove());
      this.posts = [];
      this.loadInitialPosts();
      refreshLoader.remove();
      this.isRefreshing = false;
    }, 1000);
  }

  setupPullToRefresh() {
    let startY = 0;
    let touchStart = false;
    const refreshContainer = document.createElement('div');
    refreshContainer.className = 'refresh-container';
    refreshContainer.innerHTML = '<div class="refresh-loader"><i class="fas fa-sync-alt"></i></div>';
    document.body.insertBefore(refreshContainer, this.postsContainer);

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0 && !this.isRefreshing) {
        startY = e.touches[0].pageY;
        touchStart = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
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

    document.addEventListener('touchend', (e) => {
      if (!touchStart || this.isRefreshing) return;
      
      const y = e.changedTouches[0].pageY;
      const dy = y - startY;
      
      if (dy > 100) {
        this.refreshPosts();
        refreshContainer.classList.add('refreshing');
        
        setTimeout(() => {
          refreshContainer.style.transform = 'translateY(0)';
          refreshContainer.classList.remove('refreshing');
        }, 1000);
      } else {
        refreshContainer.style.transform = 'translateY(0)';
        refreshContainer.style.opacity = '0';
      }
      
      touchStart = false;
    });
  }

  setupInfiniteScroll() {
    const scrollHandler = () => {
      if (this.isLoading) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.body.offsetHeight;
      const threshold = 500;

      if (scrollPosition > documentHeight - threshold) {
        this.loadNextBatch();
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PostFeed();
});
