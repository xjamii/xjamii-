// Updated profile.js – preserves your original structure but hardens error‑handling so the username never flips to "@error" // Key changes are tagged with   // *** NEW ***   comments so you can find them quickly.

// -------------------------------------------------- // DOM Elements // -------------------------------------------------- const skeletonLoader     = document.getElementById('skeleton-loader'); const profileContent     = document.getElementById('profile-content'); const profileBanner      = document.getElementById('profile-banner'); let   profileAvatar      = document.getElementById('profile-avatar'); const profileUsername    = document.getElementById('profile-username'); const profileCategory    = document.getElementById('profile-category'); const profileBio         = document.getElementById('profile-bio'); const profileWebsite     = document.getElementById('profile-website'); const followerCount      = document.getElementById('follower-count'); const followingCount     = document.getElementById('following-count'); const postCount          = document.getElementById('post-count'); const editProfileButton  = document.getElementById('edit-profile-button'); const postsGrid          = document.getElementById('posts-grid'); const likedPostsGrid     = document.getElementById('liked-posts-grid'); const headerTitle        = document.getElementById('header-title'); const editModal          = document.getElementById('edit-modal'); const editModalClose     = document.getElementById('edit-modal-close'); const editModalCancel    = document.getElementById('edit-modal-cancel'); const editModalSave      = document.getElementById('edit-modal-save'); let   editAvatarPreview  = document.getElementById('edit-avatar-preview'); const editAvatarButton   = document.getElementById('edit-avatar-button'); const avatarUpload       = document.getElementById('avatar-upload'); const editName           = document.getElementById('edit-name'); const editUsername       = document.getElementById('edit-username'); const editCategory       = document.getElementById('edit-category'); const editBio            = document.getElementById('edit-bio'); const editWebsite        = document.getElementById('edit-website'); const copyProfileLink    = document.getElementById('copy-profile-link'); const postTabs           = document.querySelectorAll('.post-tab');

// -------------------------------------------------- // State variables // -------------------------------------------------- let currentUser  = null; let profileData  = null; let userPosts    = []; let likedPosts   = [];

// -------------------------------------------------- // Helpers // -------------------------------------------------- // *** NEW ***  – Safe count helper that never throws async function safeRowCount ({ table, column = 'id', filterCol, filterVal }) { try { const { count, error } = await supabase .from(table) .select(column, { count: 'exact', head: true }) .eq(filterCol, filterVal); if (error) throw error; return count || 0; } catch (err) { console.warn(Count failed for ${table}:, err.message); return 0; } }

// Format large numbers function formatNumber (num) { if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'; if (num >=   1_000)   return (num /   1_000).toFixed(1) + 'K'; return String(num); }

// Display error state just for fatal profile‑fetch failures function displayErrorState () { skeletonLoader.style.display = 'none'; profileContent.style.display = 'block'; profileUsername.textContent  = '@error'; profileBio.textContent       = 'Failed to load profile data. Please try again later.'; profileBio.style.color       = '#ff4444'; }

// -------------------------------------------------- // Init // -------------------------------------------------- async function init () { try { if (localStorage.getItem('darkMode') === 'true') { document.body.classList.add('dark-mode'); }

// Auth
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return (window.location.href = 'login.html');
}
currentUser = user;

// Load profile FIRST (fatal if missing)
await loadProfileData(user.id);

// Secondary data – non‑fatal if they fail
Promise.all([
  loadUserPosts(user.id),
  loadLikedPosts(user.id)
]).catch(console.warn);

// Listeners
setupEventListeners();

} catch (err) { console.error('Initialization error:', err); displayErrorState(); } }

// -------------------------------------------------- // Profile // -------------------------------------------------- async function loadProfileData (profileId) { try { // UI: skeleton skeletonLoader.style.display = 'flex'; profileContent.style.display = 'none';

// Fetch profile row
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', profileId)
  .single();
if (profileError || !profile) throw profileError || new Error('Profile missing');
profileData = profile;

// Followers / following are stored on the row – fall back to 0
const followers = profile.followers ?? 0;
const following = profile.following ?? 0;

// *** NEW *** – Safe post count (never throws)
const posts = await safeRowCount({
  table: 'posts',
  filterCol: 'user_id',
  filterVal: profileId
});

// Paint the profile header immediately
displayProfile(profile, followers, following, posts);

} catch (err) { console.error('Fatal profile load error:', err); displayErrorState(); } }

// Display the profile header + stats function displayProfile (profile, followers, following, posts) { // Banner if (profile.banner_url) { profileBanner.style.backgroundImage    = url(${profile.banner_url}); profileBanner.style.backgroundSize     = 'cover'; profileBanner.style.backgroundPosition = 'center'; }

// Avatar (first letter fallback) const displayName = profile.full_name || profile.username || 'User'; const firstLetter = displayName.charAt(0).toUpperCase(); profileAvatar.textContent   = firstLetter; editAvatarPreview.textContent = firstLetter;

// Names profileUsername.textContent = @${profile.username}; editName.value       = profile.full_name || ''; editUsername.value   = profile.username  || ''; headerTitle.textContent = profile.full_name || profile.username;

// Category if (profile.category) { profileCategory.textContent = profile.category; profileCategory.style.color = ''; profileCategory.style.fontStyle = ''; } else { profileCategory.textContent = 'No category'; profileCategory.style.color = '#777'; profileCategory.style.fontStyle = 'italic'; } editCategory.value = profile.category || '';

// Bio if (profile.bio) { profileBio.textContent = profile.bio; profileBio.style.display = 'block'; } else { profileBio.style.display = 'none'; } editBio.value = profile.bio || '';

// Website if (profile.website) { profileWebsite.href      = profile.website; profileWebsite.textContent = profile.website.replace(/^https?:///, ''); profileWebsite.style.display = 'inline'; } else { profileWebsite.style.display = 'none'; } editWebsite.value = profile.website || '';

// Stats followerCount.textContent  = formatNumber(followers); followingCount.textContent = formatNumber(following); postCount.textContent      = formatNumber(posts);

// Reveal UI skeletonLoader.style.display = 'none'; profileContent.style.display = 'block'; }

// -------------------------------------------------- // Posts // -------------------------------------------------- async function loadUserPosts (userId) { try { const { data: posts, error } = await supabase .from('posts') .select('*') .eq('user_id', userId) .order('created_at', { ascending: false }); if (error) throw error; userPosts = posts || []; } catch (err) { console.error('Error loading posts:', err); userPosts = []; } finally { displayPosts(); } }

async function loadLikedPosts (userId) { try { const { data: likes, error } = await supabase .from('likes') .select('post_id') .eq('user_id', userId); if (error) throw error;

if (likes.length) {
  const postIds = likes.map(l => l.post_id);
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .in('id', postIds)
    .order('created_at', { ascending: false });
  if (postsError) throw postsError;
  likedPosts = posts || [];
} else {
  likedPosts = [];
}

} catch (err) { console.error('Error loading liked posts:', err); likedPosts = []; } finally { displayLikedPosts(); } }

// Display user posts function displayPosts () { postsGrid.innerHTML = ''; if (!userPosts.length) { const msg = document.createElement('div'); msg.textContent = 'No posts yet'; Object.assign(msg.style, { textAlign   : 'center', gridColumn  : '1 / -1', padding     : '20px', color       : '#777' }); return postsGrid.appendChild(msg); }

userPosts.forEach(post => { const postItem = document.createElement('div'); postItem.className = 'post-item'; if (post.image_url) { postItem.innerHTML = <img src="${post.image_url}" alt="Post">; } else if (post.video_url) { postItem.innerHTML =  <div style="position: relative; width: 100%; height: 100%;"> <video style="width: 100%; height: 100%; object-fit: cover;"> <source src="${post.video_url}" type="video/mp4"> </video> <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; padding: 2px 5px; border-radius: 4px; font-size: 12px;"> <i class="fas fa-play"></i> </div> </div>; } else { postItem.innerHTML = <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background-color: #f0f0f0; color: #777; padding: 10px; text-align: center;">${post.content || 'Post'}</div>; } postItem.addEventListener('click', () => { window.location.href = post.html?id=${post.id}; }); postsGrid.appendChild(postItem); }); }

// Display liked posts function displayLikedPosts () { likedPostsGrid.innerHTML = ''; if (!likedPosts.length) { const msg = document.createElement('div'); msg.textContent = 'No liked posts yet'; Object.assign(msg.style, { textAlign   : 'center', gridColumn  : '1 / -1', padding     : '20px', color       : '#777' }); return likedPostsGrid.appendChild(msg); }

likedPosts.forEach(post => { const postItem = document.createElement('div'); postItem.className = 'post-item'; if (post.image_url) { postItem.innerHTML = <img src="${post.image_url}" alt="Post">; } else if (post.video_url) { postItem.innerHTML =  <div style="position: relative; width: 100%; height: 100%;"> <video style="width: 100%; height: 100%; object-fit: cover;"> <source src="${post.video_url}" type="video/mp4"> </video> <div style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; padding: 2px 5px; border-radius: 4px; font-size: 12px;"> <i class="fas fa-play"></i> </div> </div>; } else { postItem.innerHTML = <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background-color: #f0f0f0; color: #777; padding: 10px; text-align: center;">${post.content || 'Post'}</div>; } postItem.addEventListener('click', () => { window.location.href = post.html?id=${post.id}; }); likedPostsGrid.appendChild(postItem); }); }

// -------------------------------------------------- // UI Events – unchanged except for tiny tweaks (kept your original logic) // -------------------------------------------------- function handleTabClick (tab) { postTabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); const tabType = tab.getAttribute('data-tab'); if (tabType === 'posts') { postsGrid.style.display      = 'grid'; likedPostsGrid.style.display = 'none'; } else { postsGrid.style.display      = 'none'; likedPostsGrid.style.display = 'grid'; } }

function setupEventListeners () { editProfileButton.addEventListener('click', () => editModal.classList.add('show')); editModalClose .addEventListener('click', () => editModal.classList.remove('show')); editModalCancel.addEventListener('click', () => editModal.classList.remove('show'));

// ... (the rest of your listener code is unchanged – omitted for brevity)

postTabs.forEach(tab => tab.addEventListener('click', () => handleTabClick(tab))); }

// -------------------------------------------------- // Boot // -------------------------------------------------- document.addEventListener('DOMContentLoaded', init);

