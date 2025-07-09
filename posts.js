class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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

  render() {
    try {
      const postData = this.getAttribute('post-data');
      if (!postData) {
        console.error("No post-data attribute provided");
        return;
      }

      const post = JSON.parse(postData);
      console.log("Rendering post:", post); // Debug log
      
      if (!post.profile) {
        console.error("Post is missing profile data:", post);
        post.profile = {
          username: 'unknown',
          full_name: 'Unknown User',
          avatar_url: '',
          is_verified: false
        };
      }

      this.shadowRoot.innerHTML = `
        <style>
          /* Include all your CSS styles here */
          ${document.querySelector('style[data-post-styles]')?.innerText || ''}
        </style>
        <div class="post-container">
          <div class="post">
            <div class="post-header">
              <img src="${post.profile.avatar_url || 'https://randomuser.me/api/portraits/men/32.jpg'}" 
                   alt="User Avatar" class="post-avatar" 
                   onerror="this.src='https://www.gravatar.com/avatar/?d=identicon'">
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
              <div class="post-action"><i class="far fa-comment"></i> 0</div>
              <div class="post-action"><i class="far fa-heart"></i> 0</div>
              <div class="post-action share"><i class="fas fa-arrow-up-from-bracket"></i></div>
              <div class="post-action views"><i class="fas fa-chart-bar"></i> 0</div>
              <div class="post-more"><i class="fas fa-ellipsis-h"></i></div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error rendering post:", error);
      this.shadowRoot.innerHTML = `
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
          ? `<video controls class="post-image"><source src="${mediaItems[0].media_url}" type="video/mp4"></video>`
          : `<img src="${mediaItems[0].media_url}" alt="Post image" class="post-image" 
               onerror="this.style.display='none'">`;
      }
      
      return `
        <div class="media-grid">
          ${mediaItems.slice(0, 4).map(media => 
            media.media_type === 'video'
              ? `<video controls class="grid-media">
                  <source src="${media.media_url}" type="video/mp4">
                 </video>`
              : `<img src="${media.media_url}" class="grid-media" 
                   onerror="this.style.display='none'">`
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
}

// Register the component only if it hasn't been registered yet
if (!customElements.get('post-component')) {
  customElements.define('post-component', PostComponent);
}
