class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.mediaViewer = null;
    this.currentMediaIndex = 0;
    this.startY = 0;
    this.startX = 0;
    this.isRefreshing = false;
    this.isLoadingMore = false;
    this.viewCounted = false;
    this.observer = new IntersectionObserver(this.handleIntersect.bind(this), {
      threshold: 0.5,
      rootMargin: '0px 0px -100px 0px'
    });
  }

  connectedCallback() {
    this.render();
    this.observer.observe(this);
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.unobserve(this);
    }
  }

  static get observedAttributes() {
    return ['post-data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'post-data' && oldValue !== newValue) {
      this.render();
    }
  }

  handleIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting && !this.viewCounted) {
        this.recordView();
      }
    });
  }

  async recordView() {
    const postData = this.getAttribute('post-data');
    if (!postData) return;
    
    try {
      const post = JSON.parse(postData);
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      if (!this.isConnected || !this.viewCounted) {
        const { error } = await supabase.rpc('increment_views', { post_id: post.id });
        
        if (!error) {
          this.viewCounted = true;
          this.updateViewCountUI(post);
        }
      }
    } catch (err) {
      console.error("View recording failed:", err);
    }
  }

  updateViewCountUI(post) {
    const viewsEl = this.querySelector('.views');
    if (viewsEl) {
      const icon = viewsEl.querySelector('i');
      const countSpan = viewsEl.querySelector('span') || document.createElement('span');
      const currentViews = parseInt(countSpan.textContent || viewsEl.textContent) || 0;
      
      const container = document.createElement('div');
      container.className = 'view-counter-animation';
      container.style.cssText = `
        display: inline-flex;
        flex-direction: column;
        overflow: hidden;
        height: 20px;
        vertical-align: middle;
      `;
      
      const oldNumber = document.createElement('div');
      oldNumber.textContent = currentViews;
      
      const newNumber = document.createElement('div');
      newNumber.textContent = currentViews + 1;
      
      container.appendChild(oldNumber);
      container.appendChild(newNumber);
      
      viewsEl.innerHTML = '';
      viewsEl.appendChild(icon);
      viewsEl.appendChild(container);
      
      setTimeout(() => {
        container.style.transform = `translateY(-20px)`;
        container.style.transition = `transform 0.3s ease-out`;
      }, 50);
      
      setTimeout(() => {
        if (viewsEl.isConnected) {
          viewsEl.innerHTML = `
            <i class="fas fa-chart-bar"></i>
            <span>${currentViews + 1}</span>
          `;
        }
      }, 800);
    }
  }

  render() {
    try {
      const postData = this.getAttribute('post-data');
      if (!postData) {
        this.innerHTML = `<div class="post-loading"><div class="loader"></div></div>`;
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
        ? `<img src="${profile.avatar_url}" class="post-avatar" onerror="this.onAvatarError(this, '${this.getInitials(profile.full_name)}')">`
        : `<div class="post-avatar initials">${this.getInitials(profile.full_name)}</div>`;

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
      if (this.previousElementSibling === null) {
        this.setupPullToRefresh();
      }
    } catch (error) {
      console.error("Error rendering post:", error);
      this.innerHTML = `<div class="post-error">Error loading post</div>`;
    }
  }

  onAvatarError(img, initials) {
    img.src = `data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'><rect width='50' height='50' fill='%230056b3'/><text x='50%' y='50%' font-size='20' fill='white' text-anchor='middle' dy='.3em'>${initials}</text></svg>`;
  }

  setupEventListeners(post) {
    // Like action
    this.querySelector('.like-action')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await this.toggleLike(post);
      if (!result.success) {
        this.revertLikeUI(e.currentTarget, post.is_liked);
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

    // Comment action
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

    // Post content click handler
    this.querySelector('.post-content')?.addEventListener('click', (e) => {
      if (!e.target.classList.contains('mention') && !e.target.classList.contains('hashtag') && !e.target.classList.contains('url')) {
        this.openCommentPage(post);
      }
    });
  }

  revertLikeUI(likeBtn, wasLiked) {
    likeBtn.classList.toggle('liked', wasLiked);
    const icon = likeBtn.querySelector('i');
    icon.className = wasLiked ? 'fas fa-heart' : 'far fa-heart';
    const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
    if (countEl) {
      let count = parseInt(countEl.textContent) || 0;
      countEl.textContent = wasLiked ? count + 1 : count - 1;
    }
  }
}

// Import functionality from other files
Object.assign(PostComponent.prototype, {
  // From post-media-viewer.js
  showMediaViewer: PostMediaViewer.showMediaViewer,
  closeMediaViewer: PostMediaViewer.closeMediaViewer,
  navigateMedia: PostMediaViewer.navigateMedia,
  goToMedia: PostMediaViewer.goToMedia,
  handleTouchStart: PostMediaViewer.handleTouchStart,
  handleTouchMove: PostMediaViewer.handleTouchMove,
  handleTouchEnd: PostMediaViewer.handleTouchEnd,
  handleMouseDown: PostMediaViewer.handleMouseDown,

  // From post-comments.js
  openCommentPage: PostComments.openCommentPage,
  setupCommentPageEventListeners: PostComments.setupCommentPageEventListeners,
  renderMediaForCommentPage: PostComments.renderMediaForCommentPage,

  // From post-actions.js
  toggleLike: PostActions.toggleLike,
  showMoreOptions: PostActions.showMoreOptions,
  sharePost: PostActions.sharePost,
  copyToClipboard: PostActions.copyToClipboard,

  // From post-utils.js
  formatTime: PostUtils.formatTime,
  getInitials: PostUtils.getInitials,
  processContent: PostUtils.processContent,
  renderMedia: PostUtils.renderMedia,
  setupPullToRefresh: PostUtils.setupPullToRefresh
});

customElements.define('post-component', PostComponent);
