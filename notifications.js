// notifications.js - Complete Implementation with Cloudinary

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dwwhpznwb';
const CLOUDINARY_UPLOAD_PRESET = 'web_unsigned_upload';

// Initialize real-time listener
let notificationsChannel;

// Main notifications loader
async function loadNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch notifications with related data
    const { data, error } = await supabase
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
        profiles:actor_id (username, full_name, avatar_url, is_verified),
        posts!inner(id, content),
        comments!inner(content),
        messages!inner(content)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    renderNotifications(data || []);
    setupRealTimeUpdates(user.id);

  } catch (error) {
    console.error("Error loading notifications:", error);
    renderError();
  }
}

// Real-time updates setup
function setupRealTimeUpdates(userId) {
  if (notificationsChannel) supabase.removeChannel(notificationsChannel);

  notificationsChannel = supabase
    .channel('notifications-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, handleNotificationChange)
    .subscribe();
}

// Handle notification changes
function handleNotificationChange(payload) {
  switch(payload.eventType) {
    case 'INSERT':
      handleNewNotification(payload.new);
      break;
    case 'UPDATE':
      if (payload.new.is_read) {
        markNotificationAsReadUI(payload.new.id);
      }
      break;
  }
}

// Handle new notifications
function handleNewNotification(notification) {
  // Update UI immediately
  addNotificationToUI(notification);
  
  // Update unread count
  updateUnreadCount();
  
  // Play sound if app is visible
  if (document.visibilityState === 'visible') {
    new Audio('/notification-sound.mp3').play().catch(() => {});
  }
}

// Render notifications list
function renderNotifications(notifications) {
  const container = document.getElementById('notifications-container');
  if (!notifications.length) {
    container.innerHTML = `<div class="empty-state">No notifications yet</div>`;
    return;
  }

  container.innerHTML = notifications.map(notif => `
    <div class="notification ${notif.is_read ? '' : 'unread'}" 
         data-id="${notif.id}"
         data-type="${notif.type}"
         ${notif.post_id ? `data-post-id="${notif.post_id}"` : ''}
         ${notif.comment_id ? `data-comment-id="${notif.comment_id}"` : ''}
         ${notif.message_id ? `data-message-id="${notif.message_id}"` : ''}>
      ${renderAvatar(notif.profiles)}
      <div class="content">
        <div class="text">
          ${generateNotificationText(notif)}
          ${notif.profiles.is_verified ? verifiedBadge() : ''}
        </div>
        <div class="time">${formatTimeAgo(notif.created_at)}</div>
        ${renderActionButton(notif)}
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.notification').forEach(el => {
    el.addEventListener('click', handleNotificationClick);
  });
}

// Generate notification text
function generateNotificationText(notification) {
  const name = notification.profiles.full_name || notification.profiles.username;
  const baseText = `<strong>${name}</strong> `;
  
  const messages = {
    'like': `${baseText} liked your post`,
    'comment': `${baseText} commented: "${notification.comments?.content || ''}"`,
    'comment_like': `${baseText} liked your comment`,
    'follow': `${baseText} started following you`,
    'message': `${baseText} sent you a message: "${notification.messages?.content?.substring(0, 30) || ''}..."`
  };
  
  return messages[notification.type] || `${baseText} interacted with your content`;
}

// Render avatar with Cloudinary optimization
function renderAvatar(profile) {
  if (!profile) return fallbackAvatar();
  
  const initials = getInitials(profile.full_name || profile.username);
  const bgColor = stringToColor(profile.username);
  
  if (profile.avatar_url) {
    // Use Cloudinary for optimized avatars
    const cloudinaryUrl = profile.avatar_url.includes('res.cloudinary.com')
      ? profile.avatar_url.replace('/upload/', '/upload/w_100,h_100,c_fill,g_face/')
      : `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_100,h_100,c_fill,g_face/${profile.avatar_url}`;
    
    return `<img src="${cloudinaryUrl}" alt="${profile.username}" class="avatar" 
              onerror="this.onerror=null;this.parentNode.innerHTML='${fallbackAvatar(initials, bgColor)}'">`;
  }
  
  return fallbackAvatar(initials, bgColor);
}

// Helper functions
function fallbackAvatar(initials = '??', bgColor = '#666') {
  return `<div class="avatar-fallback" style="background-color: ${bgColor}">${initials}</div>`;
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.split(' ');
  return parts.length > 1 
    ? `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 65%)`;
}

function renderActionButton(notification) {
  const actions = {
    'like': 'View Post',
    'comment': 'View Post',
    'comment_like': 'View Comment',
    'follow': 'View Profile',
    'message': 'Reply'
  };
  
  if (actions[notification.type]) {
    return `<button class="action-btn" data-action="${notification.type}">
      ${actions[notification.type]}
    </button>`;
  }
  return '';
}

// Handle notification clicks
function handleNotificationClick(event) {
  const notification = event.currentTarget;
  const type = notification.dataset.type;
  const id = notification.dataset.id;

  // Mark as read
  supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  // Handle different types
  switch(type) {
    case 'like':
    case 'comment':
      openPost(notification.dataset.postId);
      break;
    case 'comment_like':
      openComment(notification.dataset.commentId);
      break;
    case 'follow':
      openProfile(notification.dataset.actorId);
      break;
    case 'message':
      openChat(notification.dataset.actorId, notification.dataset.messageId);
      break;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();
  setInterval(loadUnreadCount, 30000); // Refresh count every 30s
  
  // Initialize Cloudinary upload widget if needed
  if (document.getElementById('avatar-upload-btn')) {
    initCloudinaryUpload();
  }
});

// Cloudinary upload helper
function initCloudinaryUpload() {
  window.cloudinary.createUploadWidget(
    {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      cropping: true,
      croppingAspectRatio: 1,
      showSkipCropButton: false,
      folder: 'user_avatars'
    },
    (error, result) => {
      if (result?.event === 'success') {
        updateUserAvatar(result.info.secure_url);
      }
    }
  ).attach('#avatar-upload-btn');
}

async function updateUserAvatar(url) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', user.id);
}

// Unread count management
let unreadCount = 0;

async function loadUnreadCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  updateUnreadBadge(count || 0);
}

function updateUnreadBadge(count) {
  unreadCount = count;
  const badge = document.getElementById('notification-badge');
  if (badge) {
    badge.textContent = count > 0 ? (count > 9 ? '9+' : count) : '';
    badge.classList.toggle('hidden', count === 0);
  }
}

// UI Helpers
function addNotificationToUI(notification) {
  const container = document.getElementById('notifications-container');
  if (!container) return;

  // If empty state exists, remove it
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  // Prepend new notification
  container.insertAdjacentHTML('afterbegin', `
    <div class="notification unread" 
         data-id="${notification.id}"
         data-type="${notification.type}"
         ${notification.post_id ? `data-post-id="${notification.post_id}"` : ''}
         ${notification.comment_id ? `data-comment-id="${notification.comment_id}"` : ''}
         ${notification.message_id ? `data-message-id="${notification.message_id}"` : ''}>
      ${renderAvatar(notification.profiles)}
      <div class="content">
        <div class="text">
          ${generateNotificationText(notification)}
          ${notification.profiles?.is_verified ? verifiedBadge() : ''}
        </div>
        <div class="time">just now</div>
        ${renderActionButton(notification)}
      </div>
    </div>
  `);

  // Update count
  updateUnreadBadge(unreadCount + 1);
}

function verifiedBadge() {
  return '<span class="verified-badge"><i class="fas fa-check"></i></span>';
}

function formatTimeAgo(dateString) {
  // Your existing time formatting function
  // ...
}

function renderError() {
  const container = document.getElementById('notifications-container');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load notifications</p>
        <button onclick="loadNotifications()">Retry</button>
      </div>
    `;
  }
}
