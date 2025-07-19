// Initialize variables
let currentUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;
        
        currentUserId = user.id;

        // Load suggestions
        await loadSuggestions();
        
        // Set up real-time updates for connection status changes
        setupConnectionUpdates();
    } catch (error) {
        console.error('Suggestions initialization error:', error);
    }
});

async function loadSuggestions() {
    const scroller = document.getElementById('suggestions-scroller');
    if (!scroller) return;

    try {
        // Show loading state
        scroller.innerHTML = '<div class="loading-spinner"></div>';

        // Get suggested profiles
        const { data: profiles, error } = await supabase.rpc('get_suggested_profiles', {
            current_user_id: currentUserId,
            limit_count: 15
        });

        if (error) throw error;
        if (!profiles || profiles.length === 0) {
            scroller.innerHTML = '<div class="no-suggestions">No suggestions available</div>';
            return;
        }

        // Clear existing suggestions
        scroller.innerHTML = '';

        // Add each profile to the scroller
        profiles.forEach(profile => {
            const profileElement = createSuggestionElement(profile);
            scroller.appendChild(profileElement);
        });

        // Update connection statuses
        await updateConnectionStatuses(profiles);
    } catch (error) {
        console.error('Error loading suggestions:', error);
        scroller.innerHTML = '<div class="error-message">Failed to load suggestions</div>';
    }
}

function createSuggestionElement(profile) {
    const isCurrentUser = currentUserId === profile.id;
    const avatarUrl = profile.avatar_url || getInitialsAvatar(profile.full_name);

    const element = document.createElement('div');
    element.className = 'suggestion-item';
    element.dataset.userId = profile.id;

    element.innerHTML = `
        <a href="profile.html?id=${profile.id}" class="suggestion-link">
            <img src="${avatarUrl}" 
                 class="suggestion-avatar" 
                 onerror="this.src='${getInitialsAvatar(profile.full_name)}'">
            <div class="suggestion-name-wrap">
    <span class="suggestion-name-text">
        ${profile.full_name?.split(' ')[0] || 'User'}
    </span>
    ${profile.is_verified ? '<i class="fas fa-check-circle verified-badge"></i>' : ''}
</div>
<div class="suggestion-username-text">@${profile.username || 'user'}</div>
        </a>
        ${isCurrentUser ? '' : `
            <div class="suggestion-connect">
                <button class="suggestion-connect-btn" data-user-id="${profile.id}">Connect</button>
            </div>
        `}
    `;

    if (!isCurrentUser) {
        const connectBtn = element.querySelector('.suggestion-connect-btn');
        connectBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const userId = e.currentTarget.dataset.userId;
            await handleConnection(userId, e.currentTarget);
        });
    }

    return element;
}

async function updateConnectionStatuses(profiles) {
    if (!currentUserId) return;
    
    try {
        const { data: connections, error } = await supabase
            .from('connections')
            .select('*')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.in.(${profiles.map(p => `"${p.id}"`).join(',')})),and(sender_id.in.(${profiles.map(p => `"${p.id}"`).join(',')}),receiver_id.eq.${currentUserId})`);
        
        if (error) throw error;

        profiles.forEach(profile => {
            if (profile.id === currentUserId) return;
            
            const connection = connections?.find(c => 
                (c.sender_id === currentUserId && c.receiver_id === profile.id) ||
                (c.sender_id === profile.id && c.receiver_id === currentUserId)
            );
            
            const connectBtn = document.querySelector(`.suggestion-connect-btn[data-user-id="${profile.id}"]`);
            if (!connectBtn) return;
            
            updateButtonState(connectBtn, connection);
        });
    } catch (error) {
        console.error('Error updating connection statuses:', error);
    }
}

function updateButtonState(button, connection) {
    if (connection) {
        if (connection.status === 'pending') {
            if (connection.sender_id === currentUserId) {
                button.textContent = 'Pending';
                button.classList.add('pending');
                button.classList.remove('connected');
            } else {
                button.textContent = 'Accept';
                button.classList.remove('pending', 'connected');
            }
        } else if (connection.status === 'accepted') {
            button.textContent = 'Connected';
            button.classList.add('connected');
            button.classList.remove('pending');
        }
    } else {
        button.textContent = 'Connect';
        button.classList.remove('pending', 'connected');
    }
}

async function handleConnection(userId, button) {
    try {
        if (!currentUserId) {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                window.location.href = 'login.html';
                return;
            }
            currentUserId = user.id;
        }
        
        // Check existing connection
        const { data: connection, error: connectionError } = await supabase
            .from('connections')
            .select('id, sender_id, status')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
            .single();
        
        if (connectionError && connectionError.code !== 'PGRST116') throw connectionError;
        
        // Handle different connection states
        if (connection) {
            if (connection.status === 'pending') {
                if (connection.sender_id === currentUserId) {
                    // Cancel pending request
                    await supabase.from('connections').delete().eq('id', connection.id);
                    updateButtonState(button, null);
                } else {
                    // Accept connection
                    await supabase.from('connections')
                        .update({ status: 'accepted' })
                        .eq('id', connection.id);
                    updateButtonState(button, { ...connection, status: 'accepted' });
                }
            } else {
                // Remove connection
                await supabase.from('connections').delete().eq('id', connection.id);
                updateButtonState(button, null);
            }
        } else {
            // Create new connection
            await supabase.from('connections').insert([{
                sender_id: currentUserId,
                receiver_id: userId,
                status: 'pending'
            }]);
            updateButtonState(button, { 
                sender_id: currentUserId, 
                receiver_id: userId, 
                status: 'pending' 
            });
        }
    } catch (error) {
        console.error('Connection error:', error);
        alert('Failed to update connection. Please try again.');
    }
}

function getInitialsAvatar(name) {
    const initials = name ? 
        name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
    return `data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%230056b3'/><text x='50%' y='50%' font-size='40' fill='white' text-anchor='middle' dy='.3em'>${initials}</text></svg>`;
}

function setupConnectionUpdates() {
    // Listen for real-time connection changes
    const channel = supabase
        .channel('suggestions-connections')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'connections',
            filter: `or(sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId})`
        }, async (payload) => {
            // Refresh suggestions when connection changes
            await loadSuggestions();
        })
        .subscribe();
    
    return channel;
}

// Refresh suggestions periodically (every 5 minutes)
setInterval(() => {
    if (currentUserId) {
        loadSuggestions();
    }
}, 300000);
