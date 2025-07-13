class CommentPage {
  constructor(postComponent) {
    this.postComponent = postComponent;
  }

  show(post) {
    const commentPage = document.createElement('div');
    commentPage.className = 'comment-page-overlay';
    
    commentPage.appendChild(this.createHeader());
    commentPage.appendChild(this.createPostPreview(post));
    commentPage.appendChild(this.createCommentsSection());
    commentPage.appendChild(this.createCommentInput());
    
    document.body.appendChild(commentPage);
    document.body.style.overflow = 'hidden';
    
    this.setupEventListeners(commentPage, post);
    setTimeout(() => commentPage.querySelector('.comment-page-input')?.focus(), 300);
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'comment-page-header';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'comment-page-close';
    closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    closeBtn.addEventListener('click', () => this.close(header.closest('.comment-page-overlay')));
    
    const title = document.createElement('div');
    title.className = 'comment-page-title';
    title.textContent = 'Comments';
    
    header.appendChild(closeBtn);
    header.appendChild(title);
    return header;
  }

  createPostPreview(post) {
    const profile = post.profile || {
      username: 'unknown',
      full_name: 'Unknown User',
      avatar_url: '',
      is_verified: false,
      user_id: ''
    };
    
    const postPreview = document.createElement('div');
    postPreview.className = 'comment-page-post-preview';
    
    postPreview.innerHTML = `
      <div class="comment-page-post">
        <div class="post-header">
          <a href="/profile.html?user_id=${profile.user_id}" class="post-avatar-link" style="text-decoration: none">
            ${this.postComponent.createAvatarHtml(profile)}
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
          <span class="post-time">${this.postComponent.formatTime(post.created_at)}</span>
        </div>
        ${post.content ? `<p class="post-content">${this.postComponent.processContent(post.content)}</p>` : ''}
        ${this.postComponent.renderMediaForCommentPage(post.media || [])}
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
    
    return postPreview;
  }

  createCommentsSection() {
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
    return commentsSection;
  }

  createCommentInput() {
    const commentInput = document.createElement('div');
    commentInput.className = 'comment-page-input-container';
    commentInput.innerHTML = `
      <input type="text" class="comment-page-input" placeholder="Write a comment...">
      <button class="comment-page-send"><i class="fas fa-paper-plane"></i></button>
    `;
    return commentInput;
  }

  setupEventListeners(commentPage, post) {
    commentPage.querySelector('.like-action')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.postComponent.handleLikeClick(e, post);
    });

    commentPage.querySelector('.post-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.postComponent.showMoreOptions(e, post);
    });

    commentPage.querySelector('.share-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.postComponent.sharePost(post.id);
    });

    commentPage.querySelector('.comment-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      commentPage.querySelector('.comment-page-input')?.focus();
    });

    commentPage.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
      media.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaIndex = parseInt(media.getAttribute('data-media-index') || media.parentElement.getAttribute('data-media-index') || 0);
        this.postComponent.mediaViewer.show(post.media, mediaIndex);
      });
    });

    commentPage.querySelector('.comment-page-send')?.addEventListener('click', () => {
      this.postComment(commentPage);
    });

    commentPage.querySelector('.comment-page-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.postComment(commentPage);
    });
  }

  postComment(commentPage) {
    const input = commentPage.querySelector('.comment-page-input');
    const commentText = input.value.trim();
    if (commentText) {
      console.log('Posting comment:', commentText);
      input.value = '';
    }
  }

  close(commentPage) {
    commentPage.classList.add('closing');
    setTimeout(() => commentPage.remove(), 300);
    document.body.style.overflow = '';
  }
}
