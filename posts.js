class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.currentMediaIndex = 0;
    this.isRefreshing = false;
    this.isLoadingMore = false;
    this.viewCounted = false;
    this.isExpanded = false;
    this.observer = new IntersectionObserver(this.handleIntersect.bind(this), {
      threshold: 0.5,
      rootMargin: '0px 0px -100px 0px'
    });
  }

  async handleIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting && !this.viewCounted) {
        this.recordView();
      }
    });
  }

  formatViews(count) {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count;
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
            oldNumber.textContent = this.formatViews(currentViews);
            
            const newNumber = document.createElement('div');
            newNumber.textContent = this.formatViews(currentViews + 1);
            
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
                  <i class="fas fa-eye"></i>
                  <span>${this.formatViews(currentViews + 1)}</span>
                `;
              }
            }, 800);
          }
        }
      }
    } catch (err) {
      console.error("View recording failed:", err);
    }
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
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="url" target="_blank">$1</a>');
    return content;
  }

  async render() {
    try {
      const postData = this.getAttribute('post-data');
      if (!postData) {
        this.innerHTML = `<div class="post-loading"><div class="loader"></div></div>`;
        return;
      }

      const post = JSON.parse(postData);
      const { data: { user } } = await supabase.auth.getUser();
      const isOwner = user && user.id === post.user_id;
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

      const content = post.content || '';
      const showSeeMore = content.length > 200 && !this.isExpanded;
      const displayedContent = showSeeMore ? content.substring(0, 200) + '...' : content;

      this.innerHTML = `
        <div class="post-container">
          <div class="post">
            <div class="post-header">
              <a href="/profile.html?user_id=${profile.user_id}" class="post-avatar-link">
                ${avatarHtml}
              </a>
              <div class="post-user-info">
                <a href="/profile.html?user_id=${profile.user_id}" class="post-user-link">
                  <div class="post-user">
                    ${profile.full_name || profile.username}
                    ${profile.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                  </div>
                  <div class="post-username">@${profile.username}</div>
                </a>
              </div>
              <span class="post-time">${this.formatTime(post.created_at)}</span>
              ${isOwner ? `<div class="post-more"><i class="fas fa-ellipsis-h"></i></div>` : ''}
            </div>
            ${content ? `
              <p class="post-content">
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
              <div class="post-action views"><i class="fas fa-eye"></i> ${this.formatViews(post.views || 0)}</div>
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
      
      likeBtn.classList.toggle('liked');
      const icon = likeBtn.querySelector('i');
      icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
      
      const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
      if (countEl) {
        let count = parseInt(countEl.textContent) || 0;
        countEl.textContent = isLiked ? count - 1 : count + 1;
      }
      
      try {
        const { success, error } = await this.toggleLike(post.id, isLiked);
        if (!success) throw new Error(error || 'Failed to update like');
        post.is_liked = !isLiked;
        post.like_count = parseInt(countEl.textContent);
      } catch (error) {
        likeBtn.classList.toggle('liked');
        icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
        if (countEl) {
          let count = parseInt(countEl.textContent) || 0;
          countEl.textContent = isLiked ? count + 1 : count - 1;
        }
        console.error('Like update failed:', error);
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

    // See more/less functionality
    this.querySelector('.see-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isExpanded = true;
      this.render();
    });

    this.querySelector('.post-content')?.addEventListener('click', (e) => {
      if (!e.target.classList.contains('mention') && !e.target.classList.contains('hashtag') && 
          !e.target.classList.contains('url') && !e.target.classList.contains('see-more')) {
        if (this.isExpanded) {
          this.isExpanded = false;
          this.render();
        }
      }
    });

    // Media click handlers - now using the standalone media viewer
    this.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
      media.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaIndex = parseInt(media.getAttribute('data-media-index') || 
                           media.parentElement.getAttribute('data-media-index') || 0;
        this.showMediaViewer(post.media, mediaIndex);
      });
    });

    if (this.previousElementSibling === null) {
      this.setupPullToRefresh();
    }
  }

  showMediaViewer(mediaItems, startIndex = 0) {
    if (!mediaItems || !mediaItems.length) return;
    
    const mediaViewer = document.createElement('post-media-viewer');
    mediaViewer.show(mediaItems, startIndex);
    document.body.appendChild(mediaViewer);
  }

  async toggleLike(postId, isLiked) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert('Please sign in to like posts');
        return { success: false, error: 'Not authenticated' };
      }

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('profile_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, profile_id: user.id });
        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, error: error.message };
    }
  }

  async showMoreOptions(e, post) {
    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user && user.id === post.user_id;
    
    if (!isOwner) return;

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
      this.editPost(post);
      popup.remove();
    });
    
    popup.querySelector('.delete-option')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this post?')) {
        this.deletePost(post.id);
      }
      popup.remove();
    });
  }

  async deletePost(postId) {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      this.remove();
      window.dispatchEvent(new CustomEvent('post-deleted', { detail: { postId } }));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  }

  editPost(post) {
    const contentEl = this.querySelector('.post-content');
    const originalContent = post.content;
    
    contentEl.innerHTML = `
      <textarea class="edit-post-textarea">${originalContent}</textarea>
      <div class="edit-post-actions">
        <button class="edit-post-cancel">Cancel</button>
        <button class="edit-post-save">Save</button>
      </div>
    `;
    
    const textarea = contentEl.querySelector('textarea');
    textarea.focus();
    textarea.selectionStart = textarea.value.length;
    
    contentEl.querySelector('.edit-post-cancel').addEventListener('click', () => {
      this.render();
    });
    
    contentEl.querySelector('.edit-post-save').addEventListener('click', async () => {
      const newContent = textarea.value.trim();
      if (!newContent) return;
      
      try {
        const { error } = await supabase
          .from('posts')
          .update({ content: newContent })
          .eq('id', post.id);
        
        if (error) throw error;
        
        post.content = newContent;
        this.setAttribute('post-data', JSON.stringify(post));
        this.render();
      } catch (error) {
        console.error('Error updating post:', error);
        alert('Failed to update post');
      }
    });
  }

  openCommentPage(post) {
    window.openCommentPage(post.id);
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
