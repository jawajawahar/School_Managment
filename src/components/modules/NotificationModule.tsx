import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  UserCheck,
  GraduationCap,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Notification } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Badge, BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CustomSelect } from '../common/CustomSelect';

export const NotificationModule: React.FC = () => {
  const {
    currentUser,
    activeRole,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useData();

  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isPrincipal =
    activeRole === 'principal' ||
    currentUser?.role === 'principal' ||
    currentUser?.id === 'user-principal-1' ||
    currentUser?.fullName?.toLowerCase().includes('principal');

  // User-scoped notifications
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

  const isUnread = (n: Notification) => n.status !== 'read' && (n as any).isRead !== true;

  const unreadCount = userNotifications.filter(isUnread).length;
  const readCount = userNotifications.length - unreadCount;

  const filteredNotifications = userNotifications.filter((n) => {
    const unreadState = isUnread(n);
    if (statusFilter === 'unread' && !unreadState) return false;
    if (statusFilter === 'read' && unreadState) return false;
    if (channelFilter !== 'all' && n.channel !== channelFilter) return false;
    if (
      searchTerm &&
      !n.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !n.message.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getNotifIcon = (n: Notification) => {
    const t = n.title.toLowerCase();
    if (t.includes('🚨') || t.includes('emergency') || t.includes('urgent')) {
      return <AlertTriangle className="w-5 h-5 text-danger shrink-0" />;
    }
    if (t.includes('leave') || t.includes('attendance')) {
      return <Calendar className="w-5 h-5 text-amber-500 shrink-0" />;
    }
    if (t.includes('student') || t.includes('admission') || t.includes('allocation')) {
      return <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
    if (t.includes('exam') || t.includes('result') || t.includes('academic')) {
      return <GraduationCap className="w-5 h-5 text-brand shrink-0" />;
    }
    return <Bell className="w-5 h-5 text-brand shrink-0" />;
  };

  const formatTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Notifications Center</Badge>}
        title="All System Notifications"
        description="View and manage all real-time alerts, announcements, and administrative updates."
        actions={
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <Button onClick={markAllNotificationsAsRead} className="flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4" /> Mark all as read
              </Button>
            )}
            {userNotifications.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  if (window.confirm('Clear all notifications for your account?')) {
                    clearAllNotifications();
                  }
                }}
                className="text-danger hover:bg-danger-tint border-danger/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Clear all
              </Button>
            )}
          </div>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-brand-tint text-brand">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-ink-faint tracking-wider">Total Notifications</div>
            <div className="text-2xl font-bold text-ink mt-0.5">{userNotifications.length}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-danger-tint text-danger relative">
            <AlertTriangle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-danger animate-ping" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-ink-faint tracking-wider">Unread Alerts</div>
            <div className="text-2xl font-bold text-danger mt-0.5">{unreadCount}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-ink-faint tracking-wider">Read Alerts</div>
            <div className="text-2xl font-bold text-ink mt-0.5">{readCount}</div>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-muted border border-border rounded-full pl-9 pr-4 py-2 text-sm text-ink focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="inline-flex items-center gap-1 p-1 bg-surface-muted border border-border rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                All ({userNotifications.length})
              </button>
              <button
                onClick={() => setStatusFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'unread'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-danger text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStatusFilter('read')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'read'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Read ({readCount})
              </button>
            </div>

            <CustomSelect
              className="w-36"
              options={[
                { value: 'all', label: 'All channels' },
                { value: 'in_app', label: 'In-App' },
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
              ]}
              value={channelFilter}
              onChange={setChannelFilter}
            />
          </div>
        </div>
      </Card>

      {/* Notification Roster List */}
      <Card padded={false}>
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-muted border border-border flex items-center justify-center mx-auto text-ink-faint">
              <Inbox className="w-6 h-6" />
            </div>
            <div className="font-semibold text-ink text-base">No notifications found</div>
            <p className="text-sm text-ink-muted max-w-sm mx-auto">
              {statusFilter === 'unread'
                ? 'Great job! You have read all your notifications.'
                : 'There are no system notifications matching your current filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((n) => {
              const unreadState = isUnread(n);
              return (
                <div
                  key={n.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    unreadState ? 'bg-brand-tint/20 dark:bg-brand-tint/10' : 'hover:bg-surface-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-surface border border-border shadow-2xs shrink-0 mt-0.5 sm:mt-0">
                      {getNotifIcon(n)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-ink">{n.title}</span>
                        {unreadState ? (
                          <Badge tone="danger" className="text-[10px] py-0 px-1.5">
                            Unread
                          </Badge>
                        ) : (
                          <Badge tone="neutral" className="text-[10px] py-0 px-1.5">
                            Read
                          </Badge>
                        )}
                        <span className="text-xs text-ink-faint font-mono-data">
                          {formatTime(n.sentAt)}
                        </span>
                      </div>
                      <p className="text-sm text-ink-muted leading-relaxed break-words">{n.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {unreadState && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => markNotificationAsRead(n.id)}
                        className="text-xs font-semibold flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Mark read
                      </Button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      className="p-1.5 text-ink-faint hover:text-danger rounded-lg hover:bg-surface-muted transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
