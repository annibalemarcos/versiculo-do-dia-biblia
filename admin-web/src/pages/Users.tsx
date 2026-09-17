import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserItem } from '../types';
import {
  Users as UsersIcon,
  Search,
  Filter,
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Crown,
  ChevronLeft,
  ChevronRight,
  X,
  Smartphone,
  Bookmark,
  BookOpen,
  LifeBuoy,
  Bell,
  CreditCard,
  Layers,
  Plus,
  RefreshCw,
  Clock,
  Settings,
  Check,
  Calendar,
  Sparkles,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Activity,
  UserCheck,
  UserX,
  Mail,
  Globe,
  Flame,
  ExternalLink
} from 'lucide-react';

export const Users: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentAppId, hasPermission } = useAuth();

  // Read initial values from URL query parameters
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const initialStatus = (searchParams.get('status') || '').toLowerCase();
  const initialPlan = (searchParams.get('plan') || searchParams.get('is_premium') || '').toLowerCase();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Local search input + debounced value
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  
  const [filterPremium, setFilterPremium] = useState<string>(
    initialPlan === 'true' || initialPlan === 'premium' ? 'premium' :
    initialPlan === 'false' || initialPlan === 'free' || initialPlan === 'gratuito' ? 'free' : ''
  );
  const [filterStatus, setFilterStatus] = useState<string>(
    initialStatus === 'active' || initialStatus === 'ativos' ? 'active' :
    initialStatus === 'blocked' || initialStatus === 'bloqueados' ? 'blocked' :
    initialStatus === 'deleted' || initialStatus === 'excluidos' ? 'deleted' : ''
  );
  const [page, setPage] = useState(initialPage > 0 ? initialPage : 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 300ms Debounce on search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync state changes with URL query parameters
  useEffect(() => {
    const params: Record<string, string> = {};
    if (page > 1) params.page = String(page);
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (filterStatus) params.status = filterStatus;
    if (filterPremium) params.plan = filterPremium;
    if (currentAppId) params.app_id = currentAppId;

    setSearchParams(params, { replace: true });
  }, [page, debouncedSearch, filterStatus, filterPremium, currentAppId, setSearchParams]);

  // Detail & Full Profile View State
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'drawer' | 'full'>('drawer');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'activity' | 'favorites' | 'history' | 'devotionals' | 'tickets' | 'notifications' | 'devices' | 'premium'>('summary');
  const [tabData, setTabData] = useState<{
    activity: any[];
    favorites: any[];
    history: any[];
    devotionals: any[];
    tickets: any[];
    notifications: any[];
    devices: any[];
    entitlements: { grants: any[]; subscriptions: any[] };
  }>({
    activity: [],
    favorites: [],
    history: [],
    devotionals: [],
    tickets: [],
    notifications: [],
    devices: [],
    entitlements: { grants: [], subscriptions: [] }
  });
  const [loadingTab, setLoadingTab] = useState(false);

  // Grant Entitlement Form State
  const [grantEntitlementId, setGrantEntitlementId] = useState('premium_full');
  const [grantReason, setGrantReason] = useState('');
  const [grantDays, setGrantDays] = useState('30');
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const params: any = {
      page,
      limit: 15,
      search: debouncedSearch.trim() || undefined,
      app_id: currentAppId,
    };
    if (filterPremium === 'premium') params.plan = 'PREMIUM';
    if (filterPremium === 'free') params.plan = 'FREE';
    if (filterStatus) params.status = filterStatus.toUpperCase();

    const res = await api.get<{
      items: UserItem[];
      pagination: { total: number; page: number; pages: number };
    }>('/admin/users', params);

    if (res.success && res.data) {
      setUsers(res.data.items);
      setTotalPages(res.data.pagination.pages);
      setTotalCount(res.data.pagination.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, filterPremium, filterStatus, currentAppId]);

  const handleOpenDetail = async (user: UserItem, mode: 'drawer' | 'full' = 'drawer') => {
    if (mode === 'full') {
      navigate(`/users/${user.id}`);
      return;
    }
    setViewMode('drawer');
    setLoadingDetail(true);
    setActiveTab('summary');
    const res = await api.get<any>(`/admin/users/${user.id}`);
    if (res.success && res.data) {
      setSelectedUser(res.data);
    }
    setLoadingDetail(false);
  };

  // Load sub-resource data when tab changes
  useEffect(() => {
    if (!selectedUser) return;
    const userId = selectedUser.id;

    const loadTabData = async () => {
      if (activeTab === 'summary') return;
      setLoadingTab(true);

      if (activeTab === 'activity') {
        const res = await api.get<any[]>(`/admin/users/${userId}/activity`);
        if (res.success && res.data) {
          setTabData(prev => ({ ...prev, activity: res.data || [] }));
        }
      } else if (activeTab === 'favorites') {
        const res = await api.get<any[]>(`/admin/users/${userId}/favorites`);
        if (res.success && res.data) {
          setTabData(prev => ({ ...prev, favorites: res.data || [] }));
        }
      } else if (activeTab === 'history') {
        const res = await api.get<any[]>(`/admin/users/${userId}/history?limit=50`);
        if (res.success && res.data) {
          setTabData(prev => ({ ...prev, history: res.data || [] }));
        }
      } else if (activeTab === 'devotionals') {
        const res = await api.get<any[]>(`/admin/users/${userId}/devotionals`);
        if (res.success && res.data) {
          setTabData(prev => ({ ...prev, devotionals: res.data || [] }));
        }
      } else if (activeTab === 'tickets') {
        const res = await api.get<any[]>(`/admin/users/${userId}/tickets`);
        if (res.success && res.data) {
          setTabData(prev => ({ ...prev, tickets: res.data || [] }));
        }
      } else if (activeTab === 'notifications') {
        const res = await api.get<any[]>(`/admin/users/${userId}/notifications?limit=50`);
        if (res.success && res.data) {
          setTabData(prev => ({ ...prev, notifications: res.data || [] }));
        }
      } else if (activeTab === 'devices') {
        const res = await api.get<any[]>(`/admin/users/${userId}/devices`);
        if (res.success && res.data) {
          setTabData(prev => ({ ...prev, devices: res.data || [] }));
        }
      } else if (activeTab === 'premium') {
        const res = await api.get<{ grants: any[]; subscriptions: any[] }>(`/admin/users/${userId}/entitlements`);
        if (res.success && res.data) {
          setTabData(prev => ({ ...prev, entitlements: res.data || { grants: [], subscriptions: [] } }));
        }
      }

      setLoadingTab(false);
    };

    loadTabData();
  }, [activeTab, selectedUser?.id]);

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const res = await api.put(`/admin/users/${userId}/status?is_active=${newStatus}`);
    if (res.success) {
      showToast(`Status do usuário atualizado para ${newStatus ? 'Ativo' : 'Bloqueado'}`);
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, is_active: newStatus });
      }
    } else {
      alert(res.error?.message || 'Erro ao alterar status');
    }
  };

  const handleTogglePremium = async (userId: string, currentPremium: boolean) => {
    const newPremium = !currentPremium;
    const res = await api.put(`/admin/users/${userId}/premium?is_premium=${newPremium}`);
    if (res.success) {
      showToast(`Status Premium atualizado para ${newPremium ? 'Ativo' : 'Inativo'}`);
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, is_premium: newPremium });
      }
    } else {
      alert(res.error?.message || 'Erro ao alterar status premium');
    }
  };

  const handleGrantEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !grantReason.trim()) return;

    setIsSubmittingGrant(true);
    const res = await api.post(`/admin/users/${selectedUser.id}/entitlements`, {
      entitlement_id: grantEntitlementId,
      reason: grantReason.trim(),
      days: grantDays ? parseInt(grantDays, 10) : null
    });

    setIsSubmittingGrant(false);
    if (res.success) {
      showToast('Benefício concedido com sucesso ao usuário!');
      setGrantReason('');
      // Reload entitlements tab & user detail
      const entRes = await api.get<{ grants: any[]; subscriptions: any[] }>(`/admin/users/${selectedUser.id}/entitlements`);
      if (entRes.success && entRes.data) {
        setTabData(prev => ({ ...prev, entitlements: entRes.data }));
      }
      const userRes = await api.get<any>(`/admin/users/${selectedUser.id}`);
      if (userRes.success && userRes.data) {
        setSelectedUser(userRes.data);
      }
      fetchUsers();
    } else {
      alert(res.error?.message || 'Erro ao conceder benefício');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Base de Usuários do Aplicativo
          </h2>
          <p className="text-xs text-slate-400">
            Total de {totalCount} usuários registrados e sincronizados
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou UUID..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          aria-label="Filtrar por Status da Conta"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
        >
          <option value="">STATUS: TODOS</option>
          <option value="active">ATIVOS</option>
          <option value="blocked">BLOQUEADOS</option>
          <option value="deleted">EXCLUÍDOS</option>
        </select>

        <select
          aria-label="Filtrar por Plano"
          value={filterPremium}
          onChange={(e) => {
            setFilterPremium(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
        >
          <option value="">PLANO: TODOS</option>
          <option value="premium">PREMIUM</option>
          <option value="free">GRATUITOS</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Usuário / Identificação</th>
                <th className="px-5 py-3.5">Plataforma & Idioma</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Plano / Premium</th>
                <th className="px-5 py-3.5">Data de Cadastro</th>
                <th className="px-5 py-3.5">Histórico & Atividade</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    Carregando base de usuários...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isDeleted = !!u.is_deleted;
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isDeleted
                          ? 'bg-slate-950/40 opacity-60 hover:opacity-80'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDetail(u, 'full')}
                            className={`font-bold hover:text-brand-400 hover:underline transition-colors text-left ${
                              isDeleted ? 'text-slate-400 line-through' : 'text-white'
                            }`}
                            title="Abrir perfil completo"
                          >
                            {u.name || (u.is_anonymous ? 'Usuário Anônimo' : 'Sem Nome')}
                          </button>
                          {isDeleted && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/60 uppercase">
                              Excluído
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {u.email || u.id.substring(0, 16) + '...'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 capitalize font-medium text-slate-300">
                          <Smartphone className="w-3.5 h-3.5 text-brand-400" />
                          <span>{u.platform}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">{u.language}</span>
                      </td>
                      <td className="px-5 py-4">
                        {isDeleted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-900 text-slate-400 border border-slate-700">
                            Excluído
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              u.is_active
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {u.is_active ? (
                              <>
                                <CheckCircle2 className="w-2.5 h-2.5" /> Ativo
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5" /> Bloqueado
                              </>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {u.is_premium ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60 shadow-sm">
                            <Crown className="w-3 h-3" />
                            Premium
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            Gratuito
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Acesso: {new Date(u.last_seen_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300" title="Histórico de Leitura Bíblica">
                            <BookOpen className="w-3 h-3 text-brand-400" />
                            <strong className="text-white">{u.history_count}</strong>
                            <span className="text-[10px] text-slate-500">leituras</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300" title="Versículos Favoritados">
                            <Bookmark className="w-3 h-3 text-amber-400" />
                            <strong className="text-white">{u.favorites_count}</strong>
                            <span className="text-[10px] text-slate-500">favs</span>
                          </span>
                          {(u.tickets_count !== undefined && u.tickets_count > 0) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-bold" title="Chamados de suporte">
                              <LifeBuoy className="w-2.5 h-2.5" />
                              {u.tickets_count}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenDetail(u, 'drawer')}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          title="Visualização rápida (Painel Lateral)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDetail(u, 'full')}
                          className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                          title="Detalhamento do perfil (Tela Cheia / Nova Visualização)"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        {!isDeleted && hasPermission('users.block') && (
                          <button
                            onClick={() => handleToggleBlock(u.id, u.is_active)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.is_active
                                ? 'text-slate-400 hover:text-red-400 hover:bg-red-950/30'
                                : 'text-red-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                            }`}
                            title={u.is_active ? 'Bloquear usuário' : 'Desbloquear usuário'}
                          >
                            {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Página {page} de {totalPages} ({totalCount} usuários)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 360 User Profile Detail Drawer & Full Profile Modal */}
      {selectedUser && (
        <div className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex ${viewMode === 'full' ? 'items-center justify-center p-4 sm:p-6' : 'items-center justify-end'}`}>
          <div className={`bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            viewMode === 'full' 
              ? 'w-full max-w-5xl h-[92vh] rounded-3xl p-6 sm:p-8' 
              : 'h-full max-w-2xl w-full p-6 border-l'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                {viewMode === 'full' && (
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors mr-1"
                    title="Voltar para listagem"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                  {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {selectedUser.name || 'Usuário Anônimo'}
                    </h3>
                    {selectedUser.is_premium ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60">
                        <Crown className="w-3 h-3" /> Premium
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        Gratuito
                      </span>
                    )}
                    {selectedUser.is_active ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Ativo
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">
                        Bloqueado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {selectedUser.email || selectedUser.id}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const uid = selectedUser.id;
                    setSelectedUser(null);
                    navigate(`/users/${uid}`);
                  }}
                  className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold border border-slate-800"
                  title="Abrir perfil completo em página dedicada"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                  <span className="hidden sm:inline">Página Completa</span>
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-800 pt-3 pb-0 overflow-x-auto scrollbar-none text-xs">
              {[
                { id: 'summary', label: 'Resumo', icon: UsersIcon },
                { id: 'activity', label: 'Atividade', icon: Activity },
                { id: 'favorites', label: `Favoritos (${selectedUser.favorites_count || 0})`, icon: Bookmark },
                { id: 'history', label: `Leitura (${selectedUser.history_count || 0})`, icon: BookOpen },
                { id: 'devotionals', label: `Devocionais (${selectedUser.devotionals_count || 0})`, icon: Flame },
                { id: 'tickets', label: `Chamados (${selectedUser.tickets_count || 0})`, icon: LifeBuoy },
                { id: 'notifications', label: 'Notificações', icon: Bell },
                { id: 'devices', label: 'Dispositivos', icon: Smartphone },
                { id: 'premium', label: 'Premium & Acesso', icon: Crown },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 font-bold border-b-2 whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-brand-400 border-brand-400 bg-brand-500/5'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
              {loadingTab ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-brand-400" />
                  <span>Carregando dados da aba...</span>
                </div>
              ) : (
                <>
                  {/* TAB: SUMMARY */}
                  {activeTab === 'summary' && (
                    <div className="space-y-4">
                      {selectedUser.is_deleted && (
                        <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-300 space-y-1">
                          <div className="font-bold flex items-center gap-2 text-xs">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            Conta Excluída pelo Usuário
                          </div>
                          <p className="text-[11px] text-red-300/80">
                            Esta conta foi permanentemente desativada e anonimizada a pedido do usuário
                            {selectedUser.deleted_at && ` em ${new Date(selectedUser.deleted_at).toLocaleString('pt-BR')}`}.
                          </p>
                        </div>
                      )}

                      {/* General Info Card */}
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-brand-400 flex items-center gap-1.5">
                          <UsersIcon className="w-3.5 h-3.5" /> Identificação e Dados da Conta
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-slate-300">
                          <div>
                            <span className="text-slate-500 block text-[10px]">ID do Usuário</span>
                            <span className="font-mono text-[11px] text-white break-all">{selectedUser.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">E-mail</span>
                            <span className="text-slate-200">{selectedUser.email || 'Não informado (Anônimo)'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Status da Conta</span>
                            <span className="text-slate-200">
                              {selectedUser.is_deleted ? (
                                <span className="text-red-400 font-bold uppercase text-[11px]">Conta Excluída</span>
                              ) : selectedUser.is_active ? (
                                <span className="text-emerald-400 font-bold inline-flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" /> Ativo
                                </span>
                              ) : (
                                <span className="text-red-400 font-bold inline-flex items-center gap-1 text-[11px]">
                                  <Lock className="w-3 h-3" /> Bloqueado
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Assinatura / Plano</span>
                            <span className="text-slate-200">
                              {selectedUser.is_premium ? (
                                <span className="text-brand-400 font-bold inline-flex items-center gap-1 text-[11px]">
                                  <Crown className="w-3 h-3" /> Assinante Premium
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-[11px]">Usuário Gratuito</span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Plataforma</span>
                            <span className="capitalize text-slate-200">{selectedUser.platform}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Idioma</span>
                            <span className="uppercase text-slate-200">{selectedUser.language}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Data de Cadastro</span>
                            <span className="text-slate-200 font-medium">{new Date(selectedUser.created_at).toLocaleString('pt-BR')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Último Acesso</span>
                            <span className="text-slate-200">{new Date(selectedUser.last_seen_at).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Engagement & Activity Stats Card */}
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-brand-400 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5" /> Métricas de Uso & Histórico de Leitura
                          </h4>
                          <button
                            onClick={() => setActiveTab('history')}
                            className="text-[10px] text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1"
                          >
                            Ver detalhes do histórico →
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 text-center">
                            <span className="text-slate-500 block text-[10px]">Histórico de Leituras</span>
                            <span className="text-lg font-bold text-white mt-0.5 block">{selectedUser.history_count || 0}</span>
                            <span className="text-[10px] text-slate-400">capítulos / versículos</span>
                          </div>
                          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 text-center">
                            <span className="text-slate-500 block text-[10px]">Versículos Favoritos</span>
                            <span className="text-lg font-bold text-amber-400 mt-0.5 block">{selectedUser.favorites_count || 0}</span>
                            <span className="text-[10px] text-slate-400">salvos na nuvem</span>
                          </div>
                          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 text-center">
                            <span className="text-slate-500 block text-[10px]">Chamados de Suporte</span>
                            <span className="text-lg font-bold text-blue-400 mt-0.5 block">{selectedUser.tickets_count || 0}</span>
                            <span className="text-[10px] text-slate-400">atendimentos</span>
                          </div>
                        </div>
                      </div>

                      {/* Preferences Card */}
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-brand-400 flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5" /> Preferências do App
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-slate-300">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Tema Visual</span>
                            <span className="font-semibold text-slate-200">{selectedUser.preferences?.theme_mode}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Escala de Texto</span>
                            <span className="font-semibold text-slate-200">{selectedUser.preferences?.text_scale}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Versão Bíblica Padrão</span>
                            <span className="font-semibold text-slate-200">{selectedUser.preferences?.preferred_translation}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Lembrete Diário</span>
                            <span className="text-slate-200">
                              {selectedUser.preferences?.notifications_enabled ? (
                                <span className="text-emerald-400 font-semibold">Ativado ({selectedUser.preferences?.notification_hour}:{String(selectedUser.preferences?.notification_minute || 0).padStart(2, '0')})</span>
                              ) : (
                                <span className="text-slate-500 font-semibold">Desativado</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: ACTIVITY TIMELINE */}
                  {activeTab === 'activity' && (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-400">
                        Linha do tempo consolidada de eventos e ações deste usuário.
                      </div>
                      {tabData.activity.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500">
                          Nenhuma atividade recente registrada.
                        </div>
                      ) : (
                        <div className="relative border-l border-slate-800 ml-3 space-y-4">
                          {tabData.activity.map((act: any) => (
                            <div key={act.id} className="relative pl-5">
                              <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-slate-950" />
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-white">{act.title}</span>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(act.timestamp).toLocaleString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[11px] mt-0.5">{act.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: DEVOTIONALS */}
                  {activeTab === 'devotionals' && (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-400">
                        Planos devocionais e jornadas diárias iniciadas.
                      </div>
                      {tabData.devotionals.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500">
                          Nenhum devocional iniciado por este usuário.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tabData.devotionals.map((dev: any) => (
                            <div key={dev.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-white text-xs">{dev.title}</span>
                                {dev.is_completed ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                                    Concluído
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60 uppercase">
                                    Em Andamento
                                  </span>
                                )}
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">
                                  Dia {dev.current_day} de {dev.total_days}
                                </span>
                                <span className="font-bold text-brand-400">{dev.progress_percent}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-brand-500 h-full rounded-full"
                                  style={{ width: `${dev.progress_percent}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                                <span>Dias concluídos: {dev.completed_days_count}</span>
                                <span>Última leitura: {new Date(dev.updated_at).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: FAVORITES */}
                  {activeTab === 'favorites' && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400">
                        Total de {tabData.favorites.length} versículos favoritados na nuvem.
                      </div>
                      {tabData.favorites.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500">
                          Nenhum versículo favoritado por este usuário.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {tabData.favorites.map((fav: any) => (
                            <div key={fav.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-brand-400">{fav.reference}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {fav.translation} • {new Date(fav.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-slate-300 italic text-[11px] leading-relaxed">
                                "{fav.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: READING HISTORY */}
                  {activeTab === 'history' && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400">
                        Últimos registros de leitura na Bíblia.
                      </div>
                      {tabData.history.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500">
                          Nenhum histórico de leitura sincronizado.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tabData.history.map((hist: any) => (
                            <div key={hist.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white">{hist.reference}</span>
                                <span className="text-[10px] text-slate-500 ml-2 uppercase">({hist.translation})</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {new Date(hist.read_at).toLocaleString('pt-BR')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: TICKETS */}
                  {activeTab === 'tickets' && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400">
                        Chamados de suporte abertos por este usuário.
                      </div>
                      {tabData.tickets.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500">
                          Nenhum chamado de suporte registrado.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {tabData.tickets.map((t: any) => (
                            <div key={t.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-brand-400 text-xs">{t.ticket_number}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                                    {t.category}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  t.status === 'OPEN' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                                  t.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                  t.status === 'CLOSED' ? 'bg-slate-900 text-slate-400 border border-slate-700' :
                                  'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}>
                                  {t.status}
                                </span>
                              </div>
                              <div className="font-semibold text-white text-xs">{t.subject}</div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                                <span>Prioridade: <b className="text-slate-300">{t.priority}</b></span>
                                <span>Criado: {new Date(t.created_at).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: NOTIFICATIONS */}
                  {activeTab === 'notifications' && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400">
                        Histórico de notificações enviadas e recebidas pelo usuário.
                      </div>
                      {tabData.notifications.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500">
                          Nenhuma notificação registrada.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tabData.notifications.map((n: any) => (
                            <div key={n.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white text-xs">{n.title}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  n.is_read ? 'bg-slate-800 text-slate-400' : 'bg-brand-950 text-brand-400 border border-brand-800'
                                }`}>
                                  {n.is_read ? 'Lida' : 'Nova'}
                                </span>
                              </div>
                              <p className="text-slate-300 text-[11px]">{n.message}</p>
                              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                                <span className="font-mono text-[9px] uppercase text-slate-400">Tipo: {n.type}</span>
                                <span>{new Date(n.created_at).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: DEVICES */}
                  {activeTab === 'devices' && (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400">
                        Dispositivos móveis e tokens de Push FCM associados.
                      </div>
                      {tabData.devices.length === 0 ? (
                        <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500">
                          Nenhum token FCM registrado para este usuário.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {tabData.devices.map((d: any) => (
                            <div key={d.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Smartphone className="w-4 h-4 text-brand-400" />
                                  <span className="font-bold text-white text-xs">{d.device_name || 'Dispositivo'}</span>
                                  <span className="text-[10px] text-slate-400 uppercase font-mono">({d.platform})</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  d.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                                }`}>
                                  {d.active ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                                <div>Versão App: <b className="text-slate-200">{d.app_version || '1.0.0'}</b></div>
                                <div>Última Comunicação: <b className="text-slate-200">{new Date(d.last_seen_at).toLocaleDateString('pt-BR')}</b></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: PREMIUM & ENTITLEMENTS */}
                  {activeTab === 'premium' && (
                    <div className="space-y-4">
                      {/* Subscription Status Card */}
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-brand-400 flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5" /> Estado da Assinatura
                          </h4>
                          {hasPermission('users.premium_override') && (
                            <button
                              onClick={() => handleTogglePremium(selectedUser.id, selectedUser.is_premium)}
                              className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-colors ${
                                selectedUser.is_premium
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50 hover:bg-amber-900/50'
                                  : 'bg-brand-500 text-slate-950 hover:bg-brand-400'
                              }`}
                            >
                              {selectedUser.is_premium ? 'Revogar Premium' : 'Ativar Premium'}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-slate-300 pt-1">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Status Atual</span>
                            <span className="font-bold text-xs">
                              {selectedUser.is_premium ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Crown className="w-3 h-3" /> Premium Ativo
                                </span>
                              ) : (
                                <span className="text-slate-400">Gratuito</span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Expira em</span>
                            <span className="text-slate-200 font-semibold">
                              {selectedUser.premium_expires_at ? new Date(selectedUser.premium_expires_at).toLocaleDateString('pt-BR') : 'Vitalício / Indeterminado'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Active Subscriptions */}
                      {tabData.entitlements.subscriptions.length > 0 && (
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                          <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-brand-400">
                            Assinaturas da Loja (Google Play / Apple)
                          </h4>
                          <div className="space-y-2">
                            {tabData.entitlements.subscriptions.map((s: any) => (
                              <div key={s.id} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
                                <div>
                                  <span className="font-bold text-white">{s.product_id}</span>
                                  <span className="text-slate-500 ml-2">({s.order_id || 'Pedido Store'})</span>
                                </div>
                                <span className="text-emerald-400 font-bold uppercase text-[10px]">{s.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual Entitlement Grants */}
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-brand-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Concessões Manuais da Staff
                        </h4>

                        {tabData.entitlements.grants.length === 0 ? (
                          <div className="text-slate-500 text-xs">Nenhuma concessão manual ativa para este usuário.</div>
                        ) : (
                          <div className="space-y-2">
                            {tabData.entitlements.grants.map((g: any) => (
                              <div key={g.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white text-xs">{g.entitlement_id}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    g.is_active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {g.is_active ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                                <p className="text-slate-400 text-[11px]">Motivo: {g.reason}</p>
                                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                                  <span>Início: {new Date(g.starts_at).toLocaleDateString('pt-BR')}</span>
                                  <span>Expira: {g.expires_at ? new Date(g.expires_at).toLocaleDateString('pt-BR') : 'Permanente'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Grant Manual Form */}
                        {hasPermission('users.premium_override') && (
                          <form onSubmit={handleGrantEntitlement} className="pt-3 border-t border-slate-800/80 space-y-3">
                            <div className="text-[11px] font-bold text-slate-300">Conceder Novo Benefício Manual</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Tipo de Benefício</label>
                                <select
                                  value={grantEntitlementId}
                                  onChange={(e) => setGrantEntitlementId(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                                >
                                  <option value="premium_full">Premium Completo (Tudo)</option>
                                  <option value="audio_bibles">Bíblias em Áudio</option>
                                  <option value="ad_free">Sem Anúncios</option>
                                  <option value="devotionals_exclusive">Devocionais Exclusivos</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Duração (Dias)</label>
                                <input
                                  type="number"
                                  placeholder="Ex: 30 (vazio = permanente)"
                                  value={grantDays}
                                  onChange={(e) => setGrantDays(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Motivo / Justificativa Obrigatória</label>
                              <input
                                type="text"
                                placeholder="Ex: Cortesia suporte chamado #1234, teste beta..."
                                value={grantReason}
                                onChange={(e) => setGrantReason(e.target.value)}
                                required
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isSubmittingGrant || !grantReason.trim()}
                              className="w-full py-2 bg-brand-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-brand-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              {isSubmittingGrant ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              <span>Confirmar Concessão</span>
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
