class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.mediaViewer = new MediaViewer(this);
    this.commentPage = new CommentPage(this);
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
        const { error } = await supabase
          .rpc('increment_views', { post_id: post.id });
        
        if (!error) {
          this.viewCounted = true;
          console.log("✅ View counted for post:", post.id);
          this.updateViewCounter(post);
        }
      }
    } catch (err) {
      console.error("View recording failed:", err);
    }
  }

  updateViewCounter(post) {
    const viewsEl = this.querySelector('.views');
    if (!viewsEl) return;

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

  async render() {
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

      this.innerHTML = `
        <div class="post-container">
          <div class="post">
            <div class="post-header">
              <a href="/profile.html?user_id=${profile.user_id}" class="post-avatar-link" style="text-decoration: none">
                ${PostUtils.createAvatarHtml(profile)}
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
              <span class="post-time">${PostUtils.formatTime(post.created_at)}</span>
            </div>
            ${post.content ? `
              <p class="post-content" data-full-content="${post.content.replace(/"/g, '&quot;')}">
                ${PostUtils.processContent(post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content)}
                ${post.content.length > 200 ? '<span class="see-more">See more</span>' : ''}
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
    this.querySelector('.like-action')?.addEventListener('click', async (e) => {
      await this.handleLikeClick(e, post);
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
      this.commentPage.show(post);
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
        this.mediaViewer.show(post.media, mediaIndex);
      });
    });

    this.querySelector('.see-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.commentPage.show(post);
    });

    this.querySelector('.post-content')?.addEventListener('click', (e) => {
      if (!e.target.classList.contains('mention') && !e.target.classList.contains('hashtag') && !e.target.classList.contains('url')) {
        this.commentPage.show(post);
      }
    });

    if (this.previousElementSibling === null) {
      this.setupPullToRefresh();
    }
  }

  async toggleLike(postId, isCurrentlyLiked) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return { success: false, error: 'Not authenticated' };
      }
      
      const currentUserId = user.id;

      if (!isCurrentlyLiked) {
        const { data, error } = await supabase
          .from('likes')
          .insert([{ 
            post_id: postId, 
            profile_id: currentUserId 
          }])
          .select();
        
        if (error) throw error;
        
        await supabase.rpc('increment_like_count', { post_id: postId });
        return { success: true, newLikeState: true };
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('profile_id', currentUserId);
        
        if (error) throw error;
        
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

  showMoreOptions(e, post) {
    const isOwner = true; // Replace with actual owner check
    
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
        
        setTimeout(() => {
          refreshContainer.style.transform = 'translateY(0)';
          refreshContainer.classList.remove('refreshing');
          this.isRefreshing = false;
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
