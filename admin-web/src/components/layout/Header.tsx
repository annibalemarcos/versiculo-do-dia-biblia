import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { pushNotificationService } from '../../services/pushNotification';
import { StaffNotificationItem } from '../../types';
import {
  Menu,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Shield,
  Check,
  ExternalLink,
  Smartphone,
  Volume2,
  X
} from 'lucide-react';

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'offline'>('checking');
  
  // Notification Bell Popover State
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<StaffNotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [enablingPush, setEnablingPush] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get<{ unread_count: number }>('/admin/notifications/unread-count');
      if (res.success && res.data) {
        setUnreadCount(res.data.unread_count);
      }
    } catch (_) {}
  };

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await api.get<{ unread_count: number; items: StaffNotificationItem[] }>(
        '/admin/notifications/inbox',
        { limit: 10 }
      );
      if (res.success && res.data) {
        setNotifications(res.data.items || []);
        setUnreadCount(res.data.unread_count);
      }
    } catch (_) {}
    setLoadingNotifs(false);
  };

  useEffect(() => {
    fetchUnreadCount();
    setPushStatus(pushNotificationService.getPermissionStatus());
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bellOpen) {
      fetchNotifications();
      setPushStatus(pushNotificationService.getPermissionStatus());
    }
  }, [bellOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch(`/admin/notifications/inbox/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/admin/notifications/inbox/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const handleNotificationClick = async (notif: StaffNotificationItem) => {
    if (!notif.is_read) {
      try {
        await api.patch(`/admin/notifications/inbox/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (_) {}
    }
    setBellOpen(false);
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const result = await pushNotificationService.requestPermissionAndEnable();
    setPushStatus(pushNotificationService.getPermissionStatus());
    setEnablingPush(false);
  };

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const res: any = await api.get('/health');
        if (!isMounted) return;

        if (res && res.success === false && res.error) {
          setHealthStatus('offline');
          return;
        }

        const status = res?.status || res?.data?.status;
        if (status === 'healthy' || status === 'ok' || res?.success === true) {
          setHealthStatus('healthy');
        } else {
          setHealthStatus('offline');
        }
      } catch {
        if (isMounted) {
          setHealthStatus('offline');
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard & Telemetria';
      case '/verses':
        return 'Banco de Versículos Bíblicos';
      case '/daily-verses':
        return 'Agendador de Versículo do Dia';
      case '/themes-emotions':
        return 'Temas e Emoções Espirituais';
      case '/devotionals':
        return 'Planos Devocionais';
      case '/banners':
        return 'Banners & Campanhas In-App';
      case '/registration-fields':
        return 'Campos Dinâmicos de Cadastro';
      case '/monetization':
        return 'Hub de Monetização & Simulador';
      case '/users':
        return 'Gestão de Usuários';
      case '/multi-app':
        return 'Aplicativos & Feature Flags';
      case '/notifications':
        return 'Push Notifications Hub';
      case '/experiments':
        return 'Testes A/B Paywall';
      case '/tickets':
        return 'Central de Suporte & Chamados';
      case '/system-health':
        return 'Saúde do Sistema & Integrações';
      case '/audit-logs':
        return 'Logs de Auditoria Administrativa';
      case '/admins':
        return 'Equipe & Perfis RBAC';
      default:
        return 'Painel Administrativo';
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 transition-all duration-300 flex items-center justify-between px-6 ${
        collapsed ? 'left-20' : 'left-72'
      }`}
    >
      {/* Left section: Toggle & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggle}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title="Recolher/Expandir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            {getPageTitle(location.pathname)}
          </h2>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Ambiente de Produção • API v1 REST
          </p>
        </div>
      </div>

      {/* Right section: System Status & Notifications Bell */}
      <div className="flex items-center gap-3">
        {/* Status Badge */}
        {healthStatus === 'healthy' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Backend Saudável</span>
          </div>
        )}
        {healthStatus === 'offline' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-400 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Backend Offline</span>
          </div>
        )}
        {healthStatus === 'checking' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Verificando...</span>
          </div>
        )}

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className={`relative p-2 rounded-xl border transition-all ${
              bellOpen
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border-slate-800/80'
            }`}
            title="Notificações da Equipe & Push"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-slate-950 shadow-md">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Notificações Staff
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      {unreadCount} não lidas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
                  >
                    Marcar todas lidas
                  </button>
                )}
              </div>

              {/* Push Status Banner */}
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-300">
                    Push Browser:{' '}
                    {pushStatus === 'granted' ? (
                      <span className="text-emerald-400 font-semibold">Ativo</span>
                    ) : pushStatus === 'denied' ? (
                      <span className="text-rose-400 font-semibold">Bloqueado</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">Desativado</span>
                    )}
                  </span>
                </div>
                {pushStatus !== 'granted' && (
                  <button
                    onClick={handleEnablePush}
                    disabled={enablingPush}
                    className="text-[10px] bg-brand-600 hover:bg-brand-500 text-white font-semibold px-2 py-1 rounded-md transition-colors"
                  >
                    {enablingPush ? 'Ativando...' : 'Ativar Push'}
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-800">
                {loadingNotifs ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-brand-400" />
                    Carregando notificações...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-1">
                    <CheckCircle2 className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                    <p className="text-xs font-semibold text-slate-400">Nenhuma notificação</p>
                    <p className="text-[11px] text-slate-600">Você está em dia com todos os alertas.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 hover:bg-slate-800/60 transition-colors cursor-pointer flex gap-3 items-start ${
                        !notif.is_read ? 'bg-brand-950/20' : ''
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          !notif.is_read ? 'bg-brand-400 shadow-sm shadow-brand-500' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs font-semibold truncate ${
                              !notif.is_read ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(notif.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          title="Marcar como lida"
                          className="p-1 text-slate-500 hover:text-white rounded transition-colors shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-center">
                <button
                  onClick={() => {
                    setBellOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <span>Ver Hub de Notificações & Diagnóstico Push</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Super admin badge */}
        {user?.is_super_admin && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-950/60 border border-brand-700/40 text-brand-300 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-brand-400" />
            <span>Super Admin</span>
          </div>
        )}
      </div>
    </header>
  );
};

