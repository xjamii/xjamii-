class PostActions {
  // Track ongoing like operations to prevent duplicates
  static likeOperations = new Map();

  static async toggleLike(post) {
    try {
      // Check if there's already an ongoing operation for this post
      if (this.likeOperations.has(post.id)) {
        console.log('Like operation already in progress for post', post.id);
        return { success: false, error: 'Operation in progress' };
      }

      // Mark this post as having an ongoing operation
      this.likeOperations.set(post.id, true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Authentication error:', authError);
        this.likeOperations.delete(post.id);
        return { success: false, error: 'Not authenticated' };
      }
      
      const currentUserId = user.id;
      console.log(`Toggling like for post ${post.id} by user ${currentUserId}`);

      let result;
      
      if (!post.is_liked) {
        // First check if like already exists (race condition protection)
        const { data: existingLike, error: checkError } = await supabase
          .from('likes')
          .select()
          .eq('post_id', post.id)
          .eq('profile_id', currentUserId)
          .maybeSingle();

        if (checkError) {
          console.error('Like check error:', checkError);
          throw checkError;
        }

        if (existingLike) {
          console.log('Like already exists, no action needed');
          result = { success: true, newLikeState: true };
        } else {
          const { data, error } = await supabase
            .from('likes')
            .insert([{ post_id: post.id, profile_id: currentUserId }])
            .select();
          
          if (error) {
            console.error('Like insertion error:', error);
            throw error;
          }
          console.log('Like added successfully:', data);
          
          await supabase.rpc('increment_like_count', { post_id: post.id });
          result = { success: true, newLikeState: true };
        }
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
        result = { success: true, newLikeState: false };
      }

      return result;
    } catch (err) {
      console.error('Error in toggleLike:', {
        message: err.message,
        code: err.code,
        details: err.details
      });
      return { success: false, error: err.message };
    } finally {
      // Always clear the operation flag when done
      this.likeOperations.delete(post.id);
    }
  }

  // Rest of the methods remain exactly the same as in your original code
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
