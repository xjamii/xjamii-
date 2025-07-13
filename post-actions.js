class PostActions {
  // Track pending like operations to handle rapid clicks
  static pendingLikes = new Map();

  static async toggleLike(post) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        return { success: false, error: 'Not authenticated' };
      }
      
      const currentUserId = user.id;
      const targetState = !post.is_liked;

      // Store the latest requested state
      this.pendingLikes.set(post.id, targetState);

      // Small delay to catch rapid successive clicks
      await new Promise(resolve => setTimeout(resolve, 50));

      // If another click changed the target state, use that instead
      const finalTargetState = this.pendingLikes.get(post.id);
      if (finalTargetState !== targetState) {
        return { success: true, newLikeState: finalTargetState };
      }

      // Use upsert to handle potential conflicts silently
      if (finalTargetState) {
        const { error } = await supabase
          .from('likes')
          .upsert(
            { post_id: post.id, profile_id: currentUserId },
            { onConflict: 'post_id,profile_id' }
          );
        
        if (!error) {
          await supabase.rpc('increment_like_count', { post_id: post.id });
        }
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', currentUserId);
        
        if (!error) {
          await supabase.rpc('decrement_like_count', { post_id: post.id });
        }
      }

      return { success: true, newLikeState: finalTargetState };
    } catch (err) {
      console.error('Like operation error:', err);
      // Fail silently and return current state
      return { success: true, newLikeState: post.is_liked };
    } finally {
      this.pendingLikes.delete(post.id);
    }
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
      }).catch(err => {
        console.log('Error sharing:', err);
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
