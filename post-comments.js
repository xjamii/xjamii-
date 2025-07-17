// post-comment.js
class CommentComponent extends HTMLElement {
  constructor() {
    super();
    this.commentData = null;
    this.isOwner = false;
    this.isExpanded = false;
    this.currentUserId = null;
  }

  async connectedCallback() {
    // Get current user ID
    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;
    } catch (error) {
      console.error('Error getting user:', error);
      this.currentUserId = null;
    }
    
    this.render();
  }

  static get observedAttributes() {
    return ['comment-data', 'is-owner'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'comment-data' && newValue) {
      this.commentData = JSON.parse(newValue);
      this.render();
    } else if (name === 'is-owner') {
      this.isOwner = newValue === 'true';
      this.render();
    }
  }

  formatTime(dateString) {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - commentDate) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return commentDate.toLocaleDateString();
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

  async deleteComment() {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', this.commentData.id);

      if (error) throw error;

      // Remove comment from DOM
      this.remove();

      // Update comment count on the post
      await supabase.rpc('decrement_comment_count', { post_id: this.commentData.post_id });

    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  }

  showMoreOptions(e) {
    e.stopPropagation();
    
    // Remove any existing popups
    document.querySelectorAll('.more-options-popup').forEach(el => el.remove());
    
    const popup = document.createElement('div');
    popup.className = 'more-options-popup';
    
    if (this.isOwner) {
      popup.innerHTML = `
        <div class="more-options-content">
          <div class="more-option edit-option"><i class="fas fa-edit"></i> Edit</div>
          <div class="more-option delete-option"><i class="fas fa-trash-alt"></i> Delete</div>
        </div>
      `;
    } else {
      popup.innerHTML = `
        <div class="more-options-content">
          <div class="more-option report-option"><i class="fas fa-flag"></i> Report</div>
        </div>
      `;
    }
    
    document.body.appendChild(popup);
    
    // Position the popup near the three dots button
    const rect = e.target.getBoundingClientRect();
    popup.style.left = `${rect.left - 100}px`;
    popup.style.top = `${rect.top + window.scrollY}px`;
    
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
      this.editComment();
      popup.remove();
    });
    
    popup.querySelector('.delete-option')?.addEventListener('click', () => {
      this.deleteComment();
      popup.remove();
    });
    
    popup.querySelector('.report-option')?.addEventListener('click', () => {
      this.reportComment();
      popup.remove();
    });
  }

  editComment() {
    const commentPage = document.querySelector('.comment-page-overlay');
    if (!commentPage) return;

    const input = commentPage.querySelector('.comment-page-input');
    if (!input) return;

    input.value = this.commentData.content;
    input.focus();
    input.dataset.editingCommentId = this.commentData.id;
  }

  reportComment() {
    alert('Report functionality will be implemented soon');
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    this.render();
  }

  render() {
    if (!this.commentData) return;

    const profile = this.commentData.profile || {
      username: 'unknown',
      full_name: 'Unknown User',
      avatar_url: '',
      is_verified: false,
      user_id: ''
    };

    const showSeeMore = this.commentData.content.length > 200 && !this.isExpanded;
    const displayedContent = showSeeMore 
      ? this.commentData.content.substring(0, 200) + '...' 
      : this.commentData.content;

    // Create avatar HTML
    const avatarHtml = profile.avatar_url 
      ? `<img src="${profile.avatar_url}" class="post-avatar" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'20\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
      : `<div class="post-avatar initials">${this.getInitials(profile.full_name)}</div>`;

    this.innerHTML = `
      <div class="comment-container">
        <div class="comment-header">
          <a href="/profile.html?user_id=${profile.user_id}" class="post-avatar-link" style="text-decoration: none">
            ${avatarHtml}
          </a>
          <div class="comment-user-info">
            <a href="/profile.html?user_id=${profile.user_id}" class="post-user-link" style="text-decoration: none">
              <div class="post-user">
                ${profile.full_name || profile.username}
                ${profile.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
              </div>
              <div class="post-username" style="text-decoration: none">@${profile.username}</div>
            </a>
          </div>
          <span class="post-time">${this.formatTime(this.commentData.created_at)}</span>
        </div>
        <div class="comment-content">
          ${this.processContent(displayedContent)}
          ${showSeeMore ? '<span class="see-more">See more</span>' : ''}
        </div>
        <div class="comment-actions">
          <div class="comment-action reply-action">
            <i class="far fa-comment-dots"></i> Reply
          </div>
          ${this.isOwner ? `<div class="comment-more"><i class="fas fa-ellipsis-h"></i></div>` : ''}
        </div>
      </div>
    `;

    this.querySelector('.reply-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.replyToComment();
    });

    this.querySelector('.comment-more')?.addEventListener('click', (e) => {
      this.showMoreOptions(e);
    });

    this.querySelector('.comment-content')?.addEventListener('click', (e) => {
      if (!e.target.classList.contains('mention') && !e.target.classList.contains('hashtag') && !e.target.classList.contains('url') && !e.target.classList.contains('see-more')) {
        this.toggleExpand();
      }
    });

    this.querySelector('.see-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleExpand();
    });

    // Make mentions clickable
    this.querySelectorAll('.mention').forEach(mention => {
      mention.addEventListener('click', (e) => {
        e.stopPropagation();
        const username = e.target.textContent.substring(1);
        window.location.href = `/profile.html?username=${username}`;
      });
    });
  }

  replyToComment() {
    const commentPage = document.querySelector('.comment-page-overlay');
    if (!commentPage) return;

    const input = commentPage.querySelector('.comment-page-input');
    if (!input) return;

    input.value = '';
    input.focus();
  }
}

customElements.define('comment-component', CommentComponent);

class CommentPage {
  constructor(postId) {
    this.postId = postId;
    this.comments = [];
    this.isLoading = false;
    this.hasMore = true;
    this.offset = 0;
    this.limit = 10;
    this.currentUser = null;
    this.commentsChannel = null;
  }

  async init() {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');
      this.currentUser = user;

      // Create the comment page overlay
      this.createCommentPage();

      // Load initial comments
      await this.loadComments();

      // Setup real-time updates
      this.setupRealtimeUpdates();

    } catch (error) {
      console.error('Error initializing comment page:', error);
    }
  }

  createCommentPage() {
    // Remove any existing comment page
    document.querySelector('.comment-page-overlay')?.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'comment-page-overlay';
    overlay.innerHTML = `
      <div class="comment-page-header">
        <div class="comment-page-close"><i class="fas fa-times"></i></div>
        <div class="comment-page-title" style="margin-left: 15px;">Comments</div>
      </div>
      <div class="comment-page-comments"></div>
      <div class="comment-page-input-container">
        <input type="text" class="comment-page-input" placeholder="Write a comment...">
        <button class="comment-page-send"><i class="fas fa-paper-plane"></i></button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Add event listeners
    overlay.querySelector('.comment-page-close').addEventListener('click', () => {
      this.close();
    });

    overlay.querySelector('.comment-page-send').addEventListener('click', () => {
      this.sendComment();
    });

    overlay.querySelector('.comment-page-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendComment();
      }
    });

    // Setup infinite scroll
    const commentsContainer = overlay.querySelector('.comment-page-comments');
    commentsContainer.addEventListener('scroll', () => {
      if (this.isLoading || !this.hasMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = commentsContainer;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        this.loadMoreComments();
      }
    });
  }

  async loadComments() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile:user_id (id, username, full_name, avatar_url, is_verified)
        `)
        .eq('post_id', this.postId)
        .order('created_at', { ascending: false })
        .range(this.offset, this.offset + this.limit - 1);

      if (error) throw error;

      if (comments.length < this.limit) {
        this.hasMore = false;
      }

      this.comments = [...this.comments, ...comments];
      this.offset += this.limit;
      this.renderComments();

    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadMoreComments() {
    await this.loadComments();
  }

  renderComments() {
    const commentsContainer = document.querySelector('.comment-page-comments');
    if (!commentsContainer) return;

    // Clear existing comments if it's the first load
    if (this.offset === this.limit) {
      commentsContainer.innerHTML = '';
    }

    if (this.comments.length === 0 && this.offset === this.limit) {
      commentsContainer.innerHTML = `
        <div class="no-comments">
          <i class="far fa-comment-dots"></i>
          <div>No comments yet</div>
        </div>
      `;
      return;
    }

    this.comments.forEach(comment => {
      const isOwner = comment.user_id === this.currentUser.id;
      const commentElement = document.createElement('comment-component');
      commentElement.setAttribute('comment-data', JSON.stringify(comment));
      commentElement.setAttribute('is-owner', isOwner);
      commentsContainer.appendChild(commentElement);
    });
  }

  async sendComment() {
  const input = document.querySelector('.comment-page-input');
  if (!input) return;

  const content = input.value.trim();
  if (!content) return;

  const editingCommentId = input.dataset.editingCommentId;
  input.value = '';
  delete input.dataset.editingCommentId;

  try {
    if (editingCommentId) {
      // ... existing edit comment code ...
    } else {
      // Create new comment
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          post_id: this.postId,
          user_id: this.currentUser.id,
          content
        })
        .select('*')
        .single();

      if (error) throw error;

      // Add profile info to the new comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_verified')
        .eq('id', this.currentUser.id)
        .single();

      newComment.profile = profile;

      // Add to beginning of comments array
      this.comments.unshift(newComment);
      this.renderComments();

      // Increment comment count on the post
      await supabase.rpc('increment_comment_count', { post_id: this.postId });
      
      // Bump the post timestamp (ADD THIS LINE)
      await supabase.rpc('bump_post_timestamp', { post_id: this.postId });

      // Scroll to top to see the new comment
      const commentsContainer = document.querySelector('.comment-page-comments');
      if (commentsContainer) {
        commentsContainer.scrollTop = 0;
      }
    }

  } catch (error) {
    console.error('Error sending comment:', error);
    alert('Failed to post comment. Please try again.');
  }
}



  setupRealtimeUpdates() {
    // Unsubscribe from any existing channel
    if (this.commentsChannel) {
      supabase.removeChannel(this.commentsChannel);
    }

    // Subscribe to new comments
    this.commentsChannel = supabase
      .channel(`comments:post_id=eq.${this.postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${this.postId}`
      }, async (payload) => {
        // Skip if it's our own comment (already handled)
        if (payload.new.user_id === this.currentUser.id) return;

        // Get profile info for the new comment
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_verified')
          .eq('id', payload.new.user_id)
          .single();

        const newComment = {
          ...payload.new,
          profile
        };

        // Add to beginning of comments array
        this.comments.unshift(newComment);
        this.renderComments();

        // Scroll to top to see the new comment
        const commentsContainer = document.querySelector('.comment-page-comments');
        if (commentsContainer) {
          commentsContainer.scrollTop = 0;
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${this.postId}`
      }, (payload) => {
        // Remove deleted comment
        this.comments = this.comments.filter(c => c.id !== payload.old.id);
        this.renderComments();
      })
      .subscribe();
  }

  close() {
    // Unsubscribe from real-time updates
    if (this.commentsChannel) {
      supabase.removeChannel(this.commentsChannel);
    }

    const overlay = document.querySelector('.comment-page-overlay');
    if (overlay) {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
      }, 300);
    }
  }
}

// Add this CSS for comments (removed like-related styles)
const commentStyles = document.createElement('style');
commentStyles.textContent = `
.comment-page-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s ease, transform 0.3s ease;
  overflow: hidden;
}

.comment-page-overlay.closing {
  opacity: 0;
  transform: translateY(20px);
}

.comment-page-header {
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  position: relative;
  flex-shrink: 0;
}

.comment-page-close {
  font-size: 20px;
  cursor: pointer;
  color: var(--dark);
}

.comment-page-title {
  font-weight: bold;
  font-size: 18px;
}

.comment-page-comments {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 15px;
}

.comment-page-input-container {
  padding: 15px;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  background-color: white;
}

.comment-page-input {
  flex: 1;
  padding: 12px 15px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  outline: none;
  font-size: 15px;
}

.comment-page-send {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.comment-page-send:disabled {
  background-color: var(--gray);
  cursor: not-allowed;
}

.comment-page-send:hover:not(:disabled) {
  background-color: var(--primary-dark);
}

.no-comments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--gray);
  text-align: center;
}

.no-comments i {
  font-size: 40px;
  margin-bottom: 10px;
  color: var(--light-gray);
}

.comment-container {
  padding: 15px 0;
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

.comment-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 5px;
}

.comment-user-info {
  flex: 1;
  margin-bottom: 5px;
}

.comment-more {
  color: var(--gray);
  cursor: pointer;
  padding: 5px;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.comment-more:hover {
  color: var(--dark);
}

.comment-content {
  margin-left: 65px;
  margin-top: -10px;
  margin-bottom: 8px;
  word-break: break-word;
  line-height: 1.4;
  padding-right: 20px;
}

.comment-actions {
  display: flex;
  gap: 15px;
  margin-left: 65px;
  position: relative;
  padding-right: 30px;
}

.comment-action {
  display: flex;
  align-items: center;
  color: var(--gray);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.comment-action i {
  margin-right: 5px;
}

.comment-action.reply-action:hover {
  color: var(--primary);
}

.see-more {
  color: var(--primary);
  cursor: pointer;
  font-weight: bold;
}

.post-time {
  color: var(--gray);
  font-size: 13px;
}

.more-options-popup {
  position: absolute;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  padding: 5px 0;
}

.more-options-content {
  display: flex;
  flex-direction: column;
}

.more-option {
  padding: 10px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.more-option:hover {
  background-color: #f5f5f5;
}

.more-option i {
  width: 20px;
  text-align: center;
}

.delete-option {
  color: #ff4444;
}
`;
document.head.appendChild(commentStyles);

// Keep the PostComponent's openCommentPage method the same
PostComponent.prototype.openCommentPage = function(post) {
  const commentPage = new CommentPage(post.id);
  commentPage.init();
};

// Keep the helper function to open comment page from anywhere
window.openCommentPage = function(postId) {
  const commentPage = new CommentPage(postId);
  commentPage.init();
};
