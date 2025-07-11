// Example of how to fetch posts with like status
async function fetchPosts() {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles!inner(*),
      likes(count),
      likes!inner(*)  // This gets the current user's like if it exists
    `)
    .eq('likes.profile_id', user?.id || '') // Filter for current user's likes
    .order('created_at', { ascending: false });

  if (error) throw error;
  return posts.map(post => ({
    ...post,
    like_count: post.likes[0]?.count || 0,
    is_liked: post.likes.length > 0 && post.likes.some(like => like.profile_id === user?.id)
  }));
}
