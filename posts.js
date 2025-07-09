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

  createInitialAvatar(name) {
    if (!name) name = 'User';
    const initials = name.split(' ').map(n => n[0] || '').join('').toUpperCase().substring(0, 2);
    const colors = ['#00B0FF', '#FF5722', '#4CAF50', '#9C27B0', '#FF9800'];
    const colorIndex = (initials.charCodeAt(0) || 0) % colors.length;
    const color = colors[colorIndex];
    
    return `
      <div class="avatar-initial" style="background-color: ${color}">
        ${initials || 'U'}
      </div>
    `;
  }

  getPostStyles() {
    return `
      :host {
        display: block;
        width: 100%;
      }
      
      :root {
        --primary: #0056b3;
        --primary-dark: #003d7a;
        --secondary: #ffc107;
        --light: #f8f9fa;
        --dark: #212529;
        --gray: #6c757d;
        --light-gray: #e9ecef;
        --twitter-blue: #1D9BF0;
      }
      
      .post-container {
        width: 100%;
        background: white;
        padding: 20px;
        border-bottom: 1px solid var(--light-gray);
      }
      
      .post {
        margin-bottom: 0;
      }
      
      .post-header {
        display: flex;
        align-items: flex-start;
        margin-bottom: 12px;
        position: relative;
      }
      
      .post-avatar, .avatar-initial {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        object-fit: cover;
        margin-right: 15px;
      }
      
      .avatar-initial {
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 20px;
      }
      
      .post-user-info {
        flex: 1;
      }
      
      .post-user {
        display: flex;
        align-items: center;
        font-weight: 600;
        color: var(--dark);
      }
      
      .verified-badge {
        color: var(--primary);
        font-size: 16px;
        margin-left: 5px;
      }
      
      .post-username {
        color: var(--gray);
        font-size: 14px;
        margin-top: 2px;
      }
      
      .post-time {
        font-size: 13px;
        color: var(--gray);
        position: absolute;
        right: 0;
        top: 0;
      }
      
      .post-content {
        margin-bottom: 15px;
        font-size: 16px;
        margin-left: 65px;
        margin-top: -5px;
        word-break: break-word;
      }
      
      .post-content a,
      .post-content .hashtag,
      .post-content .mention {
        color: var(--primary);
        text-decoration: none;
      }
      
      .post-content a:hover,
      .post-content .hashtag:hover,
      .post-content .mention:hover {
        text-decoration: underline;
      }
      
      .post-image, .post-video {
        width: calc(100% - 65px);
        margin-left: 65px;
        border-radius: 8px;
        margin-bottom: 8px;
        max-height: 500px;
        object-fit: cover;
      }
      
      .post-actions {
        display: flex;
        gap: 15px;
        align-items: center;
        margin-left: 65px;
      }
      
      .post-action {
        display: flex;
        align-items: center;
        color: var(--gray);
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .post-action i {
        margin-right: 5px;
      }
      
      .post-action:hover {
        color: var(--primary);
      }
      
      .post-action.share:hover {
        color: var(--twitter-blue);
      }
      
      .post-action.views {
        margin-left: auto;
        color: var(--gray);
      }
      
      .post-more {
        color: var(--gray);
        cursor: pointer;
        padding: 5px;
        margin-left: 5px;
      }
      
      .media-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-left: 65px;
        margin-bottom: 8px;
      }
      
      .media-grid img, .media-grid video {
        width: 100%;
        height: 150px;
        border-radius: 8px;
        object-fit: cover;
      }
      
      .media-count-overlay {
        position: relative;
      }
      
      .media-count-overlay::after {
        content: "+" attr(data-count);
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: bold;
        border-radius: 8px;
      }
      
      .post-error {
        color: #dc3545;
        padding: 10px;
        text-align: center;
      }
      
      @media (max-width: 480px) {
        .post-avatar, .avatar-initial {
          width: 40px;
          height: 40px;
          margin-right: 12px;
        }
        
        .post-content,
        .post-image,
        .post-video,
        .post-actions,
        .media-grid {
          margin-left: 52px;
        }
      }
    `;
  }

  render() {
    try {
      const postData = this.getAttribute('post-data');
      if (!postData) {
        console.error("No post-data attribute provided");
        this.shadowRoot.innerHTML = `<div class="post-error">No post data</div>`;
        return;
      }

      const post = JSON.parse(postData);
      
      // Ensure profile data exists with fallbacks
      post.profile = post.profile || {
        username: 'unknown',
        full_name: 'Unknown User',
        avatar_url: '',
        is_verified: false
      };

      // Ensure media array exists
      post.media = post.media || [];

      // Create avatar HTML
      const avatarHtml = post.profile.avatar_url 
        ? `<img src="${post.profile.avatar_url}" 
             alt="${post.profile.full_name || post.profile.username}" 
             class="post-avatar"
             onerror="this.replaceWith(this.parentElement.querySelector('.avatar-initial'))">`
        : this.createInitialAvatar(post.profile.full_name || post.profile.username);

      this.shadowRoot.innerHTML = `
        <style>${this.getPostStyles()}</style>
        <div class="post-container">
          <div class="post">
            <div class="post-header">
              ${avatarHtml}
              ${!post.profile.avatar_url ? this.createInitialAvatar(post.profile.full_name || post.profile.username) : ''}
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
            ${this.renderMedia(post.media)}
            <div class="post-actions">
              <div class="post-action"><i class="far fa-comment"></i> ${post.stats?.comments || 0}</div>
              <div class="post-action"><i class="far fa-heart"></i> ${post.stats?.likes || 0}</div>
              <div class="post-action share"><i class="fas fa-arrow-up-from-bracket"></i></div>
              <div class="post-action views"><i class="fas fa-chart-bar"></i> ${post.stats?.views || 0}</div>
              <div class="post-more"><i class="fas fa-ellipsis-h"></i></div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error rendering post:", error);
      this.shadowRoot.innerHTML = `
        <style>${this.getPostStyles()}</style>
        <div class="post-container">
          <div class="post-error">Error displaying this post</div>
        </div>
      `;
    }
  }

  renderMedia(mediaItems) {
    if (!mediaItems || mediaItems.length === 0) return '';
    
    try {
      if (mediaItems.length === 1) {
        return mediaItems[0].media_type === 'video'
          ? `<video controls class="post-video">
              <source src="${mediaItems[0].media_url}" type="video/mp4">
              Your browser does not support the video tag.
             </video>`
          : `<img src="${mediaItems[0].media_url}" alt="Post image" class="post-image" 
               onerror="this.style.display='none'">`;
      }

      return `
        <div class="media-grid">
          ${mediaItems.slice(0, 4).map((media, index) => 
            media.media_type === 'video'
              ? `<video controls class="grid-media">
                  <source src="${media.media_url}" type="video/mp4">
                 </video>`
              : `<img src="${media.media_url}" class="grid-media" 
                   onerror="this.style.display='none'">`
          ).join('')}
          ${mediaItems.length > 4 ? `
            <div class="media-count-overlay" data-count="${mediaItems.length - 4}">
              <img src="${mediaItems[3].media_url}" class="grid-media">
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
