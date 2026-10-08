import React, { useState } from 'react';
import {
  Bell,
  Shield,
  Building2,
  X,
  LogOut,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface HeaderBarProps {
  onNavigate?: (tab: any) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onNavigate }) => {
  const {
    currentUser,
    activeRole,
    notifications,
    logout,
    schoolProfile,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useData();
  const [showNotifications, setShowNotifications] = useState(false);

  const isPrincipal =
    activeRole === 'principal' ||
    currentUser?.role === 'principal' ||
    currentUser?.id === 'user-principal-1' ||
    currentUser?.fullName?.toLowerCase().includes('principal');

  const userNotifications = notifications.filter(
    (n) =>
      n.recipientId === currentUser?.id ||
      n.recipientId === 'all' ||
      (isPrincipal &&
        (n.recipientId === 'user-principal-1' ||
          n.recipientId === 'principal' ||
          n.recipientId?.toLowerCase().includes('principal') ||
          n.title.toLowerCase().includes('guardian meeting') ||
          n.title.toLowerCase().includes('leave') ||
          n.title.toLowerCase().includes('requisition') ||
          n.title.toLowerCase().includes('admission')))
  );

  const isUnread = (n: any) => n.status !== 'read' && n.isRead !== true;
  const unreadCount = userNotifications.filter(isUnread).length;

  return (
    <header className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between sticky top-0 z-10">
      {/* School Context */}
      <div className="flex items-center gap-6 min-w-0">
        <div className="flex items-center gap-2 text-ink min-w-0">
          <Building2 className="w-5 h-5 text-brand shrink-0" />
          <div className="min-w-0">
            <div className="font-display font-semibold text-[15px] leading-tight text-ink truncate">
              {schoolProfile?.schoolName || 'Your School'}
            </div>
            <div className="text-xs text-ink-faint">
              Academic Year {schoolProfile?.academicYear || new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>

      {/* User Session & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-ink hover:bg-surface-muted transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-surface animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-xl py-3 z-30 animate-fade-in">
                <div className="px-4 pb-2 border-b border-border flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-sm text-ink">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-danger text-white">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsAsRead()}
                        className="text-xs text-brand font-semibold hover:underline flex items-center gap-1"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Read all
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-ink-faint hover:text-ink p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {userNotifications.length === 0 ? (
                    <p className="p-6 text-sm text-center text-ink-faint">No notifications yet</p>
                  ) : (
                    userNotifications.slice(0, 5).map((n) => {
                      const unread = isUnread(n);
                      return (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-3.5 cursor-pointer transition-colors ${
                            unread ? 'bg-brand-tint/20 dark:bg-brand-tint/10' : 'hover:bg-surface-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span
                              className={`font-semibold ${
                                unread ? 'text-brand-dark font-bold' : 'text-ink-muted'
                              }`}
                            >
                              {n.title}
                            </span>
                            <span className="text-ink-faint text-[11px]">
                              {new Date(n.sentAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-ink leading-snug line-clamp-2">{n.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="px-4 pt-2 border-t border-border mt-1">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      if (onNavigate) onNavigate('notifications');
                    }}
                    className="w-full text-center text-xs font-semibold text-brand hover:underline py-1 flex items-center justify-center gap-1"
                  >
                    View All Notifications <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Logged-In User Profile & Role Badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <img
            src={
              currentUser?.avatarUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
            }
            alt={currentUser?.fullName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-tint"
          />
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-ink leading-tight">{currentUser?.fullName}</div>
            <div className="text-xs text-ink-faint uppercase font-semibold flex items-center gap-1 tracking-wide">
              <Shield className="w-3 h-3 text-brand" /> {activeRole.replace('_', ' ')}
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-ink-faint hover:text-danger transition-colors rounded-lg hover:bg-surface-muted"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
