// notifications.js - Standalone notifications functionality

// Load unread notifications count
async function loadUnreadNotificationsCount() {
    try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (!user) return;
        
        // Count unread notifications
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
            
        if (error) throw error;
        
        // Update badge
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = count > 0 ? count : '';
        }
    } catch (error) {
        console.error('Error loading notifications count:', error);
    }
}

// Function to get initials from name or username
function getInitials(name) {
    if (!name) return '';
    
    // Split by space and get first letters of first two words
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    
    // If only one word, get first two letters
    if (name.length >= 2) {
        return name.substring(0, 2).toUpperCase();
    }
    
    // If very short, just return as is
    return name.toUpperCase();
}

// Load notifications
async function loadNotifications() {
    try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (!user) {
            hideNotifications();
            return;
        }
        
        // Get notifications with profile data
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select(`
                id,
                type,
                is_read,
                created_at,
                actor_id,
                post_id,
                comment_id,
                message_id,
                profiles:actor_id (username, full_name, avatar_url, is_verified)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
            
        if (error) throw error;
        
        // Render notifications
        renderNotifications(notifications);
        
        // Mark as read
        if (notifications.some(n => !n.is_read)) {
            await markNotificationsAsRead(notifications.filter(n => !n.is_read).map(n => n.id));
            loadUnreadNotificationsCount(); // Update badge
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        renderError();
    } finally {
        // Hide skeleton and show content
        document.getElementById('notificationsSkeleton').style.display = 'none';
        document.getElementById('notificationsContainer').style.display = 'block';
    }
}

// Render notifications
function renderNotifications(notifications) {
    const container = document.getElementById('notificationsContainer');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="no-notifications">
                <i class="fas fa-bell-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p>No notifications yet</p>
                <p style="font-size: 14px; margin-top: 5px;">When you get notifications, they'll show up here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => {
        const profile = notification.profiles;
        const timeAgo = formatTimeAgo(notification.created_at);
        let message = '';
        let action = '';
        
        // Determine notification message based on type
        switch (notification.type) {
            case 'follow':
                message = `${profile.full_name || profile.username} started following you`;
                action = `<button class="notification-action-btn follow">Follow back</button>`;
                break;
            case 'like':
                message = `${profile.full_name || profile.username} liked your post`;
                action = `<button class="notification-action-btn view">View post</button>`;
                break;
            case 'comment':
                message = `${profile.full_name || profile.username} commented on your post`;
                action = `<button class="notification-action-btn view">View post</button>`;
                break;
            case 'comment_like':
                message = `${profile.full_name || profile.username} liked your comment`;
                action = `<button class="notification-action-btn view">View comment</button>`;
                break;
            case 'message':
                message = `${profile.full_name || profile.username} sent you a message`;
                action = `<button class="notification-action-btn view">View message</button>`;
                break;
            default:
                message = `You have a new notification`;
        }
        
        // Generate initials if no avatar
        const avatarContent = profile.avatar_url 
            ? `<img src="${profile.avatar_url}" alt="${profile.username}" class="notification-avatar">`
            : `<div class="notification-avatar initials">${getInitials(profile.full_name || profile.username)}</div>`;
        
        return `
            <div class="notification-item ${notification.is_read ? '' : 'unread'}" data-id="${notification.id}">
                ${avatarContent}
                <div class="notification-content">
                    <div class="notification-text">
                        <strong>${profile.full_name || profile.username}</strong> ${message}
                        ${profile.is_verified ? '<span class="verified-badge"><i class="fas fa-check"></i></span>' : ''}
                    </div>
                    <div class="notification-time">${timeAgo}</div>
                    <div class="notification-action">${action}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to action buttons
    container.querySelectorAll('.notification-action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const notificationItem = this.closest('.notification-item');
            const notificationId = notificationItem.dataset.id;
            
            if (this.classList.contains('follow')) {
                handleFollowAction(notificationItem);
            } else if (this.classList.contains('view')) {
                handleViewAction(notificationItem);
            }
        });
    });
    
    // Add click handler to notification items
    container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            // Handle notification click (e.g., navigate to post/message)
            console.log('Notification clicked:', this.dataset.id);
        });
    });
}

// Format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// Mark notifications as read
async function markNotificationsAsRead(notificationIds) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', notificationIds);
            
        if (error) throw error;
    } catch (error) {
        console.error('Error marking notifications as read:', error);
    }
}

// Handle follow action
async function handleFollowAction(notificationItem) {
    try {
        const notificationId = notificationItem.dataset.id;
        const { data: notification, error: notifError } = await supabase
            .from('notifications')
            .select('actor_id')
            .eq('id', notificationId)
            .single();
            
        if (notifError || !notification) throw notifError || new Error('Notification not found');
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (!user) return;
        
        // Follow the user
        const { error } = await supabase
            .from('follows')
            .insert({
                follower_id: user.id,
                following_id: notification.actor_id,
                relationship_type: 'regular'
            });
            
        if (error) throw error;
        
        // Update UI
        const btn = notificationItem.querySelector('.notification-action-btn');
        btn.textContent = 'Following';
        btn.classList.remove('follow');
        btn.classList.add('view');
        btn.disabled = true;
        
    } catch (error) {
        console.error('Error handling follow action:', error);
        alert('Failed to follow user. Please try again.');
    }
}

// Handle view action
function handleViewAction(notificationItem) {
    const notificationId = notificationItem.dataset.id;
    // Here you would navigate to the relevant post/message
    console.log('View action for notification:', notificationId);
}

// Render error state
function renderError() {
    const container = document.getElementById('notificationsContainer');
    container.innerHTML = `
        <div class="no-notifications">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>Failed to load notifications</p>
            <button onclick="loadNotifications()" style="margin-top: 10px; padding: 8px 16px; background-color: #00B0FF; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Try Again
            </button>
        </div>
    `;
}

// Initialize notifications
document.addEventListener('DOMContentLoaded', () => {
    // Check for unread notifications periodically
    setInterval(loadUnreadNotificationsCount, 30000); // Every 30 seconds
    
    // Initial load
    loadUnreadNotificationsCount();
});
