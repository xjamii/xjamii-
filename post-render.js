export function render() {
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
    
    const avatarHtml = profile.avatar_url 
      ? `<img src="${profile.avatar_url}" class="post-avatar" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\'><rect width=\\'50\\' height=\\'50\\' fill=\\'%230056b3\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'20\\' fill=\\'white\\' text-anchor=\\'middle\\' dy=\\'.3em\\'>${this.getInitials(profile.full_name)}</text></svg>'">`
      : `<div class="post-avatar initials">${this.getInitials(profile.full_name)}</div>`;

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
            <div class="post-action like-action ${post.is_liked ? 'liked' : ''}">
              <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i> ${post.like_count || 0}
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

export function processContent(content) {
  if (!content) return '';
  content = content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  content = content.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
  content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" class="url" target="_blank">$1</a>');
  return content;
}

export function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

export function formatTime(dateString) {
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInSeconds = Math.floor((now - postDate) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return postDate.toLocaleDateString();
}
