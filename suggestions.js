// suggestions.js - Standalone user suggestions component

// Configuration
const BATCH_SIZE = 5; // Number of users to load at a time
let isLoading = false;
let allSuggestedUsers = [];
let displayedUsers = new Set(); // Track displayed users to avoid duplicates

// DOM Elements
const suggestionsScroll = document.getElementById('suggestionsScroll');
const suggestionsScrollContainer = document.getElementById('suggestionsScrollContainer');
const suggestionsLoading = document.getElementById('suggestionsLoading');

// Initialize the suggestions
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialSuggestions();
    setupInfiniteScroll();
});

// Load initial batch of suggestions
async function loadInitialSuggestions() {
    try {
        // Get current user ID
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) return;

        // Show loading state
        isLoading = true;
        suggestionsLoading.style.display = 'block';

        // Get users that current user is not following
        const { data: suggestedUsers, error } = await supabase.rpc('get_non_followed_users', {
            current_user_id: user.id,
            limit_count: BATCH_SIZE
        });

        if (error) throw error;

        // Store all suggested users
        allSuggestedUsers = suggestedUsers;
        
        // Display initial batch
        displayUsers(suggestedUsers);
        
        // Hide loading
        isLoading = false;
        suggestionsLoading.style.display = 'none';
    } catch (error) {
        console.error('Error loading suggestions:', error);
        isLoading = false;
        suggestionsLoading.style.display = 'none';
    }
}

// Display users in the scroll container
function displayUsers(users) {
    users.forEach(user => {
        // Skip if already displayed
        if (displayedUsers.has(user.id)) return;
        
        displayedUsers.add(user.id);
        
        const userElement = createUserElement(user);
        suggestionsScroll.appendChild(userElement);
    });
}

// Create a user element
function createUserElement(user) {
    const userElement = document.createElement('div');
    userElement.className = 'suggestion-item';
    
    // Profile picture (clickable)
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'suggestion-avatar-container';
    const avatar = document.createElement('img');
    avatar.className = 'suggestion-avatar';
    avatar.src = user.avatar_url || 'https://www.gravatar.com/avatar/?d=mp';
    avatar.alt = user.full_name || 'User';
    avatar.onclick = () => window.location.href = `profile.html?id=${user.id}`;
    avatarContainer.appendChild(avatar);
    
    // Add verification badge if verified
    if (user.is_verified) {
        const verifiedBadge = document.createElement('div');
        verifiedBadge.className = 'profile-verified-badge';
        verifiedBadge.title = 'Verified';
        avatarContainer.appendChild(verifiedBadge);
    }
    
    // User info (clickable)
    const userInfo = document.createElement('div');
    userInfo.className = 'suggestion-info';
    
    const userName = document.createElement('div');
    userName.className = 'suggestion-name';
    userName.textContent = truncateText(user.full_name || 'User', 15);
    userName.onclick = () => window.location.href = `profile.html?id=${user.id}`;
    
    const userUsername = document.createElement('div');
    userUsername.className = 'suggestion-username';
    userUsername.textContent = truncateText(`@${user.username}`, 15);
    userUsername.onclick = () => window.location.href = `profile.html?id=${user.id}`;
    
    userInfo.appendChild(userName);
    userInfo.appendChild(userUsername);
    
    // Follow button
    const followButton = document.createElement('button');
    followButton.className = 'suggestion-follow';
    followButton.textContent = 'Follow';
    followButton.onclick = (e) => handleFollowClick(e, user.id);
    
    // Assemble the element
    userElement.appendChild(avatarContainer);
    userElement.appendChild(userInfo);
    userElement.appendChild(followButton);
    
    return userElement;
}

// Handle follow button click
async function handleFollowClick(e, userId) {
    const button = e.target;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;
    
    try {
        if (button.classList.contains('following')) {
            // Unfollow logic
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', userId);
            
            if (error) throw error;
            
            button.classList.remove('following');
            button.textContent = 'Follow';
        } else {
            // Follow logic
            const { error } = await supabase
                .from('follows')
                .insert([
                    { 
                        follower_id: user.id, 
                        following_id: userId,
                        created_at: new Date().toISOString()
                    }
                ]);
            
            if (error) throw error;
            
            button.classList.add('following');
            button.textContent = 'Following';
        }
    } catch (error) {
        console.error('Error updating follow status:', error);
    }
}

// Setup infinite scroll
function setupInfiniteScroll() {
    suggestionsScrollContainer.addEventListener('scroll', async () => {
        const { scrollLeft, scrollWidth, clientWidth } = suggestionsScrollContainer;
        const scrollPosition = scrollLeft + clientWidth;
        
        // Load more when scrolled near the end
        if (scrollPosition > scrollWidth - 200 && !isLoading && allSuggestedUsers.length > 0) {
            await loadMoreSuggestions();
        }
    });
}

// Load more suggestions
async function loadMoreSuggestions() {
    if (isLoading) return;
    
    try {
        isLoading = true;
        suggestionsLoading.style.display = 'block';
        
        // Get current user ID
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) return;
        
        // Get next batch of users
        const { data: suggestedUsers, error } = await supabase.rpc('get_non_followed_users', {
            current_user_id: user.id,
            limit_count: BATCH_SIZE,
            excluded_ids: Array.from(displayedUsers)
        });
        
        if (error) throw error;
        
        // Add to all suggested users
        allSuggestedUsers = [...allSuggestedUsers, ...suggestedUsers];
        
        // Display new users
        displayUsers(suggestedUsers);
        
        isLoading = false;
        suggestionsLoading.style.display = 'none';
    } catch (error) {
        console.error('Error loading more suggestions:', error);
        isLoading = false;
        suggestionsLoading.style.display = 'none';
    }
}

// Helper function to truncate long text
function truncateText(text, maxLength) {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
