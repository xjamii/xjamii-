// Suggestions functionality
let isLoadingSuggestions = false;
let lastUserId = null;

// Function to load suggestions
async function loadSuggestions(initialLoad = false) {
    if (isLoadingSuggestions) return;
    
    isLoadingSuggestions = true;
    
    // Show loader if not initial load
    if (!initialLoad) {
        document.getElementById('suggestionsLoader').style.display = 'block';
    } else {
        // Show skeleton loaders for initial load
        const suggestionsScroll = document.getElementById('suggestionsScroll');
        suggestionsScroll.innerHTML = '';
        
        // Add 5 skeleton loaders
        for (let i = 0; i < 5; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'suggestion-skeleton';
            skeleton.innerHTML = `
                <div class="suggestion-skeleton-avatar"></div>
                <div class="suggestion-info">
                    <div class="suggestion-skeleton-name"></div>
                    <div class="suggestion-skeleton-username"></div>
                </div>
                <div class="suggestion-skeleton-button"></div>
            `;
            suggestionsScroll.appendChild(skeleton);
        }
    }
    
    try {
        // Get current user ID
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        // Query to get users not followed by current user
        let query = supabase
            .from('users')
            .select('id, email, raw_user_meta_data')
            .neq('id', user.id) // Exclude current user
            .order('created_at', { ascending: false })
            .limit(10);
        
        // If this is a subsequent load, get users after the last one
        if (lastUserId && !initialLoad) {
            query = query.lt('id', lastUserId);
        }
        
        const { data: users, error } = await query;
        
        if (error) throw error;
        
        // Get users that current user is following
        const { data: following, error: followingError } = await supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', user.id);
        
        if (followingError) throw followingError;
        
        const followingIds = following.map(f => f.followed_id);
        
        // Filter out users that current user is already following
        const filteredUsers = users.filter(user => !followingIds.includes(user.id));
        
        // Update last user ID for pagination
        if (filteredUsers.length > 0) {
            lastUserId = filteredUsers[filteredUsers.length - 1].id;
        }
        
        // If initial load, clear skeletons
        if (initialLoad) {
            document.getElementById('suggestionsScroll').innerHTML = '';
        }
        
        // Add users to suggestions
        filteredUsers.forEach(user => {
            addSuggestionItem(user);
        });
        
        // If no suggestions, show message
        if (initialLoad && filteredUsers.length === 0) {
            document.getElementById('suggestionsScroll').innerHTML = `
                <div style="width: 100%; text-align: center; padding: 20px; color: #777;">
                    No suggestions available
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading suggestions:', error);
        
        // Show error message if initial load
        if (initialLoad) {
            document.getElementById('suggestionsScroll').innerHTML = `
                <div style="width: 100%; text-align: center; padding: 20px; color: #ff0000;">
                    Failed to load suggestions
                </div>
            `;
        }
    } finally {
        isLoadingSuggestions = false;
        document.getElementById('suggestionsLoader').style.display = 'none';
    }
}

// Function to add a suggestion item
function addSuggestionItem(user) {
    const suggestionsScroll = document.getElementById('suggestionsScroll');
    
    const suggestionItem = document.createElement('div');
    suggestionItem.className = 'suggestion-item';
    
    // Extract user details from raw_user_meta_data or use email as fallback
    const userMeta = user.raw_user_meta_data || {};
    const fullName = userMeta.name || userMeta.full_name || user.email.split('@')[0];
    const username = userMeta.username || userMeta.preferred_username || user.email.split('@')[0];
    const avatarUrl = userMeta.avatar_url || userMeta.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
    const isVerified = userMeta.verified || false;
    
    // Handle long names and usernames
    const displayName = fullName.length > 15 
        ? fullName.substring(0, 15) + '...' 
        : fullName;
    
    const displayUsername = username.length > 15 
        ? '@' + username.substring(0, 12) + '...' 
        : '@' + username;
    
    suggestionItem.innerHTML = `
        <div class="suggestion-avatar-container" onclick="window.location.href='profile.html?id=${user.id}'">
            <img src="${avatarUrl}" 
                 alt="${fullName}" 
                 class="suggestion-avatar"
                 onerror="this.src='https://www.gravatar.com/avatar/?d=mp'">
            ${isVerified ? '<div class="profile-verified-badge" title="Verified"></div>' : ''}
        </div>
        <div class="suggestion-info">
            <div class="suggestion-name" onclick="window.location.href='profile.html?id=${user.id}'">
                ${displayName}
            </div>
            <div class="suggestion-username" onclick="window.location.href='profile.html?id=${user.id}'">
                ${displayUsername}
            </div>
        </div>
        <button class="suggestion-follow" data-user-id="${user.id}">Follow</button>
    `;
    
    suggestionsScroll.appendChild(suggestionItem);
}

// Rest of the code remains the same...
document.addEventListener('DOMContentLoaded', () => {
    // Load initial suggestions
    loadSuggestions(true);
    
    // Setup follow button event delegation
    document.getElementById('suggestionsContainer').addEventListener('click', handleFollow);
    
    // Setup infinite scroll
    setupSuggestionsScroll();
});
