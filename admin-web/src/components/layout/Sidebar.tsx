import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Sparkles,
  HeartHandshake,
  Users,
  DollarSign,
  Layers,
  Bell,
  FlaskConical,
  Activity,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Smartphone,
  LogOut,
  LifeBuoy,
  Flag,
  Sliders,
  Bug,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { user, hasPermission, logout, currentAppId, setCurrentAppId } = useAuth();

  const navGroups = [
    {
      title: 'Principal',
      items: [
        {
          label: 'Dashboard Executivo',
          path: '/dashboard',
          icon: LayoutDashboard,
          perm: 'dashboard.read',
        },
      ],
    },
    {
      title: 'Gestão de Conteúdo',
      items: [
        {
          label: 'Banco de Versículos',
          path: '/verses',
          icon: BookOpen,
          perm: 'content.read',
        },
        {
          label: 'Versículo do Dia',
          path: '/daily-verses',
          icon: Calendar,
          perm: 'content.read',
        },
        {
          label: 'Temas & Emoções',
          path: '/themes-emotions',
          icon: Sparkles,
          perm: 'content.read',
        },
        {
          label: 'Planos Devocionais',
          path: '/devotionals',
          icon: HeartHandshake,
          perm: 'content.read',
        },
        {
          label: 'Banners & Campanhas',
          path: '/banners',
          icon: Flag,
          perm: 'content.read',
        },
      ],
    },
    {
      title: 'Crescimento & Receita',
      items: [
        {
          label: 'Hub de Monetização',
          path: '/monetization',
          icon: DollarSign,
          perm: 'monetization.read',
        },
        {
          label: 'Ambiente de Testes',
          path: '/monetization?tab=test_environment',
          icon: Bug,
          perm: 'monetization.read',
        },
        {
          label: 'Base de Usuários',
          path: '/users',
          icon: Users,
          perm: 'users.read',
        },
        {
          label: 'Campos de Cadastro',
          path: '/registration-fields',
          icon: Sliders,
          perm: 'users.read',
        },
        {
          label: 'Notificações & Push',
          path: '/notifications',
          icon: Bell,
          perm: 'notifications.read',
        },
        {
          label: 'Testes A/B Paywall',
          path: '/experiments',
          icon: FlaskConical,
          perm: 'experiments.read',
        },
      ],
    },
    {
      title: 'Central de Suporte',
      items: [
        {
          label: 'Tickets & Chamados',
          path: '/tickets',
          icon: LifeBuoy,
          perm: 'tickets.view',
        },
      ],
    },
    {
      title: 'Administração & Sistema',
      items: [
        {
          label: 'Apps & Feature Flags',
          path: '/multi-app',
          icon: Layers,
          perm: 'apps.read',
        },
        {
          label: 'Saúde & Diagnóstico',
          path: '/system-health',
          icon: Activity,
          perm: 'system.health',
        },
        {
          label: 'Logs de Auditoria',
          path: '/audit-logs',
          icon: ShieldCheck,
          perm: 'audit.read',
        },
        {
          label: 'Equipe & Permissões',
          path: '/admins',
          icon: UserCheck,
          perm: 'admins.manage',
        },
      ],
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-slate-950 border-r border-slate-800/80 flex flex-col ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/80 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 shrink-0">
          <BookOpen className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-wide truncate">
              Versículo do Dia
            </h1>
            <p className="text-[11px] text-brand-400 font-medium tracking-wider uppercase">
              Admin Platform
            </p>
          </div>
        )}
      </div>

      {/* App Selector */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/40">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 block">
            Aplicativo Ativo
          </label>
          <div className="flex items-center gap-2 bg-slate-800/90 rounded-lg px-2.5 py-1.5 border border-slate-700/50">
            <Smartphone className="w-4 h-4 text-brand-400 shrink-0" />
            <select
              aria-label="Selecionar Aplicativo Ativo"
              value={currentAppId}
              onChange={(e) => setCurrentAppId(e.target.value)}
              className="bg-transparent text-xs text-white font-medium focus:outline-none w-full cursor-pointer"
            >
              <option value="verse_daily" className="bg-slate-900 text-white">
                Versículo do Dia (Android)
              </option>
              <option value="bible_study_pro" className="bg-slate-900 text-white">
                Bíblia de Estudo Pro
              </option>
            </select>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group) => {
          const visibleItems迷 = group.items.filter(
            (it) => !it.perm || hasPermission(it.perm)
          );

          if (visibleItems迷.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <h3 className="text-[10px] uppercase font-bold text-slate-500 px-3 tracking-wider mb-2">
                  {group.title}
                </h3>
              )}
              {visibleItems迷.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-brand-500 text-slate-950 font-semibold shadow-md shadow-brand-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-400 font-bold text-xs flex items-center justify-center shrink-0">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || 'Administrador'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || 'admin@sistema'}
              </p>
            </div>
          )}
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
            title="Sair do painel"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
