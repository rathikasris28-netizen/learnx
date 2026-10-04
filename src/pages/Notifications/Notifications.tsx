import React, { useEffect, useState } from 'react';
import { learnxApi } from '../../services/learnx';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifs();
  }, []);

  const fetchNotifs = () => {
    learnxApi.getNotifications()
      .then((data) => setNotifications(data))
      .catch((err) => console.error('Error fetching notifications:', err))
      .finally(() => setLoading(false));
  };

  const handleMarkRead = async (id: string) => {
    try {
      await learnxApi.markNotificationRead(id);
      fetchNotifs();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await learnxApi.markAllNotificationsRead();
      fetchNotifs();
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-slate-500">Stay updated on matches, sessions, and Time Credit transactions.</p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
          <Bell className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-700 font-bold">You're all caught up!</p>
          <p className="text-xs text-slate-500">No unread notifications.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && handleMarkRead(notif.id)}
              className={`p-5 flex items-start space-x-4 transition-colors cursor-pointer ${
                notif.is_read ? 'bg-white' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-slate-100 text-slate-500' : 'bg-indigo-600 text-white'}`}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{notif.title || notif.type}</h3>
                  <span className="text-xs text-slate-400">{new Date(notif.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
