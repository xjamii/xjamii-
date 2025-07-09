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
    setTimeout(() => this.render(), 300); // Simulate initial load delay
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
      this.loadPostMedia(postElement);
    }
  }

  loadPostMedia(postElement) {
    const mediaElements = postElement.querySelectorAll('img[data-src], video[data-src]');
    mediaElements.forEach(media => {
      if (media.dataset.src) {
        media.src = media.dataset.src;
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
    
    // Process mentions (@username)
    content = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    // Process hashtags (#tag)
    content = content.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
    
    // Process URLs
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

      // Create avatar HTML with lazy loading
      const avatarHtml = profile.avatar_url 
        ? `<img data-src="${profile.avatar_url}" class="post-avatar" alt="${profile.full_name || profile.username}" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'20\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
        : `<div class="post-avatar initials" aria-label="${profile.full_name || profile.username}">${this.getInitials(profile.full_name)}</div>`;

      // Check if content needs "See more"
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

  // ... (keep all other methods the same as previous version, including setupEventListeners, showMediaViewer, etc.)

  // Add this new method for infinite scrolling
  setupInfiniteScroll() {
    const scrollHandler = () => {
      if (this.isLoading) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.body.offsetHeight;
      const threshold = 500;

      if (scrollPosition > documentHeight - threshold) {
        this.loadMorePosts();
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
  }

  loadMorePosts() {
    if (this.isLoading) return;

    this.isLoading = true;
    const loader = document.createElement('div');
    loader.className = 'posts-loading';
    loader.innerHTML = '<div class="loader"></div>';
    document.querySelector('#posts-container').appendChild(loader);

    // Simulate API call delay
    setTimeout(() => {
      // TODO: Replace with actual API call to load more posts
      console.log('Loading more posts...');
      loader.remove();
      this.isLoading = false;
    }, 1000);
  }
}

customElements.define('post-component', PostComponent);

// Add this to your main app JS to handle the feed
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

  loadInitialPosts() {
    this.showLoader();
    
    // Simulate API call
    setTimeout(() => {
      this.hideLoader();
      this.loadNextBatch();
    }, 800);
  }

  showLoader() {
    this.postsContainer.innerHTML = '<div class="posts-loading"><div class="loader"></div></div>';
  }

  hideLoader() {
    const loader = this.postsContainer.querySelector('.posts-loading');
    if (loader) loader.remove();
  }

  loadNextBatch() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    const batch = this.posts.slice(this.currentIndex, this.currentIndex + this.batchSize);
    this.currentIndex += this.batchSize;

    if (batch.length === 0) {
      this.isLoading = false;
      return;
    }

    // Show batch loader
    const batchLoader = document.createElement('div');
    batchLoader.className = 'batch-loading';
    batchLoader.innerHTML = '<div class="loader small"></div>';
    this.postsContainer.appendChild(batchLoader);

    // Simulate progressive loading
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
    
    // Show refresh loader
    const refreshLoader = document.createElement('div');
    refreshLoader.className = 'refresh-loading';
    refreshLoader.innerHTML = '<div class="loader"></div>';
    this.postsContainer.insertBefore(refreshLoader, this.postsContainer.firstChild);

    // Simulate API call
    setTimeout(() => {
      // Clear existing posts
      document.querySelectorAll('post-component').forEach(post => post.remove());
      
      // Load new posts
      this.loadNextBatch();
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

// Initialize the feed when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PostFeed();
});
