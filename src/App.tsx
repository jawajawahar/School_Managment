import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Sidebar, ModuleTab } from './components/common/Sidebar';
import { HeaderBar } from './components/common/HeaderBar';
import { LoginForm } from './components/common/LoginForm';

import { DashboardModule } from './components/modules/DashboardModule';
import { AttendanceModule } from './components/modules/AttendanceModule';
import { TimetableModule } from './components/modules/TimetableModule';
import { AcademicWrapper } from './components/modules/AcademicWrapper';
import { StudentModule } from './components/modules/StudentModule';
import { TeacherStaffModule } from './components/modules/TeacherStaffModule';
import { LibraryModule } from './components/modules/LibraryModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { WelfareModule } from './components/modules/WelfareModule';
import { CommunicationModule } from './components/modules/CommunicationModule';
import { NotificationModule } from './components/modules/NotificationModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { UserManagementModule } from './components/modules/UserManagementModule';

const AppContent: React.FC = () => {
  const { isAuthenticated, hasAccessToModule } = useData();
  const [activeTab, setActiveTab] = useState<ModuleTab>('dashboard');

  // If active tab is not allowed for the currently logged-in user, reset to dashboard
  useEffect(() => {
    if (isAuthenticated && !hasAccessToModule(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [isAuthenticated, activeTab, hasAccessToModule]);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* Left navigation sidebar (filters tabs by RBAC role) */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Workspace Region */}
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar onNavigate={setActiveTab} />

        {/* Content Area */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-[1920px] w-full mx-auto">
          {activeTab === 'dashboard' && hasAccessToModule('dashboard') && (
            <DashboardModule onNavigate={setActiveTab} />
          )}
          {activeTab === 'attendance' && hasAccessToModule('attendance') && <AttendanceModule />}
          {activeTab === 'timetable' && hasAccessToModule('timetable') && <TimetableModule />}
          {activeTab.startsWith('academic') && hasAccessToModule('academic') && (
            <AcademicWrapper
              initialSubView={
                activeTab === 'academic_exams'
                  ? 'exams'
                  : activeTab === 'academic_analytics'
                  ? 'analytics'
                  : 'allocations'
              }
            />
          )}
          {activeTab.startsWith('students') && hasAccessToModule('students') && (
            <StudentModule
              initialSubTab={activeTab === 'students_admissions' ? 'admissions' : 'directory'}
            />
          )}
          {activeTab.startsWith('teachers') && hasAccessToModule('teachers') && (
            <TeacherStaffModule
              initialTab={
                activeTab === 'teachers_leave'
                  ? 'leave'
                  : activeTab === 'teachers_staff'
                  ? 'staff'
                  : 'teachers'
              }
            />
          )}
          {activeTab === 'library' && hasAccessToModule('library') && <LibraryModule />}
          {activeTab === 'inventory' && hasAccessToModule('inventory') && <InventoryModule />}
          {activeTab === 'welfare' && hasAccessToModule('welfare') && <WelfareModule />}
          {activeTab === 'communication' && hasAccessToModule('communication') && (
            <CommunicationModule />
          )}
          {activeTab === 'notifications' && hasAccessToModule('notifications') && (
            <NotificationModule />
          )}
          {activeTab.startsWith('reports') && hasAccessToModule('reports') && (
            <ReportsModule
              initialReportType={
                activeTab === 'reports_academic'
                  ? 'academic'
                  : activeTab === 'reports_welfare'
                  ? 'welfare'
                  : activeTab === 'reports_inventory'
                  ? 'inventory'
                  : 'attendance'
              }
            />
          )}
          {activeTab === 'users' && hasAccessToModule('users') && <UserManagementModule />}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
