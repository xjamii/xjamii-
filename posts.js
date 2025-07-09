class PostComponent extends HTMLElement {
  constructor() {
    super();
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
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<span class="url">$1</span>');
    
    return content;
  }

  render() {
    try {
      const postData = this.getAttribute('post-data');
      if (!postData) return;

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
            ${post.content ? `<p class="post-content">${this.processContent(post.content)}</p>` : ''}
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
      return media.media_type === 'video' 
        ? `<div class="media-container">
            <video class="post-media" controls>
              <source src="${media.media_url}" type="video/mp4">
            </video>
          </div>`
        : `<div class="media-container">
            <img src="${media.media_url}" class="post-media">
          </div>`;
    }
    
    return `
      <div class="media-grid">
        ${mediaItems.slice(0, 4).map(media => `
          <div class="grid-media-container">
            ${media.media_type === 'video' 
              ? `<video class="grid-media" controls>
                  <source src="${media.media_url}" type="video/mp4">
                </video>`
              : `<img src="${media.media_url}" class="grid-media">`}
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
      
      // TODO: Add like API call
      console.log(`${isLiked ? 'Unliked' : 'Liked'} post ${post.id}`);
    });

    // More options
    this.querySelector('.post-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showMoreOptions(e, post);
    });

    // Share action (with your original icon)
    this.querySelector('.share-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sharePost(post.id);
    });

    // Mentions
    this.querySelectorAll('.mention').forEach(mention => {
      mention.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = e.target.textContent.substring(1);
        window.location.href = `/profile.html?username=${username}`;
      });
    });

    // URLs
    this.querySelectorAll('.url').forEach(url => {
      url.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(e.target.textContent, '_blank');
      });
    });
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
}

customElements.define('post-component', PostComponent);
