// notification.js
let notificationAlert = null;
let notificationChannel = null;

export async function initNotificationSystem(supabase, userId, onCountUpdate) {
  if (!userId) return;

  // Clear existing channel if it exists
  if (notificationChannel) {
    supabase.removeChannel(notificationChannel);
  }

  notificationChannel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const currentCount = parseInt(localStorage.getItem('unreadNotifications') || '0');
        const newCount = currentCount + 1;
        localStorage.setItem('unreadNotifications', newCount);

        if (typeof onCountUpdate === 'function') {
          onCountUpdate(newCount);
        }

        showNotificationAlert(payload.new.message || 'You have a new notification');
      }
    )
    .subscribe();
}

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
}
