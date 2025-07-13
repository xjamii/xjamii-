class PostComments {
  static openCommentPage(post) {
    const commentPage = document.createElement('div');
    commentPage.className = 'comment-page-overlay';
    
    const header = document.createElement('div');
    header.className = 'comment-page-header';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'comment-page-close';
    closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    closeBtn.addEventListener('click', () => {
      commentPage.classList.add('closing');
      setTimeout(() => commentPage.remove(), 300);
      document.body.style.overflow = '';
    });
    
    const title = document.createElement('div');
    title.className = 'comment-page-title';
    title.textContent = 'Comments';
    
    header.appendChild(closeBtn);
    header.appendChild(title);
    
    const postPreview = document.createElement('div');
    postPreview.className = 'comment-page-post-preview';
    
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
    
    postPreview.innerHTML = `
      <div class="comment-page-post">
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
        ${this.renderMediaForCommentPage(post.media || [])}
        <div class="post-actions">
          <div class="post-action like-action ${post.is_liked ? 'liked' : ''}">
            <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i> ${post.like_count || 0}
          </div>
          <div class="post-action comment-action"><i class="far fa-comment"></i> ${post.comment_count || 0}</div>
          <div class="post-action share-action"><i class="fas fa-arrow-up-from-bracket"></i></div>
          <div class="post-more"><i class="fas fa-ellipsis-h"></i></div>
          <div class="post-action views"><i class="fas fa-chart-bar"></i> ${post.views || 0}</div>
        </div>
      </div>
    `;
    
    const commentsSection = document.createElement('div');
    commentsSection.className = 'comment-page-comments';
    commentsSection.innerHTML = `
      <div class="comments-list">
        <div class="no-comments">
          <i class="far fa-comment-dots"></i>
          <div>No comments yet</div>
        </div>
      </div>
    `;
    
    const commentInput = document.createElement('div');
    commentInput.className = 'comment-page-input-container';
    commentInput.innerHTML = `
      <input type="text" class="comment-page-input" placeholder="Write a comment...">
      <button class="comment-page-send"><i class="fas fa-paper-plane"></i></button>
    `;
    
    commentPage.appendChild(header);
    commentPage.appendChild(postPreview);
    commentPage.appendChild(commentsSection);
    commentPage.appendChild(commentInput);
    
    document.body.appendChild(commentPage);
    document.body.style.overflow = 'hidden';
    
    this.setupCommentPageEventListeners(commentPage, post);
    
    setTimeout(() => {
      commentPage.querySelector('.comment-page-input')?.focus();
    }, 300);
  }

  static setupCommentPageEventListeners(commentPage, post) {
    commentPage.querySelector('.like-action')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await this.toggleLike(post);
      if (!result.success) {
        this.revertLikeUI(e.currentTarget, post.is_liked);
      }
    });

    commentPage.querySelector('.post-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showMoreOptions(e, post);
    });

    commentPage.querySelector('.share-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sharePost(post.id);
    });

    commentPage.querySelector('.comment-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      commentPage.querySelector('.comment-page-input')?.focus();
    });

    commentPage.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
      media.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaIndex = parseInt(media.getAttribute('data-media-index') || media.parentElement.getAttribute('data-media-index') || 0);
        this.showMediaViewer(post.media, mediaIndex);
      });
    });

    commentPage.querySelector('.comment-page-send')?.addEventListener('click', () => {
      const input = commentPage.querySelector('.comment-page-input');
      const commentText = input.value.trim();
      if (commentText) {
        console.log('Posting comment:', commentText);
        input.value = '';
      }
    });

    commentPage.querySelector('.comment-page-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const input = commentPage.querySelector('.comment-page-input');
        const commentText = input.value.trim();
        if (commentText) {
          console.log('Posting comment:', commentText);
          input.value = '';
        }
      }
    });
  }

  static renderMediaForCommentPage(mediaItems) {
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
}
