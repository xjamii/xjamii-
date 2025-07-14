class PostActions {
  static async toggleLike(post) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        this.showErrorToast('Please login to like posts');
        return { success: false, error: 'Not authenticated' };
      }
      
      const currentUserId = user.id;

      if (!post.is_liked) {
        const { data, error } = await supabase
          .from('likes')
          .insert([{ post_id: post.id, profile_id: currentUserId }])
          .select();
        
        if (error) {
          if (error.code === '23505') { // Unique violation error code
            console.log('User already liked this post');
            this.showErrorToast('You already liked this post');
            return { success: false, error: 'Already liked' };
          }
          console.error('Like insertion error:', error);
          throw error;
        }
        
        console.log('Like added successfully:', data);
        await supabase.rpc('increment_like_count', { post_id: post.id });
        return { success: true, newLikeState: true };
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', currentUserId);
        
        if (error) {
          console.error('Like deletion error:', error);
          throw error;
        }
        
        console.log('Like removed successfully');
        await supabase.rpc('decrement_like_count', { post_id: post.id });
        return { success: true, newLikeState: false };
      }
    } catch (err) {
      console.error('Error in toggleLike:', err);
      this.showErrorToast('Failed to update like. Please try again.');
      return { success: false, error: err.message };
    }
  }

  static showErrorToast(message) {
    // Remove any existing error toasts
    document.querySelectorAll('.error-toast').forEach(el => el.remove());
    
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Make toast visible
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

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
