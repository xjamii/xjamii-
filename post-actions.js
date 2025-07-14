class PostActions {
  static likeLocks = new Set();
  static clickTimers = {};

  static async toggleLike(post, buttonElement, countElement) {
    const postId = post.id;
    const isFastDoubleClick = this.clickTimers[postId];

    // Clear existing timer if it's a fast double-click
    if (isFastDoubleClick) {
      clearTimeout(this.clickTimers[postId]);
      delete this.clickTimers[postId];

      // Revert UI and do nothing — simulate "cancelled like"
      post.is_liked = false;
      post.like_count = Math.max(0, post.like_count - 1);
      buttonElement.classList.remove('liked');
      countElement.textContent = post.like_count;
      return;
    }

    // Optimistically update UI
    post.is_liked = !post.is_liked;
    post.like_count += post.is_liked ? 1 : -1;
    buttonElement.classList.toggle('liked', post.is_liked);
    countElement.textContent = post.like_count;

    // Start fast double-click window (e.g., 400ms)
    this.clickTimers[postId] = setTimeout(async () => {
      delete this.clickTimers[postId];

      if (this.likeLocks.has(postId)) return;
      this.likeLocks.add(postId);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');

        const userId = user.id;

        if (post.is_liked) {
          await supabase
            .from('likes')
            .insert([{ post_id: postId, profile_id: userId }])
            .select();

          await supabase.rpc('increment_like_count', { post_id: postId });
        } else {
          await supabase
            .from('likes')
            .delete()
            .eq('post_id', postId)
            .eq('profile_id', userId);

          await supabase.rpc('decrement_like_count', { post_id: postId });
        }
      } catch (err) {
        console.warn('Like error:', err.message || err);
        // Optionally revert if needed
      }

      this.likeLocks.delete(postId);
    }, 400); // Time window for detecting fast double-click
  }

  static showMoreOptions(e, post) {
    const isOwner = true; // Replace with actual owner check

    document.querySelectorAll('.more-options-popup').forEach(el => el.remove());

    const popup = document.createElement('div');
    popup.className = 'more-options-popup';
    popup.innerHTML = `
      <div class="more-options-content">
        ${isOwner ? `
          <div class="more-option edit-option"><i class="fas fa-edit"></i> Edit</div>
          <div class="more-option delete-option"><i class="fas fa-trash-alt"></i> Delete</div>
        ` : `
          <div class="more-option report-option"><i class="fas fa-flag"></i> Report</div>
        `}
      </div>
    `;

    document.body.appendChild(popup);

    const rect = e.target.getBoundingClientRect();
    popup.style.left = `${rect.left - 100}px`;
    popup.style.top = `${rect.top - 10}px`;

    const clickHandler = (event) => {
      if (!popup.contains(event.target)) {
        popup.remove();
        document.removeEventListener('click', clickHandler);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', clickHandler);
    }, 0);

    popup.querySelector('.edit-option')?.addEventListener('click', () => {
      console.log('Edit post', post.id);
      popup.remove();
    });

    popup.querySelector('.delete-option')?.addEventListener('click', () => {
      console.log('Delete post', post.id);
      popup.remove();
    });

    popup.querySelector('.report-option')?.addEventListener('click', () => {
      console.log('Report post', post.id);
      popup.remove();
    });
  }

  static sharePost(postId) {
    const postUrl = `${window.location.origin}/post.html?id=${postId}`;

    if (navigator.share) {
      navigator.share({
        title: 'Check out this post',
        url: postUrl
      }).catch(() => {
        this.copyToClipboard(postUrl);
      });
    } else {
      this.copyToClipboard(postUrl);
    }
  }

  static copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    });
  }
}
