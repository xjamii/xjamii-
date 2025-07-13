class PostUtils {
  static formatTime(dateString) {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return postDate.toLocaleDateString();
  }

  static getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  static processContent(content) {
    if (!content) return '';
    
    content = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    content = content.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="url" target="_blank">$1</a>');
    
    return content;
  }

  static renderMedia(mediaItems) {
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

  static setupPullToRefresh() {
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
