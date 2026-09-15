import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  UserItem,
  UserDevotionalItem,
  UserActivityItem,
  UserFavoriteItem,
  UserReadingItem,
  UserPushDeviceItem,
  UserEntitlementsData,
  TicketItem,
} from '../types';
import {
  ArrowLeft,
  Smartphone,
  Calendar,
  Clock,
  Crown,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  BookOpen,
  LifeBuoy,
  Bell,
  CreditCard,
  Layers,
  Settings,
  Shield,
  Activity,
  UserCheck,
  UserX,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Mail,
  Flame,
  Check,
} from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Reference to the active userId to guarantee complete data isolation and avoid race conditions
  const currentUserIdRef = useRef<string | undefined>(userId);

  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'summary' | 'activity' | 'favorites' | 'history' | 'devotionals' | 'tickets' | 'notifications' | 'devices' | 'premium'
  >('summary');

  // Subresource states
  const [timeline, setTimeline] = useState<UserActivityItem[]>([]);
  const [favorites, setFavorites] = useState<UserFavoriteItem[]>([]);
  const [history, setHistory] = useState<UserReadingItem[]>([]);
  const [devotionals, setDevotionals] = useState<UserDevotionalItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [devices, setDevices] = useState<UserPushDeviceItem[]>([]);
  const [entitlements, setEntitlements] = useState<UserEntitlementsData>({ grants: [], subscriptions: [] });
  const [loadingSubresource, setLoadingSubresource] = useState(false);
  const [subresourceError, setSubresourceError] = useState<string | null>(null);

  // Metrics Loading & Error States
  const [metricsLoading, setMetricsLoading] = useState<{
    favorites: boolean;
    devotionals: boolean;
    tickets: boolean;
    notifications: boolean;
    devices: boolean;
  }>({
    favorites: false,
    devotionals: false,
    tickets: false,
    notifications: false,
    devices: false,
  });

  const [metricsErrors, setMetricsErrors] = useState<{
    favorites: string | null;
    devotionals: string | null;
    tickets: string | null;
    notifications: string | null;
    devices: string | null;
  }>({
    favorites: null,
    devotionals: null,
    tickets: null,
    notifications: null,
    devices: null,
  });

  // Grant Entitlement Modal
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantEntitlementId, setGrantEntitlementId] = useState('premium_full');
  const [grantReason, setGrantReason] = useState('');
  const [grantDays, setGrantDays] = useState('30');
  const [submittingGrant, setSubmittingGrant] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  /**
   * Fetches Favorites from FastAPI using :userId with strict isolation
   */
  const fetchFavoritesData = async (targetUserId: string) => {
    if (!targetUserId || targetUserId !== currentUserIdRef.current) return;
    setMetricsLoading((prev) => ({ ...prev, favorites: true }));
    setMetricsErrors((prev) => ({ ...prev, favorites: null }));
    try {
      const res = await api.get<UserFavoriteItem[]>(`/admin/users/${targetUserId}/favorites`);
      if (targetUserId !== currentUserIdRef.current) return;
      if (res.success && res.data) {
        setFavorites(res.data);
        setUser((prev: any) => (prev ? { ...prev, favorites_count: res.data.length } : prev));
      } else {
        const errorMsg = res.error?.message || 'Falha ao buscar favoritos do usuário.';
        setMetricsErrors((prev) => ({ ...prev, favorites: errorMsg }));
      }
    } catch (err: any) {
      if (targetUserId !== currentUserIdRef.current) return;
      setMetricsErrors((prev) => ({ ...prev, favorites: err?.message || 'Erro de conexão ao buscar favoritos.' }));
    } finally {
      if (targetUserId === currentUserIdRef.current) {
        setMetricsLoading((prev) => ({ ...prev, favorites: false }));
      }
    }
  };

  /**
   * Fetches Devotionals from FastAPI using :userId with strict isolation
   */
  const fetchDevotionalsData = async (targetUserId: string) => {
    if (!targetUserId || targetUserId !== currentUserIdRef.current) return;
    setMetricsLoading((prev) => ({ ...prev, devotionals: true }));
    setMetricsErrors((prev) => ({ ...prev, devotionals: null }));
    try {
      const res = await api.get<UserDevotionalItem[]>(`/admin/users/${targetUserId}/devotionals`);
      if (targetUserId !== currentUserIdRef.current) return;
      if (res.success && res.data) {
        setDevotionals(res.data);
        setUser((prev: any) => (prev ? { ...prev, devotionals_count: res.data.length } : prev));
      } else {
        const errorMsg = res.error?.message || 'Falha ao buscar devocionais do usuário.';
        setMetricsErrors((prev) => ({ ...prev, devotionals: errorMsg }));
      }
    } catch (err: any) {
      if (targetUserId !== currentUserIdRef.current) return;
      setMetricsErrors((prev) => ({ ...prev, devotionals: err?.message || 'Erro de conexão ao buscar devocionais.' }));
    } finally {
      if (targetUserId === currentUserIdRef.current) {
        setMetricsLoading((prev) => ({ ...prev, devotionals: false }));
      }
    }
  };

  /**
   * Fetches Support Tickets from FastAPI using :userId with strict isolation
   */
  const fetchTicketsData = async (targetUserId: string) => {
    if (!targetUserId || targetUserId !== currentUserIdRef.current) return;
    setMetricsLoading((prev) => ({ ...prev, tickets: true }));
    setMetricsErrors((prev) => ({ ...prev, tickets: null }));
    try {
      const res = await api.get<TicketItem[]>(`/admin/users/${targetUserId}/tickets`);
      if (targetUserId !== currentUserIdRef.current) return;
      if (res.success && res.data) {
        setTickets(res.data);
        setUser((prev: any) => (prev ? { ...prev, tickets_count: res.data.length } : prev));
      } else {
        const errorMsg = res.error?.message || 'Falha ao buscar chamados do usuário.';
        setMetricsErrors((prev) => ({ ...prev, tickets: errorMsg }));
      }
    } catch (err: any) {
      if (targetUserId !== currentUserIdRef.current) return;
      setMetricsErrors((prev) => ({ ...prev, tickets: err?.message || 'Erro de conexão ao buscar chamados.' }));
    } finally {
      if (targetUserId === currentUserIdRef.current) {
        setMetricsLoading((prev) => ({ ...prev, tickets: false }));
      }
    }
  };

  /**
   * Fetches Notifications from FastAPI using :userId with strict isolation
   */
  const fetchNotificationsData = async (targetUserId: string) => {
    if (!targetUserId || targetUserId !== currentUserIdRef.current) return;
    setMetricsLoading((prev) => ({ ...prev, notifications: true }));
    setMetricsErrors((prev) => ({ ...prev, notifications: null }));
    try {
      const res = await api.get<any[]>(`/admin/users/${targetUserId}/notifications?limit=50`);
      if (targetUserId !== currentUserIdRef.current) return;
      if (res.success && res.data) {
        setNotifications(res.data);
        const unread = res.data.filter((n: any) => !n.is_read).length;
        setUser((prev: any) => (prev ? { ...prev, unread_notifications_count: unread } : prev));
      } else {
        const errorMsg = res.error?.message || 'Falha ao buscar notificações do usuário.';
        setMetricsErrors((prev) => ({ ...prev, notifications: errorMsg }));
      }
    } catch (err: any) {
      if (targetUserId !== currentUserIdRef.current) return;
      setMetricsErrors((prev) => ({ ...prev, notifications: err?.message || 'Erro de conexão ao buscar notificações.' }));
    } finally {
      if (targetUserId === currentUserIdRef.current) {
        setMetricsLoading((prev) => ({ ...prev, notifications: false }));
      }
    }
  };

  /**
   * Fetches Registered Push Devices from FastAPI using :userId with strict isolation
   */
  const fetchDevicesData = async (targetUserId: string) => {
    if (!targetUserId || targetUserId !== currentUserIdRef.current) return;
    setMetricsLoading((prev) => ({ ...prev, devices: true }));
    setMetricsErrors((prev) => ({ ...prev, devices: null }));
    try {
      const res = await api.get<UserPushDeviceItem[]>(`/admin/users/${targetUserId}/devices`);
      if (targetUserId !== currentUserIdRef.current) return;
      if (res.success && res.data) {
        setDevices(res.data);
        setUser((prev: any) => (prev ? { ...prev, devices_count: res.data.length } : prev));
      } else {
        const errorMsg = res.error?.message || 'Falha ao buscar dispositivos do usuário.';
        setMetricsErrors((prev) => ({ ...prev, devices: errorMsg }));
      }
    } catch (err: any) {
      if (targetUserId !== currentUserIdRef.current) return;
      setMetricsErrors((prev) => ({ ...prev, devices: err?.message || 'Erro de conexão ao buscar dispositivos.' }));
    } finally {
      if (targetUserId === currentUserIdRef.current) {
        setMetricsLoading((prev) => ({ ...prev, devices: false }));
      }
    }
  };

  /**
   * Fetches all core metrics (favorites, devotionals, tickets, notifications, devices) concurrently
   */
  const fetchAllMetrics = async (targetUserId: string) => {
    if (!targetUserId || targetUserId !== currentUserIdRef.current) return;
    await Promise.allSettled([
      fetchFavoritesData(targetUserId),
      fetchDevotionalsData(targetUserId),
      fetchTicketsData(targetUserId),
      fetchNotificationsData(targetUserId),
      fetchDevicesData(targetUserId),
    ]);
  };

  /**
   * Fetches user profile from FastAPI backend /admin/users/:userId
   */
  const fetchUser = async (targetUserId?: string) => {
    const id = targetUserId || userId;
    if (!id) {
      setError('Parâmetro :userId não informado na rota.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<any>(`/admin/users/${id}`);
      if (id !== currentUserIdRef.current) return;
      if (res.success && res.data) {
        setUser(res.data);
        // Concurrently fetch all metrics for this user
        fetchAllMetrics(id);
      } else {
        setUser(null);
        setError(res.error?.message || 'Usuário não localizado no servidor.');
      }
    } catch (err: any) {
      if (id !== currentUserIdRef.current) return;
      setUser(null);
      setError(err?.message || 'Falha de comunicação com o servidor.');
    } finally {
      if (id === currentUserIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Strict isolation by userId: Reset all states whenever userId route param changes
  useEffect(() => {
    currentUserIdRef.current = userId;

    // Reset all states immediately to prevent state leakage between different users
    setUser(null);
    setTimeline([]);
    setFavorites([]);
    setHistory([]);
    setDevotionals([]);
    setTickets([]);
    setNotifications([]);
    setDevices([]);
    setEntitlements({ grants: [], subscriptions: [] });
    setError(null);
    setSubresourceError(null);
    setMetricsErrors({
      favorites: null,
      devotionals: null,
      tickets: null,
      notifications: null,
      devices: null,
    });

    if (userId) {
      fetchUser(userId);
    } else {
      setError('Parâmetro :userId não informado na rota.');
      setLoading(false);
    }
  }, [userId]);

  /**
   * Fetches the selected sub-resource using the :userId route parameter
   */
  const loadTab = async () => {
    if (!userId || activeTab === 'summary') return;
    const targetUserId = userId;
    setLoadingSubresource(true);
    setSubresourceError(null);

    try {
      if (activeTab === 'activity') {
        const res = await api.get<UserActivityItem[]>(`/admin/users/${targetUserId}/activity`);
        if (targetUserId !== currentUserIdRef.current) return;
        if (res.success && res.data) {
          setTimeline(res.data);
        } else {
          setSubresourceError(res.error?.message || 'Falha ao carregar linha do tempo.');
        }
      } else if (activeTab === 'favorites') {
        await fetchFavoritesData(targetUserId);
      } else if (activeTab === 'history') {
        const res = await api.get<UserReadingItem[]>(`/admin/users/${targetUserId}/history?limit=50`);
        if (targetUserId !== currentUserIdRef.current) return;
        if (res.success && res.data) {
          setHistory(res.data);
          setUser((prev: any) => (prev ? { ...prev, history_count: res.data.length } : prev));
        } else {
          setSubresourceError(res.error?.message || 'Falha ao carregar histórico de leitura.');
        }
      } else if (activeTab === 'devotionals') {
        await fetchDevotionalsData(targetUserId);
      } else if (activeTab === 'tickets') {
        await fetchTicketsData(targetUserId);
      } else if (activeTab === 'notifications') {
        await fetchNotificationsData(targetUserId);
      } else if (activeTab === 'devices') {
        await fetchDevicesData(targetUserId);
      } else if (activeTab === 'premium') {
        const res = await api.get<UserEntitlementsData>(`/admin/users/${targetUserId}/entitlements`);
        if (targetUserId !== currentUserIdRef.current) return;
        if (res.success && res.data) {
          setEntitlements(res.data);
        } else {
          setSubresourceError(res.error?.message || 'Falha ao carregar dados de assinatura.');
        }
      }
    } catch (err: any) {
      if (targetUserId === currentUserIdRef.current) {
        setSubresourceError(err?.message || 'Erro inesperado ao carregar dados da aba.');
      }
    } finally {
      if (targetUserId === currentUserIdRef.current) {
        setLoadingSubresource(false);
      }
    }
  };

  // Fetch sub-resource when tab or userId changes
  useEffect(() => {
    loadTab();
  }, [activeTab, userId]);

  const handleToggleBlock = async () => {
    if (!user) return;
    const newStatus = !user.is_active;
    const res = await api.put(`/admin/users/${user.id}/status?is_active=${newStatus}`);
    if (res.success) {
      showToast(`Status atualizado para ${newStatus ? 'Ativo' : 'Bloqueado'}`);
      setUser({ ...user, is_active: newStatus });
    } else {
      alert(res.error?.message || 'Erro ao alterar status');
    }
  };

  const handleGrantEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !grantReason.trim()) return;

    setSubmittingGrant(true);
    const res = await api.post(`/admin/users/${user.id}/entitlements`, {
      entitlement_id: grantEntitlementId,
      reason: grantReason.trim(),
      days: grantDays ? parseInt(grantDays, 10) : null,
    });
    setSubmittingGrant(false);

    if (res.success) {
      showToast('Benefício concedido com sucesso ao usuário!');
      setShowGrantModal(false);
      setGrantReason('');
      // Reload entitlements and user
      fetchUser();
      const entRes = await api.get<UserEntitlementsData>(`/admin/users/${user.id}/entitlements`);
      if (entRes.success && entRes.data) setEntitlements(entRes.data);
    } else {
      alert(res.error?.message || 'Erro ao conceder benefício');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] text-slate-400 space-y-4 bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center shadow-xl animate-fade-in">
        <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Carregando Perfil 360° do Usuário</h3>
          <p className="text-xs text-slate-400 font-mono">
            Consultando FastAPI backend: <span className="text-brand-300">/api/v1/admin/users/{userId}</span>
          </p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-5 max-w-lg mx-auto mt-8 shadow-2xl animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white">Erro ao Carregar Usuário</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || `O identificador "${userId}" não foi localizado na base de dados central.`}
          </p>
          <div className="pt-2 font-mono text-[11px] text-slate-500">
            Rota requisitada: /api/v1/admin/users/{userId}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fetchUser()}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 inline-flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
          <button
            onClick={() => navigate('/users')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Usuários</span>
          </button>
        </div>
      </div>
    );
  }

  const isDeleted = !!user.is_deleted;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb / Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/users');
              }
            }}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-900/60 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Lista de Usuários</span>
          </button>

          <button
            onClick={() => {
              fetchUser();
              loadTab();
              showToast('Perfil atualizado com sucesso');
            }}
            title="Sincronizar métricas e dados com o backend"
            className="p-2 text-slate-400 hover:text-brand-400 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isDeleted && hasPermission('users.block') && (
            <button
              onClick={handleToggleBlock}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                user.is_active
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60'
                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60'
              }`}
            >
              {user.is_active ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear Acesso</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Desbloquear Acesso</span>
                </>
              )}
            </button>
          )}

          {!isDeleted && hasPermission('monetization.write') && (
            <button
              onClick={() => setShowGrantModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Conceder Benefício</span>
            </button>
          )}
        </div>
      </div>

      {/* Deletion Warning Banner */}
      {isDeleted && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2.5">
            <UserX className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider block">Conta Excluída pelo Usuário</span>
              <span>
                Esta conta foi anonimizada e excluída em{' '}
                {user.deleted_at ? new Date(user.deleted_at).toLocaleString('pt-BR') : 'Data não informada'}.
                Ações de alteração cadastral estão desabilitadas.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-400 flex items-center justify-center font-extrabold text-2xl text-slate-950 shadow-lg shadow-brand-500/20 shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {user.name || (user.is_anonymous ? 'Usuário Anônimo' : 'Sem Nome')}
                </h1>

                {/* Status Badge */}
                {isDeleted ? (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-rose-950 text-rose-300 border border-rose-800 tracking-wider">
                    EXCLUÍDO
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      user.is_active
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {user.is_active ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" /> ATIVO
                      </>
                    ) : (
                      <>
                        <Lock className="w-2.5 h-2.5" /> BLOQUEADO
                      </>
                    )}
                  </span>
                )}

                {/* Plan Badge */}
                {user.is_premium ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-brand-950 text-brand-300 border border-brand-800/60 shadow-sm uppercase tracking-wider">
                    <Crown className="w-3 h-3 text-brand-400" />
                    PREMIUM
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase tracking-wider">
                    GRATUITO
                  </span>
                )}

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                  App: {user.app_id}
                </span>
              </div>

              <div className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  {user.email || 'E-mail não informado'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500 select-all">UUID: {user.id}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-brand-400" />
                  Plataforma: <strong className="text-white capitalize">{user.platform}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  Cadastro: <strong className="text-white">{new Date(user.created_at).toLocaleDateString('pt-BR')}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Último Login: <strong className="text-white">{new Date(user.last_seen_at).toLocaleString('pt-BR')}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  Última Atividade: <strong className="text-white">{new Date(user.last_seen_at).toLocaleString('pt-BR')}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-blue-400" />
                  Última Sincronização: <strong className="text-white">{new Date(user.updated_at || user.last_seen_at).toLocaleString('pt-BR')}</strong>
                </span>
                {user.app_version && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">
                      Versão do App: <strong className="text-white font-mono">v{user.app_version}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Real Metrics Summary Cards - Interactive & State Aware */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          {/* Favoritos */}
          <button
            onClick={() => setActiveTab('favorites')}
            className={`p-3.5 rounded-2xl border text-center transition-all group ${
              activeTab === 'favorites'
                ? 'bg-amber-950/40 border-amber-500/50 shadow-md shadow-amber-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-amber-500/30'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-amber-300 flex items-center justify-center gap-1 transition-colors">
              <Bookmark className="w-3 h-3 text-amber-400" />
              Favoritos
              {metricsLoading.favorites && <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />}
              {metricsErrors.favorites && <AlertCircle className="w-2.5 h-2.5 text-rose-400" />}
            </span>
            <div className="text-xl font-extrabold text-white mt-1 group-hover:scale-105 transition-transform">
              {user.favorites_count ?? favorites.length}
            </div>
          </button>

          {/* Leituras */}
          <button
            onClick={() => setActiveTab('history')}
            className={`p-3.5 rounded-2xl border text-center transition-all group ${
              activeTab === 'history'
                ? 'bg-brand-950/40 border-brand-500/50 shadow-md shadow-brand-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-brand-500/30'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-brand-300 flex items-center justify-center gap-1 transition-colors">
              <BookOpen className="w-3 h-3 text-brand-400" />
              Leituras
            </span>
            <div className="text-xl font-extrabold text-white mt-1 group-hover:scale-105 transition-transform">
              {user.history_count ?? history.length}
            </div>
          </button>

          {/* Devocionais */}
          <button
            onClick={() => setActiveTab('devotionals')}
            className={`p-3.5 rounded-2xl border text-center transition-all group ${
              activeTab === 'devotionals'
                ? 'bg-rose-950/40 border-rose-500/50 shadow-md shadow-rose-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-rose-500/30'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-rose-300 flex items-center justify-center gap-1 transition-colors">
              <Flame className="w-3 h-3 text-rose-400" />
              Devocionais
              {metricsLoading.devotionals && <RefreshCw className="w-2.5 h-2.5 animate-spin text-rose-400" />}
              {metricsErrors.devotionals && <AlertCircle className="w-2.5 h-2.5 text-rose-400" />}
            </span>
            <div className="text-xl font-extrabold text-white mt-1 group-hover:scale-105 transition-transform">
              {user.devotionals_count ?? devotionals.length}
            </div>
          </button>

          {/* Chamados / Tickets */}
          <button
            onClick={() => setActiveTab('tickets')}
            className={`p-3.5 rounded-2xl border text-center transition-all group ${
              activeTab === 'tickets'
                ? 'bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-blue-500/30'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-blue-300 flex items-center justify-center gap-1 transition-colors">
              <LifeBuoy className="w-3 h-3 text-blue-400" />
              Chamados
              {metricsLoading.tickets && <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400" />}
              {metricsErrors.tickets && <AlertCircle className="w-2.5 h-2.5 text-rose-400" />}
            </span>
            <div className="text-xl font-extrabold text-white mt-1 group-hover:scale-105 transition-transform">
              {user.tickets_count ?? tickets.length}
            </div>
          </button>

          {/* Dispositivos */}
          <button
            onClick={() => setActiveTab('devices')}
            className={`p-3.5 rounded-2xl border text-center transition-all group ${
              activeTab === 'devices'
                ? 'bg-purple-950/40 border-purple-500/50 shadow-md shadow-purple-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-purple-500/30'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-purple-300 flex items-center justify-center gap-1 transition-colors">
              <Smartphone className="w-3 h-3 text-purple-400" />
              Dispositivos
              {metricsLoading.devices && <RefreshCw className="w-2.5 h-2.5 animate-spin text-purple-400" />}
              {metricsErrors.devices && <AlertCircle className="w-2.5 h-2.5 text-rose-400" />}
            </span>
            <div className="text-xl font-extrabold text-white mt-1 group-hover:scale-105 transition-transform">
              {user.devices_count ?? (devices.length || (user.device_id ? 1 : 0))}
            </div>
          </button>

          {/* Não Lidas / Notificações */}
          <button
            onClick={() => setActiveTab('notifications')}
            className={`p-3.5 rounded-2xl border text-center transition-all group ${
              activeTab === 'notifications'
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-emerald-500/30'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors">
              <Bell className="w-3 h-3 text-emerald-400" />
              Não Lidas
              {metricsLoading.notifications && <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-400" />}
              {metricsErrors.notifications && <AlertCircle className="w-2.5 h-2.5 text-rose-400" />}
            </span>
            <div className="text-xl font-extrabold text-white mt-1 group-hover:scale-105 transition-transform">
              {user.unread_notifications_count ?? notifications.filter((n) => !n.is_read).length}
            </div>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'summary', label: 'Resumo da Conta', icon: Settings },
          { id: 'activity', label: 'Linha do Tempo', icon: Activity },
          { id: 'favorites', label: `Favoritos (${user.favorites_count || 0})`, icon: Bookmark },
          { id: 'history', label: `Histórico de Leitura (${user.history_count || 0})`, icon: BookOpen },
          { id: 'devotionals', label: `Devocionais (${user.devotionals_count || 0})`, icon: Flame },
          { id: 'tickets', label: `Chamados (${user.tickets_count || 0})`, icon: LifeBuoy },
          { id: 'notifications', label: 'Notificações', icon: Bell },
          { id: 'devices', label: `Dispositivos (${user.devices_count || devices.length || (user.device_id ? 1 : 0)})`, icon: Smartphone },
          { id: 'premium', label: 'Assinatura & Benefícios', icon: Crown },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      {loadingSubresource ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-slate-900/40 border border-slate-800 rounded-2xl animate-fade-in">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
          <span className="text-xs">Carregando métricas e dados de {activeTab} do servidor...</span>
        </div>
      ) : subresourceError ? (
        <div className="p-8 text-center bg-rose-950/30 border border-rose-800/60 rounded-2xl space-y-3 animate-fade-in">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Erro ao Carregar {activeTab}
            </h4>
            <p className="text-xs text-rose-300 font-mono">{subresourceError}</p>
          </div>
          <button
            onClick={loadTab}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account details */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-brand-400" />
                  <span>Detalhes Cadastrais</span>
                </h3>
                <div className="space-y-2 text-xs divide-y divide-slate-800/60">
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Identificador Único (UUID)</span>
                    <span className="font-mono text-white text-[11px] select-all">{user.id}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Nome de Exibição</span>
                    <span className="text-white font-medium">{user.name || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">E-mail Cadastrado</span>
                    <span className="text-white font-medium">{user.email || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Tipo de Usuário</span>
                    <span className="text-white font-medium">
                      {user.is_anonymous ? 'Conta Anônima / Visitante' : 'Conta Autenticada'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Idioma da Interface</span>
                    <span className="text-white font-mono uppercase">{user.language}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Dispositivo Principal</span>
                    <span className="text-white font-mono text-[11px]">{user.device_name || user.device_id || 'Nenhum'}</span>
                  </div>
                </div>
              </div>

              {/* Preferences & Experience */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-brand-400" />
                  <span>Preferências do Aplicativo</span>
                </h3>
                <div className="space-y-2 text-xs divide-y divide-slate-800/60">
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Tradução Bíblica Preferida</span>
                    <span className="text-white font-bold px-2 py-0.5 rounded bg-slate-800 font-mono">
                      {user.preferences?.preferred_translation || 'NVI'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Tema do Aplicativo</span>
                    <span className="text-white font-medium">
                      {user.preferences?.theme_mode === 'DARK'
                        ? 'Modo Escuro'
                        : user.preferences?.theme_mode === 'LIGHT'
                        ? 'Modo Claro'
                        : 'Automático (Sistema)'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Tamanho da Fonte</span>
                    <span className="text-white font-medium">{user.preferences?.text_scale || 'Normal'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Notificação Diária</span>
                    <span className="text-white font-medium">
                      {user.preferences?.notifications_enabled ? (
                        <span className="text-emerald-400 font-bold">
                          Ativada às {String(user.preferences.notification_hour).padStart(2, '0')}:
                          {String(user.preferences.notification_minute).padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-slate-500">Desativada</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Metrics Panel */}
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-400" />
                    <span>Métricas do Usuário (FastAPI :userId)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dados operacionais sincronizados do backend em tempo real para o identificador {userId}
                  </p>
                </div>
                <button
                  onClick={() => userId && fetchAllMetrics(userId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Atualizar Todas as Métricas</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Metric 1: Favoritos */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4 text-amber-400" />
                        Favoritos
                      </span>
                      {metricsLoading.favorites ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : metricsErrors.favorites ? (
                        <span className="text-[10px] text-rose-400 font-bold">Erro</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold">Sincronizado</span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white mt-2">
                      {user.favorites_count ?? favorites.length}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {metricsErrors.favorites ? (
                        <span className="text-rose-400">{metricsErrors.favorites}</span>
                      ) : favorites.length > 0 ? (
                        `Último: ${favorites[0].reference}`
                      ) : (
                        'Nenhum versículo favoritado'
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('favorites')}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Ver Favoritos →
                    </button>
                    {metricsErrors.favorites && userId && (
                      <button
                        onClick={() => fetchFavoritesData(userId)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                </div>

                {/* Metric 2: Histórico de Leituras */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-brand-400" />
                        Histórico de Leitura
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Sincronizado</span>
                    </div>
                    <div className="text-2xl font-black text-white mt-2">
                      {user.history_count ?? history.length}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {history.length > 0 ? `Última: ${history[0].reference}` : 'Capítulos e versículos lidos'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Ver Histórico →
                    </button>
                  </div>
                </div>

                {/* Metric 3: Devocionais */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-rose-400" />
                        Devocionais
                      </span>
                      {metricsLoading.devotionals ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                      ) : metricsErrors.devotionals ? (
                        <span className="text-[10px] text-rose-400 font-bold">Erro</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold">Sincronizado</span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white mt-2">
                      {user.devotionals_count ?? devotionals.length}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {metricsErrors.devotionals ? (
                        <span className="text-rose-400">{metricsErrors.devotionals}</span>
                      ) : devotionals.length > 0 ? (
                        `${devotionals.filter((d) => d.is_completed).length} concluídos, ${
                          devotionals.filter((d) => !d.is_completed).length
                        } ativos`
                      ) : (
                        'Nenhum plano iniciado'
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('devotionals')}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Ver Planos →
                    </button>
                    {metricsErrors.devotionals && userId && (
                      <button
                        onClick={() => fetchDevotionalsData(userId)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                </div>

                {/* Metric 4: Tickets de Suporte */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <LifeBuoy className="w-4 h-4 text-blue-400" />
                        Chamados (Tickets)
                      </span>
                      {metricsLoading.tickets ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      ) : metricsErrors.tickets ? (
                        <span className="text-[10px] text-rose-400 font-bold">Erro</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold">Sincronizado</span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white mt-2">
                      {user.tickets_count ?? tickets.length}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {metricsErrors.tickets ? (
                        <span className="text-rose-400">{metricsErrors.tickets}</span>
                      ) : tickets.length > 0 ? (
                        `${tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length} em andamento`
                      ) : (
                        'Nenhum chamado aberto'
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('tickets')}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Ver Chamados →
                    </button>
                    {metricsErrors.tickets && userId && (
                      <button
                        onClick={() => fetchTicketsData(userId)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                </div>

                {/* Metric 5: Dispositivos Registrados */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-purple-400" />
                        Dispositivos
                      </span>
                      {metricsLoading.devices ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      ) : metricsErrors.devices ? (
                        <span className="text-[10px] text-rose-400 font-bold">Erro</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold">Sincronizado</span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white mt-2">
                      {user.devices_count ?? (devices.length || (user.device_id ? 1 : 0))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {metricsErrors.devices ? (
                        <span className="text-rose-400">{metricsErrors.devices}</span>
                      ) : devices.length > 0 ? (
                        `${devices.filter((d) => d.active).length} com Push ativo (${devices[0].platform.toUpperCase()})`
                      ) : user.device_name ? (
                        `${user.device_name} (${user.platform?.toUpperCase() || 'Mobile'})`
                      ) : (
                        'Nenhum dispositivo registrado'
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('devices')}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Ver Dispositivos →
                    </button>
                    {metricsErrors.devices && userId && (
                      <button
                        onClick={() => fetchDevicesData(userId)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                </div>

                {/* Metric 6: Notificações */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-emerald-400" />
                        Notificações
                      </span>
                      {metricsLoading.notifications ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      ) : metricsErrors.notifications ? (
                        <span className="text-[10px] text-rose-400 font-bold">Erro</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold">Sincronizado</span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white mt-2">
                      {user.unread_notifications_count ?? notifications.filter((n) => !n.is_read).length}
                      <span className="text-xs font-normal text-slate-500 ml-1.5">
                        / {notifications.length} total
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {metricsErrors.notifications ? (
                        <span className="text-rose-400">{metricsErrors.notifications}</span>
                      ) : (
                        `${notifications.filter((n) => !n.is_read).length} mensagens não lidas`
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Ver Notificações →
                    </button>
                    {metricsErrors.notifications && userId && (
                      <button
                        onClick={() => fetchNotificationsData(userId)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* TAB 2: ACTIVITY TIMELINE */}
          {activeTab === 'activity' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-400" />
                <span>Linha do Tempo de Atividades Reais</span>
              </h3>

              {timeline.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhuma atividade registrada para este usuário ainda.
                </div>
              ) : (
                <div className="relative border-l border-slate-800 ml-4 space-y-6">
                  {timeline.map((item) => (
                    <div key={item.id} className="relative pl-6">
                      <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-slate-950" />
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FAVORITES */}
          {activeTab === 'favorites' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Versículos Favoritados ({favorites.length})
                  </h3>
                </div>
                {userId && (
                  <button
                    onClick={() => fetchFavoritesData(userId)}
                    disabled={metricsLoading.favorites}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading.favorites ? 'animate-spin text-amber-400' : ''}`} />
                    <span>{metricsLoading.favorites ? 'Atualizando...' : 'Recarregar'}</span>
                  </button>
                )}
              </div>

              {metricsErrors.favorites && (
                <div className="p-4 bg-rose-950/40 border-b border-rose-800/60 flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{metricsErrors.favorites}</span>
                  </div>
                  {userId && (
                    <button
                      onClick={() => fetchFavoritesData(userId)}
                      className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-850 text-white rounded font-bold text-[11px]"
                    >
                      Tentar Novamente
                    </button>
                  )}
                </div>
              )}

              {favorites.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  O usuário ainda não favoritou nenhum versículo.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-brand-300 text-xs">{fav.reference}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(fav.created_at).toLocaleDateString('pt-BR')} ({fav.translation})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 italic">"{fav.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: READING HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Histórico Recente de Leituras ({history.length})
                </h3>
              </div>

              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nenhuma leitura recente registrada.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {history.map((hist) => (
                    <div key={hist.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-xs">{hist.reference}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(hist.read_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">"{hist.text}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DEVOTIONALS */}
          {activeTab === 'devotionals' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Planos Devocionais ({devotionals.length})
                  </h3>
                </div>
                {userId && (
                  <button
                    onClick={() => fetchDevotionalsData(userId)}
                    disabled={metricsLoading.devotionals}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading.devotionals ? 'animate-spin text-rose-400' : ''}`} />
                    <span>{metricsLoading.devotionals ? 'Atualizando...' : 'Recarregar'}</span>
                  </button>
                )}
              </div>

              {metricsErrors.devotionals && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{metricsErrors.devotionals}</span>
                  </div>
                  {userId && (
                    <button
                      onClick={() => fetchDevotionalsData(userId)}
                      className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-850 text-white rounded font-bold text-[11px]"
                    >
                      Tentar Novamente
                    </button>
                  )}
                </div>
              )}

              {devotionals.length === 0 ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                  O usuário ainda não iniciou planos devocionais.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devotionals.map((dev) => (
                    <div
                      key={dev.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-white">{dev.title}</h4>
                        {dev.is_completed ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                            Concluído
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60 uppercase">
                            Em Andamento
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">
                            Dia {dev.current_day} de {dev.total_days} dias
                          </span>
                          <span className="font-bold text-brand-400">{dev.progress_percent}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all"
                            style={{ width: `${dev.progress_percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 flex justify-between">
                        <span>Dias concluídos: {dev.completed_days_count}</span>
                        <span>Última leitura: {new Date(dev.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SUPPORT TICKETS */}
          {activeTab === 'tickets' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Chamados de Suporte ({tickets.length})
                  </h3>
                </div>
                {userId && (
                  <button
                    onClick={() => fetchTicketsData(userId)}
                    disabled={metricsLoading.tickets}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading.tickets ? 'animate-spin text-blue-400' : ''}`} />
                    <span>{metricsLoading.tickets ? 'Atualizando...' : 'Recarregar'}</span>
                  </button>
                )}
              </div>

              {metricsErrors.tickets && (
                <div className="p-4 bg-rose-950/40 border-b border-rose-800/60 flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{metricsErrors.tickets}</span>
                  </div>
                  {userId && (
                    <button
                      onClick={() => fetchTicketsData(userId)}
                      className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-850 text-white rounded font-bold text-[11px]"
                    >
                      Tentar Novamente
                    </button>
                  )}
                </div>
              )}

              {tickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nenhum chamado de suporte aberto por este usuário.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Protocolo</th>
                      <th className="px-4 py-3">Assunto</th>
                      <th className="px-4 py-3">Prioridade</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-mono font-bold text-brand-400">
                          {t.ticket_number}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{t.subject}</td>
                        <td className="px-4 py-3 capitalize">{t.priority.toLowerCase()}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(t.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate(`/tickets?id=${t.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 hover:bg-blue-900 border border-blue-800/60 font-bold text-[11px] transition-colors"
                          >
                            <span>Abrir Ticket</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 7: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Notificações do Usuário ({notifications.length})
                  </h3>
                </div>
                {userId && (
                  <button
                    onClick={() => fetchNotificationsData(userId)}
                    disabled={metricsLoading.notifications}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading.notifications ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{metricsLoading.notifications ? 'Atualizando...' : 'Recarregar'}</span>
                  </button>
                )}
              </div>

              {metricsErrors.notifications && (
                <div className="p-4 bg-rose-950/40 border-b border-rose-800/60 flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{metricsErrors.notifications}</span>
                  </div>
                  {userId && (
                    <button
                      onClick={() => fetchNotificationsData(userId)}
                      className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-850 text-white rounded font-bold text-[11px]"
                    >
                      Tentar Novamente
                    </button>
                  )}
                </div>
              )}

              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nenhuma notificação registrada.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{n.title}</h4>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              n.is_read
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-brand-950 text-brand-400 border border-brand-800/60'
                            }`}
                          >
                            {n.is_read ? 'Lida' : 'Não Lida'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Dispositivos Registrados ({devices.length})
                  </h3>
                </div>
                {userId && (
                  <button
                    onClick={() => fetchDevicesData(userId)}
                    disabled={metricsLoading.devices}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading.devices ? 'animate-spin text-purple-400' : ''}`} />
                    <span>{metricsLoading.devices ? 'Atualizando...' : 'Recarregar'}</span>
                  </button>
                )}
              </div>

              {metricsErrors.devices && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{metricsErrors.devices}</span>
                  </div>
                  {userId && (
                    <button
                      onClick={() => fetchDevicesData(userId)}
                      className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-850 text-white rounded font-bold text-[11px]"
                    >
                      Tentar Novamente
                    </button>
                  )}
                </div>
              )}

              {metricsLoading.devices ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                  <span className="text-xs">Buscando dispositivos registrados do usuário...</span>
                </div>
              ) : devices.length === 0 ? (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                  Nenhum dispositivo registrado para este usuário.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devices.map((d) => (
                    <div
                      key={d.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold text-white">{d.device_name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            d.active
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {d.active ? 'Push Ativo' : 'Push Inativo'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Plataforma</span>
                          <span className="text-white capitalize">{d.platform}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Versão do App</span>
                          <span className="text-white font-mono">{d.app_version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>FCM Token (Mascarado)</span>
                          <span className="font-mono text-slate-300 text-[11px]">{d.token_masked}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Última Atividade</span>
                          <span className="text-slate-300">
                            {new Date(d.last_seen_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {d.last_success_at && (
                          <div className="flex justify-between">
                            <span>Último Sucesso de Push</span>
                            <span className="text-emerald-400 font-medium">
                              {new Date(d.last_success_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                        {d.last_failure_at && (
                          <div className="flex justify-between">
                            <span className="text-rose-400">Última Falha de Push</span>
                            <span className="text-rose-400 font-medium">
                              {new Date(d.last_failure_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                        {d.failure_count > 0 && (
                          <div className="flex justify-between">
                            <span className="text-rose-400">Falhas Consecutivas</span>
                            <span className="text-rose-400 font-bold">{d.failure_count}</span>
                          </div>
                        )}
                        {d.last_error && (
                          <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-300">
                            <span className="font-bold">Último Erro: </span>
                            <span>{d.last_error}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: SUBSCRIPTIONS & GRANTS */}
          {activeTab === 'premium' && (
            <div className="space-y-6">
              {/* Google Play Subscriptions Section */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Assinaturas Google Play (Autoridade Externa)</span>
                  </h3>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    Somente Leitura
                  </span>
                </div>

                {entitlements.subscriptions.length === 0 ? (
                  <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center text-xs text-slate-500">
                    Nenhuma assinatura do Google Play registrada para esta conta.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entitlements.subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{sub.product_title || sub.product_id}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {sub.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400">
                          <div>
                            <span className="text-slate-500 block">Início:</span>
                            <span>{new Date(sub.starts_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Renovação:</span>
                            <span>
                              {sub.renews_at
                                ? new Date(sub.renews_at).toLocaleDateString('pt-BR')
                                : 'Não aplicável'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Expiração:</span>
                            <span>
                              {sub.expires_at
                                ? new Date(sub.expires_at).toLocaleDateString('pt-BR')
                                : 'Ativa'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Recibo Mascarado:</span>
                            <span className="font-mono text-slate-300">{sub.purchase_token_masked}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Administrative Grants Section */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      <span>Benefícios Administrativos Concedidos (Entitlements)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cortesias e acessos especiais auditados concedidos pela equipe
                    </p>
                  </div>
                  {!isDeleted && hasPermission('monetization.write') && (
                    <button
                      onClick={() => setShowGrantModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Conceder Benefício</span>
                    </button>
                  )}
                </div>

                {entitlements.grants.length === 0 ? (
                  <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center text-xs text-slate-500">
                    Nenhum benefício administrativo concedido até o momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entitlements.grants.map((grant) => (
                      <div
                        key={grant.id}
                        className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-4 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{grant.entitlement_id}</span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                grant.is_active
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {grant.is_active ? 'Ativo' : 'Expirado'}
                            </span>
                          </div>
                          <p className="text-slate-400 mt-1">Motivo: {grant.reason || 'Sem justificativa'}</p>
                          <div className="text-[10px] text-slate-500 mt-1 flex gap-3">
                            <span>Concedido por: {grant.granted_by_admin_name || 'Admin'}</span>
                            <span>Início: {new Date(grant.starts_at).toLocaleDateString('pt-BR')}</span>
                            {grant.expires_at && (
                              <span>Expira: {new Date(grant.expires_at).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Grant Entitlement Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              <span>Conceder Benefício Administrativo</span>
            </h3>
            <p className="text-xs text-slate-400">
              Libere acesso Premium ou recursos especiais diretamente para a conta de{' '}
              <strong className="text-white">{user.name || user.email || user.id}</strong>.
            </p>

            <form onSubmit={handleGrantEntitlement} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Benefício / Entitlement ID
                </label>
                <select
                  value={grantEntitlementId}
                  onChange={(e) => setGrantEntitlementId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="premium_full">premium_full (Acesso Total Sem Anúncios)</option>
                  <option value="audio_bibles">audio_bibles (Bíblias em Áudio)</option>
                  <option value="offline_download">offline_download (Leitura Offline)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Duração da Concessão
                </label>
                <select
                  value={grantDays}
                  onChange={(e) => setGrantDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="7">7 dias (Degustação)</option>
                  <option value="30">30 dias (1 mês)</option>
                  <option value="90">90 dias (3 meses)</option>
                  <option value="365">365 dias (1 ano)</option>
                  <option value="">Permanente / Sem expiração</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Motivo da Concessão <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  placeholder="Ex: Compensação por instabilidade reportada no chamado TKT-1002"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingGrant || !grantReason.trim()}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                >
                  {submittingGrant ? 'Concedendo...' : 'Confirmar Benefício'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
