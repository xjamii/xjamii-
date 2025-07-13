class PostActions {
  static async toggleLike(post) {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return { success: false, error: 'Not authenticated' };
      }
      
      const currentUserId = user.id;
      const shouldLike = !post.is_liked;

      // Handle like action
      if (shouldLike) {
        // First check if like already exists
        const { data: existingLike } = await supabase
          .from('likes')
          .select()
          .eq('post_id', post.id)
          .eq('profile_id', currentUserId)
          .maybeSingle();

        // If like already exists, return current state
        if (existingLike) {
          return { success: true, newLikeState: true };
        }

        // Add new like
        const { error } = await supabase
          .from('likes')
          .insert([{ post_id: post.id, profile_id: currentUserId }]);
        
        if (!error) {
          await supabase.rpc('increment_like_count', { post_id: post.id });
          return { success: true, newLikeState: true };
        }
      } 
      // Handle unlike action
      else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', currentUserId);
        
        if (!error) {
          await supabase.rpc('decrement_like_count', { post_id: post.id });
          return { success: true, newLikeState: false };
        }
      }

      // Default return (if no error but operation didn't complete)
      return { success: true, newLikeState: post.is_liked };
    } catch (err) {
      console.error('Silent like error:', err);
      return { success: true, newLikeState: post.is_liked };
    }
  }

  static showMoreOptions(e, post) {
    const isOwner = true; // Replace with actual owner check
    
    // Remove any existing popups
    document.querySelectorAll('.more-options-popup').forEach(el => el.remove());
    
    // Create new popup
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
    
    // Position and show popup
    document.body.appendChild(popup);
    const rect = e.target.getBoundingClientRect();
    popup.style.left = `${rect.left - 100}px`;
    popup.style.top = `${rect.top - 10}px`;
    
    // Close popup when clicking outside
    const clickHandler = (event) => {
      if (!popup.contains(event.target)) {
        popup.remove();
        document.removeEventListener('click', clickHandler);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', clickHandler);
    }, 0);
    
    // Setup option click handlers
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
