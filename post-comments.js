async toggleLike() {
  try {
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      alert('Please sign in to like comments');
      return;
    }

    // 2. Get current state
    const commentId = this.commentData.id;
    const isLiked = this.commentData.is_liked;
    const currentCount = this.commentData.like_count || 0;

    // 3. Optimistic UI update
    this.commentData.is_liked = !isLiked;
    this.commentData.like_count = isLiked ? currentCount - 1 : currentCount + 1;
    this.render();

    // 4. Database operation
    const { error } = isLiked
      ? await supabase.from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
      : await supabase.from('comment_likes')
          .insert({ 
            comment_id: commentId, 
            user_id: user.id 
          });

    if (error) throw error;

    // 5. Verify sync after 1s
    setTimeout(async () => {
      const { data } = await supabase
        .from('comments')
        .select('like_count')
        .eq('id', commentId)
        .single();

      if (data && data.like_count !== this.commentData.like_count) {
        this.commentData.like_count = data.like_count;
        this.render();
      }
    }, 1000);

  } catch (error) {
    console.error('Like operation failed:', error);
    
    // Revert UI on error
    this.commentData.is_liked = !this.commentData.is_liked;
    this.commentData.like_count = this.commentData.is_liked 
      ? this.commentData.like_count + 1 
      : this.commentData.like_count - 1;
    this.render();

    alert('Failed to update like. Please try again.');
  }
}
