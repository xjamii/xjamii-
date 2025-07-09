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
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  }

  render() {
    const postData = this.getAttribute('post-data');
    if (!postData) return;

    const post = JSON.parse(postData);
    
    this.shadowRoot.innerHTML = `
      <style>
        /* Paste all your post styles from the template here */
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
        
        /* ... rest of your post styles ... */
      </style>
      <div class="post-container">
        <div class="post">
          <div class="post-header">
            <img src="${post.profile.avatar_url || 'https://randomuser.me/api/portraits/men/32.jpg'}" 
                 alt="User Avatar" class="post-avatar">
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
  }

  renderMedia(mediaItems) {
    if (mediaItems.length === 1) {
      return mediaItems[0].media_type === 'video' 
        ? `<video controls class="post-image"><source src="${mediaItems[0].media_url}" type="video/mp4"></video>`
        : `<img src="${mediaItems[0].media_url}" alt="Post image" class="post-image">`;
    }
    
    return `
      <div class="media-grid" style="margin-left: 65px; margin-bottom: 8px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
        ${mediaItems.slice(0, 4).map(media => 
          media.media_type === 'video'
            ? `<video controls style="width: 100%; height: 150px; border-radius: 8px; object-fit: cover;">
                <source src="${media.media_url}" type="video/mp4">
               </video>`
            : `<img src="${media.media_url}" style="width: 100%; height: 150px; border-radius: 8px; object-fit: cover;">`
        ).join('')}
        ${mediaItems.length > 4 ? `<div style="position: relative;">
          <img src="${mediaItems[3].media_url}" style="width: 100%; height: 150px; border-radius: 8px; object-fit: cover; filter: brightness(0.5);">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold; font-size: 24px;">
            +${mediaItems.length - 4}
          </div>
        </div>` : ''}
      </div>
    `;
  }
}

customElements.define('post-component', PostComponent);
