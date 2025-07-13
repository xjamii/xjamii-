import { supabase } from './supabase';

export const NotificationTypes = {
  NEW_POST: 'new_post',
  COMMENT: 'comment',
  LIKE: 'like',
  CONNECTION_REQUEST: 'connection_request'
};

export async function sendNotification({
  userId,
  senderId,
  type,
  message,
  link = null
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      sender_id: senderId,
      type,
      message,
      link,
      read: false
    }])
    .select();

  if (error) {
    console.error('Error sending notification:', error);
    return { error };
  }

  // Increment notification count
  await supabase.rpc('increment_notification_count', {
    user_id: userId
  });

  return { data };
}

export async function markAsRead(userId) {
  return await supabase.rpc('mark_notifications_read', {
    user_id: userId
  });
}

export function setupRealtimeNotifications(userId, callback) {
  const channel = supabase
    .channel('notifications_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      payload => {
        callback(payload);
        // Update badge count in real-time
        updateUnreadCount(userId);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function updateUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (!error) {
    // Update localStorage and UI
    localStorage.setItem('unreadNotifications', count || 0);
    window.dispatchEvent(new CustomEvent('notificationCountUpdated', {
      detail: { count: count || 0 }
    }));
  }
}
