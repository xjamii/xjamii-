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
    try {
      const now = new Date();
      const postDate = new Date(dateString);
      if (isNaN(postDate.getTime())) {
        console.error("Invalid date string:", dateString);
        return "just now";
      }
      
      const diffInSeconds = Math.floor((now - postDate) / 1000);
      if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return postDate.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting time:", error);
      return "";
    }
  }

  getInitials(name) {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
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
      if (!postData) {
        console.error("No post-data attribute provided");
        return;
      }

      const post = JSON.parse(postData);
      
      if (!post.profile) {
        console.error("Post is missing profile data:", post);
        post.profile = {
          username: 'unknown',
          full_name: 'Unknown User',
          avatar_url: '',
          is_verified: false,
          user_id: ''
        };
      }

      // Create avatar HTML
      const avatarHtml = post.profile.avatar_url 
        ? `<img src="${post.profile.avatar_url}" alt="User Avatar" class="post-avatar" onerror="this.onerror=null;this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"50\" height=\"50\" viewBox=\"0 0 50 50\"><rect width=\"50\" height=\"50\" fill=\"%230056b3\"/><text x=\"50%\" y=\"50%\" font-size=\"20\" fill=\"white\" text-anchor=\"middle\" dy=\".3em\">${this.getInitials(post.profile.full_name || post.profile.username)}</text></svg>'">`
        : `<div class="post-avatar initials">${this.getInitials(post.profile.full_name || post.profile.username)}</div>`;

      this.innerHTML = `
        <div class="post-container">
          <div class="post">
            <div class="post-header">
              <a href="/profile.html?user_id=${post.profile.user_id}" class="post-avatar-link">
                ${avatarHtml}
              </a>
              <div class="post-user-info">
                <a href="/profile.html?user_id=${post.profile.user_id}" class="post-user-link">
                  <div class="post-user">
                    ${post.profile.full_name || post.profile.username}
                    ${post.profile.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                  </div>
                  <div class="post-username">@${post.profile.username}</div>
                </a>
              </div>
              <span class="post-time">${this.formatTime(post.created_at)}</span>
            </div>
            ${post.content ? `<p class="post-content">${this.processContent(post.content)}</p>` : ''}
            ${post.media && post.media.length > 0 ? this.renderMedia(post.media) : ''}
            <div class="post-actions">
              <div class="post-action comment-action"><i class="far fa-comment"></i> ${post.comment_count || 0}</div>
              <div class="post-action like-action ${post.is_liked ? 'liked' : ''}"><i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i> ${post.like_count || 0}</div>
              <div class="post-action share-action"><i class="fas fa-arrow-up-from-bracket"></i></div>
              <div class="post-more"><i class="fas fa-ellipsis-h"></i></div>
              <div class="post-action views"><i class="fas fa-chart-bar"></i> ${post.views || 0}</div>
            </div>
          </div>
        </div>
      `;

      // Add event listeners
      this.addEventListeners(post);

    } catch (error) {
      console.error("Error rendering post:", error);
      this.innerHTML = `
        <div class="post-container">
          <div class="post-error">Error displaying this post</div>
        </div>
      `;
    }
  }

  renderMedia(mediaItems) {
    try {
      if (!mediaItems || !mediaItems.length) return '';
      
      if (mediaItems.length === 1) {
        return mediaItems[0].media_type === 'video' 
          ? `<div class="media-container" data-media-type="video">
              <video class="post-media" data-src="${mediaItems[0].media_url}">
                <source src="${mediaItems[0].media_url}" type="video/mp4">
              </video>
              <div class="media-controls">
                <i class="fas fa-play play-button"></i>
              </div>
            </div>`
          : `<div class="media-container" data-media-type="image">
              <img src="${mediaItems[0].media_url}" class="post-media" data-src="${mediaItems[0].media_url}">
            </div>`;
      }
      
      return `
        <div class="media-grid">
          ${mediaItems.slice(0, 4).map((media, index) => 
            media.media_type === 'video'
              ? `<div class="grid-media-container" data-media-type="video" data-index="${index}">
                  <video class="grid-media" data-src="${media.media_url}">
                    <source src="${media.media_url}" type="video/mp4">
                  </video>
                  <div class="media-controls">
                    <i class="fas fa-play play-button"></i>
                  </div>
                </div>`
              : `<div class="grid-media-container" data-media-type="image" data-index="${index}">
                  <img src="${media.media_url}" class="grid-media" data-src="${media.media_url}">
                </div>`
          ).join('')}
          ${mediaItems.length > 4 ? `
            <div class="media-count-overlay">
              +${mediaItems.length - 4}
            </div>` : ''}
        </div>
      `;
    } catch (error) {
      console.error("Error rendering media:", error);
      return '';
    }
  }

  addEventListeners(post) {
    // Like action
    this.querySelector('.like-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleLike(post.id);
    });

    // Comment action
    this.querySelector('.comment-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showComments(post.id);
    });

    // Share action
    this.querySelector('.share-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showShareOptions(post.id);
    });

    // More options
    this.querySelector('.post-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showMoreOptions(e, post);
    });

    // Media click handlers
    this.querySelectorAll('.media-container, .grid-media-container').forEach(container => {
      container.addEventListener('click', (e) => {
        if (e.target.classList.contains('play-button')) return;
        this.openMediaViewer(container, post.media);
      });
    });

    // Mention click handlers
    this.querySelectorAll('.mention').forEach(mention => {
      mention.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = e.target.textContent.substring(1);
        window.location.href = `/profile.html?username=${username}`;
      });
    });

    // URL click handlers
    this.querySelectorAll('.url').forEach(url => {
      url.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(e.target.textContent, '_blank');
      });
    });
  }

  toggleLike(postId) {
    const likeBtn = this.querySelector('.like-action');
    if (!likeBtn) return;
    
    const isLiked = likeBtn.classList.contains('liked');
    const icon = likeBtn.querySelector('i');
    const countEl = icon.nextSibling;
    let count = parseInt(countEl.textContent);
    
    // Optimistic UI update
    likeBtn.classList.toggle('liked');
    icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
    countEl.textContent = isLiked ? count - 1 : count + 1;
    
    // TODO: Add your actual like API call here
    console.log(`${isLiked ? 'Unliked' : 'Liked'} post ${postId}`);
  }

  showComments(postId) {
    // TODO: Implement your comment popup logic
    console.log(`Show comments for post ${postId}`);
  }

  showShareOptions(postId) {
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
      this.showFeedback('Link copied to clipboard!');
    });
  }

  showMoreOptions(e, post) {
    // Check if current user is post owner
    const isOwner = true; // Replace with actual ownership check
    
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
    
    // Position near the more button
    const moreBtn = e.target.closest('.post-more');
    const rect = moreBtn.getBoundingClientRect();
    popup.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    popup.style.left = `${rect.left - 100}px`;
    
    // Close when clicking outside
    const closePopup = () => {
      document.body.removeChild(popup);
      document.removeEventListener('click', outsideClick);
    };
    
    const outsideClick = (event) => {
      if (!popup.contains(event.target) {
        closePopup();
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', outsideClick);
    }, 0);
    
    // Add option handlers
    if (isOwner) {
      popup.querySelector('.edit-option')?.addEventListener('click', () => {
        console.log('Edit post', post.id);
        closePopup();
      });
      
      popup.querySelector('.delete-option')?.addEventListener('click', () => {
        console.log('Delete post', post.id);
        closePopup();
      });
    } else {
      popup.querySelector('.report-option')?.addEventListener('click', () => {
        console.log('Report post', post.id);
        closePopup();
      });
    }
  }

  openMediaViewer(container, mediaItems) {
    const mediaType = container.getAttribute('data-media-type');
    const mediaSrc = container.querySelector('.post-media, .grid-media').getAttribute('data-src');
    const index = container.hasAttribute('data-index') ? parseInt(container.getAttribute('data-index')) : 0;
    
    const viewer = document.createElement('div');
    viewer.className = 'media-viewer';
    viewer.innerHTML = `
      <div class="media-viewer-content">
        <div class="media-viewer-close"><i class="fas fa-times"></i></div>
        ${mediaType === 'video' ? `
          <video controls autoplay class="viewer-media">
            <source src="${mediaSrc}" type="video/mp4">
          </video>
        ` : `
          <img src="${mediaSrc}" class="viewer-media">
        `}
      </div>
    `;
    
    document.body.appendChild(viewer);
    
    // Close button
    viewer.querySelector('.media-viewer-close').addEventListener('click', () => {
      document.body.removeChild(viewer);
    });
    
    // Close on drag down
    let startY = 0;
    let currentY = 0;
    
    viewer.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    viewer.addEventListener('touchmove', (e) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      if (diff > 50) {
        viewer.style.transform = `translateY(${diff}px)`;
        viewer.style.opacity = `${1 - (diff / 300)}`;
      }
    }, { passive: true });
    
    viewer.addEventListener('touchend', () => {
      const diff = currentY - startY;
      
      if (diff > 100) {
        viewer.style.transition = 'transform 0.2s, opacity 0.2s';
        viewer.style.transform = 'translateY(100vh)';
        viewer.style.opacity = '0';
        
        setTimeout(() => {
          document.body.removeChild(viewer);
        }, 200);
      } else {
        viewer.style.transform = 'translateY(0)';
        viewer.style.opacity = '1';
      }
    }, { passive: true });
  }

  showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'feedback-message';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      feedback.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(feedback);
      }, 300);
    }, 3000);
  }
}

// Register the component
if (!customElements.get('post-component')) {
  customElements.define('post-component', PostComponent);
}
