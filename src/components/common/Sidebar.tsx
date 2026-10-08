import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  GraduationCap,
  Users,
  BookOpen,
  Package,
  HeartHandshake,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  LogOut,
  Award,
  ChevronsLeft,
  ChevronsRight,
  BookCheck,
  FileSpreadsheet,
  UserCheck,
  FileCheck,
  Briefcase,
  Bell,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { cn } from '../../lib/cn';

export type ModuleTab =
  | 'dashboard'
  | 'attendance'
  | 'timetable'
  | 'academic'
  | 'academic_allocations'
  | 'academic_exams'
  | 'academic_analytics'
  | 'students'
  | 'students_directory'
  | 'students_admissions'
  | 'teachers'
  | 'teachers_roster'
  | 'teachers_staff'
  | 'teachers_leave'
  | 'library'
  | 'inventory'
  | 'welfare'
  | 'communication'
  | 'notifications'
  | 'reports'
  | 'reports_attendance'
  | 'reports_academic'
  | 'reports_welfare'
  | 'reports_inventory'
  | 'users';

interface SubItem {
  id: ModuleTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}

interface MainTab {
  id: ModuleTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: number;
  subItems?: SubItem[];
}

interface SidebarProps {
  activeTab: ModuleTab;
  onSelectTab: (tab: ModuleTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { activeRole, currentUser, hasAccessToModule, notifications, logout } = useData();

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
  const unreadNotifs = userNotifications.filter((n) => n.status !== 'read' && (n as any).isRead !== true).length;

  const [collapsed, setCollapsed] = useState(false);

  const allTabs: MainTab[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'timetable', label: 'Timetable', icon: Clock },
    {
      id: 'academic',
      label: 'Academic & Exams',
      icon: GraduationCap,
      subItems: [
        { id: 'academic_allocations', label: 'Subject Teacher Allocations', icon: BookCheck },
        { id: 'academic_exams', label: 'Term Exams & Marks', icon: FileSpreadsheet },
        { id: 'academic_analytics', label: 'Results Analytics', icon: Award },
      ],
    },
    {
      id: 'students',
      label: 'Student Directory',
      icon: Users,
      subItems: [
        { id: 'students_directory', label: 'Enrolled Directory', icon: UserCheck },
        { id: 'students_admissions', label: 'Admission Requests', icon: FileCheck },
      ],
    },
    {
      id: 'teachers',
      label: 'Teacher & Staff',
      icon: Users,
      subItems: [
        { id: 'teachers_roster', label: 'Academic Teachers', icon: GraduationCap },
        { id: 'teachers_staff', label: 'Admin Support Staff', icon: Briefcase },
        { id: 'teachers_leave', label: 'Staff Leave Requests', icon: CalendarCheck },
      ],
    },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'welfare', label: 'Welfare Schemes', icon: HeartHandshake },
    { id: 'communication', label: 'Announcements', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs > 0 ? unreadNotifs : undefined },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      subItems: [
        { id: 'reports_attendance', label: 'Attendance Reports', icon: CalendarCheck },
        { id: 'reports_academic', label: 'Academic Performance', icon: GraduationCap },
        { id: 'reports_welfare', label: 'Welfare Reports', icon: HeartHandshake },
        { id: 'reports_inventory', label: 'Inventory Audits', icon: Package },
      ],
    },
    { id: 'users', label: 'Users & Audit', icon: ShieldCheck },
  ];

  // Filter tabs strictly based on RBAC matrix
  const allowedTabs = allTabs.filter((tab) => hasAccessToModule(tab.id));

  return (
    <aside
      className={cn(
        'bg-surface border-r border-border flex flex-col h-screen sticky top-0 z-20 shrink-0 transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="h-20 px-3.5 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img 
            src="/logo.png" 
            alt="Al Ahala School Logo" 
            className="h-14 w-14 object-contain shrink-0 filter drop-shadow-sm scale-110" 
          />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-base text-ink leading-tight truncate">Al Ahala School</h1>
              <p className="text-xs text-ink-faint font-medium capitalize truncate">{activeRole.replace('_', ' ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2.5">
        {allowedTabs.map((tab) => {
          const isBaseActive = activeTab.split('_')[0] === tab.id;
          const Icon = tab.icon;
          const hasSub = Boolean(tab.subItems && tab.subItems.length > 0);

          return (
            <div key={tab.id} className="space-y-0.5">
              <button
                onClick={() => {
                  if (hasSub) {
                    onSelectTab(tab.subItems![0].id);
                  } else {
                    onSelectTab(tab.id);
                  }
                }}
                title={collapsed ? tab.label : undefined}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors duration-150 group',
                  isBaseActive && !hasSub
                    ? 'bg-brand-tint text-brand font-semibold'
                    : isBaseActive
                    ? 'text-brand font-semibold'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={cn('w-[18px] h-[18px] shrink-0', isBaseActive ? 'text-brand' : 'text-ink-faint group-hover:text-ink-muted')} />
                  {!collapsed && <span className="text-sm font-medium truncate">{tab.label}</span>}
                </div>

                {!collapsed && tab.badge && (
                  <span className="bg-danger text-white text-xs font-mono-data font-bold px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>

              {/* Sub-items always visible */}
              {hasSub && !collapsed && (
                <div className="ml-5 pl-2.5 border-l border-border/60 space-y-0.5 my-1">
                  {tab.subItems!.map((sub) => {
                    const isSubActive = activeTab === sub.id;
                    const SubIcon = sub.icon;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => onSelectTab(sub.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[13px] font-medium transition-colors',
                          isSubActive ? 'bg-brand-tint text-brand font-semibold' : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
                        )}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2.5 border-t border-border shrink-0 space-y-1">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-3 px-3 py-2 text-ink-faint hover:text-ink hover:bg-surface-muted rounded-lg transition-colors text-xs font-medium"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-ink-faint hover:text-danger hover:bg-danger-tint rounded-lg transition-colors text-xs font-medium"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
};
