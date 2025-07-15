export function setupEventListeners(post) {
  this.querySelector('.like-action')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const likeBtn = e.currentTarget;
    const isLiked = likeBtn.classList.contains('liked');
    
    likeBtn.classList.toggle('liked');
    const icon = likeBtn.querySelector('i');
    icon.className = isLiked ? 'far fa-heart' : 'fas fa-heart';
    
    const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
    if (countEl) {
      let count = parseInt(countEl.textContent) || 0;
      countEl.textContent = isLiked ? count - 1 : count + 1;
    }
    
    try {
      const { success, error } = await this.toggleLike(post.id, isLiked);
      
      if (!success) {
        throw new Error(error || 'Failed to update like');
      }
      
      post.is_liked = !isLiked;
      post.like_count = parseInt(countEl.textContent);
    } catch (error) {
      likeBtn.classList.toggle('liked');
      icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
      if (countEl) {
        let count = parseInt(countEl.textContent) || 0;
        countEl.textContent = isLiked ? count + 1 : count - 1;
      }
      
      console.error('Like update failed:', error);
      alert(`Error: ${error.message}. Please try again.`);
    }
  });

  this.querySelector('.post-more')?.addEventListener('click', (e) => {
    e.stopPropagation();
    this.showMoreOptions(e, post);
  });

  this.querySelector('.share-action')?.addEventListener('click', (e) => {
    e.stopPropagation();
    this.sharePost(post.id);
  });

  this.querySelector('.comment-action')?.addEventListener('click', (e) => {
    e.stopPropagation();
    this.openCommentPage(post);
  });

  this.querySelectorAll('.mention').forEach(mention => {
    mention.addEventListener('click', (e) => {
      e.stopPropagation();
      const username = e.target.textContent.substring(1);
      window.location.href = `/profile.html?username=${username}`;
    });
  });

  this.querySelectorAll('.post-media, .grid-media, .video-preview').forEach(media => {
    media.addEventListener('click', (e) => {
      e.stopPropagation();
      const mediaIndex = parseInt(media.getAttribute('data-media-index') || media.parentElement.getAttribute('data-media-index') || 0);
      this.showMediaViewer(post.media, mediaIndex);
    });
  });

  this.querySelector('.see-more')?.addEventListener('click', (e) => {
    e.stopPropagation();
    this.openCommentPage(post);
  });

  this.querySelector('.post-content')?.addEventListener('click', (e) => {
    if (!e.target.classList.contains('mention') && !e.target.classList.contains('hashtag') && !e.target.classList.contains('url')) {
      this.openCommentPage(post);
    }
  });

  if (this.previousElementSibling === null) {
    this.setupPullToRefresh();
  }
}
