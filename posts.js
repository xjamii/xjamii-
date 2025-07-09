class PostComponent extends HTMLElement {
  constructor() {
    super();
    // No Shadow DOM to maintain external CSS compatibility
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
          is_verified: false
        };
      }

      // Create avatar HTML - either image or initials
      const avatarHtml = post.profile.avatar_url 
        ? `<img src="${post.profile.avatar_url}" alt="User Avatar" class="post-avatar" onerror="this.onerror=null;this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"50\" height=\"50\" viewBox=\"0 0 50 50\"><rect width=\"50\" height=\"50\" fill=\"%230056b3\"/><text x=\"50%\" y=\"50%\" font-size=\"20\" fill=\"white\" text-anchor=\"middle\" dy=\".3em\">${this.getInitials(post.profile.full_name || post.profile.username)}</text></svg>'">`
        : `<div class="post-avatar initials">${this.getInitials(post.profile.full_name || post.profile.username)}</div>`;

      this.innerHTML = `
        <div class="post-container">
          <div class="post">
            <div class="post-header">
              ${avatarHtml}
              <div class="post-user-info">
                <div class="post-user">
                  ${post.profile.full_name || post.profile.username}
                  ${post.profile.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
                </div>
                <div class="post-username">@${post.profile.username}</div>
              </div>
              <span class="post-time">${this.formatTime(post.created_at)}</span>
            </div>
            ${post.content ? `<p class="post-content">${post.content}</p>` : ''}
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

      // Add event listeners after rendering
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
          ? `<div class="media-container"><video controls class="post-media"><source src="${mediaItems[0].media_url}" type="video/mp4"></video></div>`
          : `<div class="media-container"><img src="${mediaItems[0].media_url}" alt="Post image" class="post-media" onerror="this.style.display='none'"></div>`;
      }
      
      return `
        <div class="media-grid">
          ${mediaItems.slice(0, 4).map(media => 
            media.media_type === 'video'
              ? `<div class="grid-media-container"><video controls class="grid-media"><source src="${media.media_url}" type="video/mp4"></video></div>`
              : `<div class="grid-media-container"><img src="${media.media_url}" class="grid-media" onerror="this.style.display='none'"></div>`
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
    this.querySelector('.like-action')?.addEventListener('click', () => {
      this.toggleLike(post.id);
    });

    // Comment action
    this.querySelector('.comment-action')?.addEventListener('click', () => {
      this.showComments(post.id);
    });

    // Share action
    this.querySelector('.share-action')?.addEventListener('click', () => {
      this.sharePost(post.id);
    });

    // More options
    this.querySelector('.post-more')?.addEventListener('click', (e) => {
      this.showMoreOptions(e, post);
    });
  }

  toggleLike(postId) {
    const likeBtn = this.querySelector('.like-action');
    if (!likeBtn) return;
    
    const isLiked = likeBtn.classList.contains('liked');
    const likeCountEl = likeBtn.querySelector('i').nextSibling;
    const currentCount = parseInt(likeCountEl.textContent);
    
    // Optimistic UI update
    likeBtn.classList.toggle('liked');
    likeBtn.innerHTML = isLiked 
      ? `<i class="far fa-heart"></i> ${currentCount - 1}`
      : `<i class="fas fa-heart"></i> ${currentCount + 1}`;
    
    // TODO: Add your actual like API call here
    console.log(`${isLiked ? 'Unliked' : 'Liked'} post ${postId}`);
  }

  showComments(postId) {
    // TODO: Implement your comment popup logic
    console.log(`Show comments for post ${postId}`);
  }

  sharePost(postId) {
    // TODO: Implement your share logic
    console.log(`Share post ${postId}`);
  }

  showMoreOptions(e, post) {
    // TODO: Implement your more options menu
    console.log(`Show options for post ${post.id}`);
    e.stopPropagation();
  }
}

// Register the component
if (!customElements.get('post-component')) {
  customElements.define('post-component', PostComponent);
}
