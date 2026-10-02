import API from './api';

/**
 * Notification Service for high-performance notification management
 * Avoids loading massive historical notification records into memory
 */
export const notificationService = {
  /**
   * Lightweight indexed unread notification count
   */
  getUnreadCount: async () => {
    const res = await API.get('/analytics/notifications/unread-count');
    return res.data?.unreadCount || 0;
  },

  /**
   * Fetch recent notifications with server-side pagination
   * @param {number} limit - default 10
   * @param {number} page - default 1
   */
  getRecentNotifications: async (limit = 10, page = 1) => {
    const res = await API.get('/analytics/notifications', {
      params: { limit, page, format: 'paginated' }
    });
    if (res.data?.data) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  },

  /**
   * Mark single notification as read
   * @param {string} id - Notification ObjectId
   */
  markAsRead: async (id) => {
    const res = await API.put(`/analytics/notifications/${id}/read`);
    return res.data;
  },

  /**
   * Mark all notifications as read for current user
   */
  markAllAsRead: async () => {
    const res = await API.put('/analytics/notifications/read-all');
    return res.data;
  }
};

export default notificationService;
