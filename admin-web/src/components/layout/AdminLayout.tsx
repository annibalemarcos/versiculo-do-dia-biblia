import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MaintenanceBanner } from './MaintenanceBanner';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-400 font-medium">Carregando painel administrativo...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <main
        className={`flex-1 transition-all duration-300 pt-20 pb-12 px-6 lg:px-8 max-w-7xl mx-auto w-full ${
          collapsed ? 'ml-20' : 'ml-72'
        }`}
      >
        <div className="mb-6">
          <MaintenanceBanner />
        </div>
        <Outlet />
      </main>
    </div>
  );
};
