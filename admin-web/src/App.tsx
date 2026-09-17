import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Verses } from './pages/Verses';
import { DailyVerseScheduler } from './pages/DailyVerseScheduler';
import { ThemesEmotions } from './pages/ThemesEmotions';
import { Devotionals } from './pages/Devotionals';
import { MonetizationHub } from './pages/MonetizationHub';
import { Users } from './pages/Users';
import { MultiAppConfig } from './pages/MultiAppConfig';
import { NotificationsHub } from './pages/NotificationsHub';
import { Experiments } from './pages/Experiments';
import { SystemHealth } from './pages/SystemHealth';
import { AuditLogs } from './pages/AuditLogs';
import { AdminsTeam } from './pages/AdminsTeam';
import { Tickets } from './pages/Tickets';
import { UserProfilePage } from './pages/UserProfilePage';
import { Banners } from './pages/Banners';
import { RegistrationFields } from './pages/RegistrationFields';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="verses" element={<Verses />} />
            <Route path="daily-verses" element={<DailyVerseScheduler />} />
            <Route path="themes-emotions" element={<ThemesEmotions />} />
            <Route path="devotionals" element={<Devotionals />} />
            <Route path="banners" element={<Banners />} />
            <Route path="registration-fields" element={<RegistrationFields />} />
            <Route path="monetization" element={<MonetizationHub />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:userId" element={<UserProfilePage />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="multi-app" element={<MultiAppConfig />} />
            <Route path="notifications" element={<NotificationsHub />} />
            <Route path="experiments" element={<Experiments />} />
            <Route path="system-health" element={<SystemHealth />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="admins" element={<AdminsTeam />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
