class PostActions {
  static async toggleLike(post) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return { success: false, error: 'Not authenticated' };
      }
      
      const currentUserId = user.id;
      const isCurrentlyLiked = post.is_liked;

      // Optimistic UI update
      this.updateLikeUI(post, !isCurrentlyLiked);

      if (!isCurrentlyLiked) {
        // Add like
        const { data, error } = await supabase
          .from('likes')
          .insert([{ post_id: post.id, profile_id: currentUserId }])
          .select();
        
        if (error) throw error;
        
        // Update the post's like count in the database
        await supabase.rpc('increment_like_count', { post_id: post.id });
        
        return { success: true, newLikeState: true };
      } else {
        // Remove like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', currentUserId);
        
        if (error) throw error;
        
        // Update the post's like count in the database
        await supabase.rpc('decrement_like_count', { post_id: post.id });
        
        return { success: true, newLikeState: false };
      }
    } catch (error) {
      // Revert optimistic UI update if API call failed
      this.updateLikeUI(post, post.is_liked);
      console.error('Error in toggleLike:', error);
      return { success: false, error: error.message };
    }
  }

  static updateLikeUI(post, isLiked) {
    const postElement = document.querySelector(`post-component[post-data*='"id":"${post.id}"']`);
    if (!postElement) return;

    const likeBtn = postElement.querySelector('.like-action');
    if (!likeBtn) return;

    // Update button state
    likeBtn.classList.toggle('liked', isLiked);
    const icon = likeBtn.querySelector('i');
    icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';

    // Get current like count
    const countEl = likeBtn.querySelector('span') || likeBtn.childNodes[2];
    if (!countEl) return;

    const currentCount = parseInt(countEl.textContent) || 0;
    const newCount = isLiked ? currentCount + 1 : currentCount - 1;

    // Create animation container
    const container = document.createElement('div');
    container.className = 'like-counter-animation';
    container.style.cssText = `
      display: inline-flex;
      flex-direction: column;
      overflow: hidden;
      height: 20px;
      vertical-align: middle;
    `;

    const oldNumber = document.createElement('div');
    oldNumber.textContent = currentCount;

    const newNumber = document.createElement('div');
    newNumber.textContent = newCount;

    container.appendChild(oldNumber);
    container.appendChild(newNumber);

    // Replace existing content with animation container
    const likeText = likeBtn.querySelector('.like-text') || document.createElement('span');
    likeText.className = 'like-text';
    likeBtn.innerHTML = '';
    likeBtn.appendChild(icon);
    likeBtn.appendChild(container);

    // Trigger animation
    setTimeout(() => {
      container.style.transform = `translateY(-20px)`;
      container.style.transition = `transform 0.3s ease-out`;
    }, 50);

    // Replace with final value after animation
    setTimeout(() => {
      if (likeBtn.isConnected) {
        likeBtn.innerHTML = `
          <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
          <span class="like-text">${newCount}</span>
        `;
      }
    }, 800);

    // Update post object
    post.is_liked = isLiked;
    post.like_count = newCount;
  }

  // ... rest of your existing PostActions code ...



  // ... rest of your existing PostActions code ...

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
