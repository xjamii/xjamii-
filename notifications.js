let notificationAlert = null;
let notificationChannel = null;

// Initialize notifications after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeNotificationSystem();
});

async function initializeNotificationSystem() {
    await loadUnreadNotificationsCount();
    setupNotificationListener();

    // Load unread from localStorage (if any)
    const cached = localStorage.getItem('unreadNotifications');
    if (cached) {
        updateNotificationBadge(parseInt(cached));
    }
}

// Load unread count from Supabase
async function loadUnreadNotificationsCount() {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

        if (error) throw error;

        updateNotificationBadge(count || 0);
    } catch (error) {
        console.error('Error loading unread notifications:', error);
    }
}

// Enhanced real-time listener with proper cleanup
async function setupNotificationListener() {
    // Clean up previous channel if exists
    if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    notificationChannel = supabase
        .channel('notifications')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
            },
            async (payload) => {
                // Handle different event types
                switch(payload.eventType) {
                    case 'INSERT':
                        const currentCount = parseInt(localStorage.getItem('unreadNotifications') || 0);
                        updateNotificationBadge(currentCount + 1);
                        showNotificationAlert(payload.new.message || 'New notification received');
                        break;
                        
                    case 'UPDATE':
                        if (payload.new.read) {
                            const currentCount = parseInt(localStorage.getItem('unreadNotifications') || 0);
                            updateNotificationBadge(Math.max(0, currentCount - 1));
                        }
                        break;
                        
                    case 'DELETE':
                        // Optional: Handle notification deletions if needed
                        break;
                }
            }
        )
        .subscribe();

    // Add cleanup when page unloads
    window.addEventListener('beforeunload', () => {
        if (notificationChannel) {
            supabase.removeChannel(notificationChannel);
        }
    });
}

// Update the badge UI
function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = 'flex';
        badge.style.animation = 'pulse 1.5s infinite';
        localStorage.setItem('unreadNotifications', count);
        
        // Sync across tabs
        if (window.opener) {
            window.opener.postMessage({ type: 'updateNotificationBadge', count }, '*');
        }
    } else {
        badge.style.display = 'none';
        localStorage.removeItem('unreadNotifications');
    }
}

// Small popup alert
function showNotificationAlert(message) {
    if (notificationAlert) {
        notificationAlert.remove();
    }

    notificationAlert = document.createElement('div');
    notificationAlert.className = 'notification-alert';
    notificationAlert.innerHTML = `
        <div class="notification-alert-content">
            <i class="fas fa-bell"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notificationAlert);

    setTimeout(() => {
        notificationAlert.classList.add('show');
    }, 10);

    setTimeout(() => {
        notificationAlert.classList.remove('show');
        setTimeout(() => {
            notificationAlert.remove();
            notificationAlert = null;
        }, 300);
    }, 3000);
    
    // Play notification sound if available
    try {
        new Audio('/notification.mp3').play().catch(() => {});
    } catch (e) {
        console.log('Notification sound error:', e);
    }
}

// Optional: listen to cross-page sync
window.addEventListener('message', (event) => {
    if (event.data.type === 'updateNotificationBadge') {
        updateNotificationBadge(event.data.count);
    }
});

// Visibility change handler for refreshing counts
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        loadUnreadNotificationsCount();
    }
});
