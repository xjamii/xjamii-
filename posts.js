class PostComponent extends HTMLElement {
  constructor() {
    super();
    this.mediaViewer = null;
    this.currentMediaIndex = 0;
    this.startY = 0;
    this.startX = 0;
    this.isRefreshing = false;
    this.isLoadingMore = false;
    this.currentUserId = null;
  }

  async connectedCallback() {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    this.currentUserId = user?.id;
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
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="url" target="_blank">$1</a>');
    
    return content;
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

      // Check if current user has liked this post
      let isLiked = false;
      let likeCount = post.like_count || 0;
      
      if (this.currentUserId) {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('profile_id', this.currentUserId)
          .maybeSingle();
        
        isLiked = !!data;
      }

      // Create avatar HTML
      const avatarHtml = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" class="post-avatar" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'20\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
        : `<div class="post-avatar initials">${this.getInitials(profile.full_name)}</div>`;

      // Check if content needs "See more"
      const content = post.content || '';
      const showSeeMore = content.length > 200;
      const displayedContent = showSeeMore ? content.substring(0, 200) + '...' : content;

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
            ${content ? `
              <p class="post-content" data-full-content="${content.replace(/"/g, '&quot;')}">
                ${this.processContent(displayedContent)}
                ${showSeeMore ? '<span class="see-more">See more</span>' : ''}
              </p>
            ` : ''}
            ${this.renderMedia(post.media || [])}
            <div class="post-actions">
              <div class="post-action comment-action"><i class="far fa-comment"></i> ${post.comment_count || 0}</div>
              <div class="post-action like-action ${isLiked ? 'liked' : ''}">
                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${likeCount}
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

  async setupEventListeners(post) {
    // Like action - updated for Supabase
    this.querySelector('.like-action')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!this.currentUserId) return;
      
      const likeBtn = e.currentTarget;
      const isLiked = likeBtn.classList.contains('liked');
      const icon = likeBtn.querySelector('i');
      const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
      
      try {
        if (isLiked) {
          // Unlike the post
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', post.id)
            .eq('profile_id', this.currentUserId);
          
          if (!error) {
            likeBtn.classList.remove('liked');
            icon.className = 'far fa-heart';
            if (countEl) {
              let count = parseInt(countEl.textContent) || 0;
              countEl.textContent = Math.max(0, count - 1);
            }
          }
        } else {
          // Like the post
          const { error } = await supabase
            .from('likes')
            .insert([
              { 
                post_id: post.id, 
                profile_id: this.currentUserId 
              }
            ]);
          
          if (!error) {
            likeBtn.classList.add('liked');
            icon.className = 'fas fa-heart';
            if (countEl) {
              let count = parseInt(countEl.textContent) || 0;
              countEl.textContent = count + 1;
            }
          }
        }
      } catch (error) {
        console.error('Error toggling like:', error);
      }
    });

    // ... keep all your other existing event listeners exactly the same ...
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

    // Comment action - open comment page
    this.querySelector('.comment-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCommentPage(post);
    });

    // Mentions
    this.querySelectorAll('.mention').forEach(mention => {
      mention.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = e.target.textContent.substring(1);
        window.location.href = `/profile.html?username=${username}`;
      });
    });

    // Media click handlers
    this.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
      media.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaIndex = parseInt(media.getAttribute('data-media-index') || media.parentElement.getAttribute('data-media-index') || 0);
        this.showMediaViewer(post.media, mediaIndex);
      });
    });

    // See more click handler
    this.querySelector('.see-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openCommentPage(post);
    });

    // Post content click handler (opens comment page)
    this.querySelector('.post-content')?.addEventListener('click', (e) => {
      if (!e.target.classList.contains('mention') && !e.target.classList.contains('hashtag') && !e.target.classList.contains('url')) {
        this.openCommentPage(post);
      }
    });

    // Setup pull-to-refresh if this is the first post
    if (this.previousElementSibling === null) {
      this.setupPullToRefresh();
    }
  }

  // ... keep all your other existing methods exactly the same ...
  // renderMedia(), showMediaViewer(), closeMediaViewer(), navigateMedia(), 
  // goToMedia(), handleTouchStart(), handleTouchMove(), handleTouchEnd(),
  // handleMouseDown(), openCommentPage(), setupCommentPageEventListeners(),
  // renderMediaForCommentPage(), showMoreOptions(), sharePost(), copyToClipboard(),
  // setupPullToRefresh() - all remain unchanged
}

customElements.define('post-component', PostComponent);
