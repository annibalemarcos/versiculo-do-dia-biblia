import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  TicketItem,
  TicketDetail,
  TicketMetrics,
  AdminUserItem
} from '../types';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  MessageSquare,
  User,
  Send,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Tag,
  CheckCheck,
  Archive,
  UserPlus,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  OPEN: { label: 'Aberto', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  IN_PROGRESS: { label: 'Em análise', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  WAITING_USER: { label: 'Aguardando usuário', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  RESOLVED: { label: 'Resolvido', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  CLOSED: { label: 'Fechado', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const PRIORITY_LABELS: Record<string, { label: string; bg: string; text?: string; border?: string }> = {
  LOW: { label: 'Baixa', bg: 'bg-slate-800 text-slate-300', text: 'text-slate-300' },
  NORMAL: { label: 'Normal', bg: 'bg-blue-950/80 text-blue-300 border border-blue-800/40', text: 'text-blue-300' },
  HIGH: { label: 'Alta', bg: 'bg-orange-950/80 text-orange-300 border border-orange-800/40', text: 'text-orange-300' },
  URGENT: { label: 'Urgente', bg: 'bg-rose-950/80 text-rose-300 border border-rose-800/50', text: 'text-rose-300' },
};

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: 'Problema técnico',
  ACCOUNT: 'Conta',
  PREMIUM_PAYMENT: 'Premium / Pagamento',
  ADS: 'Anúncios',
  CONTENT: 'Conteúdo bíblico',
  SUGGESTION: 'Sugestão',
  OTHER: 'Outro',
};

export const Tickets: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [metrics, setMetrics] = useState<TicketMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [adminsList, setAdminsList] = useState<AdminUserItem[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterAssigned, setFilterAssigned] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal / Drawer State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    const res = await api.get<TicketMetrics>('/admin/tickets/metrics', { app_id: currentAppId });
    if (res.success && res.data) {
      setMetrics(res.data);
    }
    setMetricsLoading(false);
  };

  const fetchAdmins = async () => {
    const res = await api.get<AdminUserItem[]>('/admin/admins');
    if (res.success && res.data && Array.isArray(res.data)) {
      setAdminsList(res.data);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    const params: any = {
      page,
      limit: 15,
      app_id: currentAppId,
      search: searchQuery || undefined,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      category: filterCategory || undefined,
      assigned_admin_id: filterAssigned || undefined,
    };

    const res = await api.get<{
      items: TicketItem[];
      pagination: { total: number; page: number; pages: number };
    }>('/admin/tickets', params);

    if (res.success && res.data) {
      setTickets(Array.isArray(res.data.items) ? res.data.items : []);
      setTotalPages(res.data.pagination?.pages || 1);
      setTotalCount(res.data.pagination?.total || 0);
    } else {
      setTickets([]);
    }
    setLoading(false);
  };

  const fetchTicketDetail = async (ticketId: string) => {
    setLoadingDetail(true);
    const res = await api.get<TicketDetail>(`/admin/tickets/${ticketId}`);
    if (res.success && res.data) {
      setTicketDetail(res.data);
    } else {
      showToast(res.error?.message || 'Erro ao carregar detalhes do chamado', 'error');
    }
    setLoadingDetail(false);
  };

  useEffect(() => {
    fetchMetrics();
    fetchAdmins();
  }, [currentAppId]);

  // Handle URL query parameter ?id=... (from push notification or notification inbox)
  useEffect(() => {
    const ticketIdParam = searchParams.get('id') || searchParams.get('ticket_id');
    if (ticketIdParam) {
      openTicket(ticketIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTickets();
  }, [currentAppId, page, filterStatus, filterPriority, filterCategory, filterAssigned]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const openTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setReplyMessage('');
    setIsInternalNote(false);
    fetchTicketDetail(ticketId);
  };

  const closeDrawer = () => {
    setSelectedTicketId(null);
    setTicketDetail(null);
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicketId) return;
    setSubmittingReply(true);

    const res = await api.post(`/admin/tickets/${selectedTicketId}/messages`, {
      message: replyMessage,
      is_internal_note: isInternalNote,
    });

    if (res.success) {
      setReplyMessage('');
      showToast(isInternalNote ? 'Nota interna salva com sucesso' : 'Resposta enviada com sucesso');
      // Refresh detail and list
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
      fetchMetrics();
    } else {
      showToast(res.error?.message || 'Erro ao enviar mensagem', 'error');
    }
    setSubmittingReply(false);
  };

  const handleAssignTicket = async (adminId: string) => {
    if (!selectedTicketId) return;
    const res = await api.post(`/admin/tickets/${selectedTicketId}/assign`, {
      admin_id: adminId || null,
    });
    if (res.success) {
      showToast('Responsável alterado com sucesso');
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
    } else {
      showToast(res.error?.message || 'Erro ao atribuir responsável', 'error');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicketId) return;
    const res = await api.patch(`/admin/tickets/${selectedTicketId}`, {
      status: newStatus,
    });
    if (res.success) {
      showToast(`Status atualizado para ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
      fetchMetrics();
    } else {
      showToast(res.error?.message || 'Erro ao alterar status', 'error');
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedTicketId) return;
    const res = await api.patch(`/admin/tickets/${selectedTicketId}`, {
      priority: newPriority,
    });
    if (res.success) {
      showToast(`Prioridade alterada para ${PRIORITY_LABELS[newPriority]?.label || newPriority}`);
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
    } else {
      showToast(res.error?.message || 'Erro ao alterar prioridade', 'error');
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicketId) return;
    const res = await api.post(`/admin/tickets/${selectedTicketId}/resolve`);
    if (res.success) {
      showToast('Chamado marcado como Resolvido!');
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
      fetchMetrics();
    } else {
      showToast(res.error?.message || 'Erro ao resolver chamado', 'error');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicketId) return;
    const res = await api.post(`/admin/tickets/${selectedTicketId}/close`);
    if (res.success) {
      showToast('Chamado encerrado definitivamente.');
      fetchTicketDetail(selectedTicketId);
      fetchTickets();
      fetchMetrics();
    } else {
      showToast(res.error?.message || 'Erro ao fechar chamado', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border text-sm animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-200'
              : 'bg-rose-950 border-rose-800 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-brand-400" />
            Central de Suporte & Chamados
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie tickets, converse com os fiéis/usuários e resolva dúvidas sobre o aplicativo.
          </p>
        </div>
        <button
          onClick={() => {
            fetchTickets();
            fetchMetrics();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar Dados
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Open */}
        <div className="bg-slate-900/80 border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-bold uppercase tracking-wider">Abertos</span>
            <LifeBuoy className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {metricsLoading ? '-' : metrics?.open_tickets ?? 0}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Aguardando 1º contato</p>
          </div>
        </div>

        {/* Urgent */}
        <div className="bg-slate-900/80 border border-rose-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider">Urgentes</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {metricsLoading ? '-' : metrics?.urgent_tickets ?? 0}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Prioridade máxima</p>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-bold uppercase tracking-wider">Em Análise</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {metricsLoading ? '-' : metrics?.in_progress_tickets ?? 0}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Em atendimento ativo</p>
          </div>
        </div>

        {/* Waiting User */}
        <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">Aguard. Usuário</span>
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {metricsLoading ? '-' : metrics?.waiting_user_tickets ?? 0}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Resposta enviada</p>
          </div>
        </div>

        {/* Resolved Today */}
        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Resolvidos Hoje</span>
            <CheckCheck className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {metricsLoading ? '-' : metrics?.resolved_today ?? 0}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Casos solucionados</p>
          </div>
        </div>

        {/* Avg 1st Response */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-400">
            <span className="text-xs font-bold uppercase tracking-wider">1ª Resposta Média</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {metricsLoading
                ? '-'
                : metrics?.avg_first_response_minutes != null
                ? `${metrics.avg_first_response_minutes} min`
                : 'Sem dados'}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">SLA de atendimento</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por número (TKT-000001), assunto, mensagem ou e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-sm transition shrink-0"
          >
            Buscar Chamados
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Status</label>
            <select
              aria-label="Filtrar por Status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Todos os Status</option>
              <option value="OPEN">Aberto</option>
              <option value="IN_PROGRESS">Em análise</option>
              <option value="WAITING_USER">Aguardando usuário</option>
              <option value="RESOLVED">Resolvido</option>
              <option value="CLOSED">Fechado</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Prioridade</label>
            <select
              aria-label="Filtrar por Prioridade"
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Todas as Prioridades</option>
              <option value="LOW">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Categoria</label>
            <select
              aria-label="Filtrar por Categoria"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Todas as Categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
                <option key={catKey} value={catKey}>
                  {catLabel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Responsável</label>
            <select
              aria-label="Filtrar por Responsável"
              value={filterAssigned}
              onChange={(e) => {
                setFilterAssigned(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Todos os Responsáveis</option>
              {adminsList.map((adm) => (
                <option key={adm.id} value={adm.id}>
                  {adm.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3.5 px-4">Número</th>
                <th className="py-3.5 px-4">Assunto & Categoria</th>
                <th className="py-3.5 px-4">Usuário</th>
                <th className="py-3.5 px-4">Prioridade</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Responsável</th>
                <th className="py-3.5 px-4">Atualizado em</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 bg-slate-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <LifeBuoy className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-semibold text-white">Nenhum chamado de suporte encontrado</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ajuste os filtros ou aguarde novas solicitações dos usuários.
                    </p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const statusInfo = STATUS_LABELS[t.status] || {
                    label: t.status,
                    bg: 'bg-slate-800',
                    text: 'text-slate-300',
                    border: 'border-slate-700',
                  };
                  const prioInfo = PRIORITY_LABELS[t.priority] || {
                    label: t.priority,
                    bg: 'bg-slate-800 text-slate-300',
                  };
                  const categoryName = CATEGORY_LABELS[t.category] || t.category;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => openTicket(t.id)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-400">
                        {t.ticket_number}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-white truncate group-hover:text-brand-300 transition">
                          {t.subject}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>{categoryName}</span>
                          <span className="text-slate-600">•</span>
                          <span>{t.messages_count || 1} msg(s)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium truncate">
                          {t.user_name || t.guest_name || 'Usuário Anônimo'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {t.user_email || t.guest_email || 'Sem e-mail'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${prioInfo.bg}`}>
                          {prioInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {t.assigned_admin_name ? (
                          <span className="flex items-center gap-1.5 font-medium text-slate-200">
                            <User className="w-3.5 h-3.5 text-brand-400" />
                            {t.assigned_admin_name}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Não atribuído</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(t.updated_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTicket(t.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-brand-500 hover:text-slate-950 text-slate-300 font-semibold text-xs transition"
                        >
                          Atender
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-3 px-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Mostrando página <span className="text-white font-bold">{page}</span> de{' '}
              <span className="text-white font-bold">{totalPages}</span> ({totalCount} chamados)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Detail Drawer / Modal */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Top Bar */}
            <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono font-bold text-brand-400">
                  {ticketDetail?.ticket_number || 'Carregando...'}
                </span>
                {ticketDetail && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      STATUS_LABELS[ticketDetail.status]?.bg || 'bg-slate-800'
                    } ${STATUS_LABELS[ticketDetail.status]?.text || 'text-slate-300'} ${
                      STATUS_LABELS[ticketDetail.status]?.border || 'border-slate-700'
                    }`}
                  >
                    {STATUS_LABELS[ticketDetail.status]?.label || ticketDetail.status}
                  </span>
                )}
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
              </div>
            ) : ticketDetail ? (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Conversation Main Area */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-800">
                  {/* Subject Header */}
                  <div className="p-4 bg-slate-950/40 border-b border-slate-800">
                    <h2 className="text-base font-bold text-white">{ticketDetail.subject}</h2>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span>Categoria: <strong className="text-slate-300">{CATEGORY_LABELS[ticketDetail.category] || ticketDetail.category}</strong></span>
                      <span>•</span>
                      <span>Criado em: {new Date(ticketDetail.created_at).toLocaleString('pt-BR')}</span>
                    </p>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
                    {ticketDetail.messages?.map((msg) => {
                      const isInternal = msg.is_internal_note;
                      const isAdmin = msg.sender_type === 'ADMIN';

                      return (
                        <div
                          key={msg.id}
                          className={`rounded-2xl p-4 transition ${
                            isInternal
                              ? 'bg-amber-950/40 border border-amber-500/30'
                              : isAdmin
                              ? 'bg-brand-950/40 border border-brand-500/20 ml-6'
                              : 'bg-slate-950 border border-slate-800 mr-6'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-2">
                            <div className="flex items-center gap-2">
                              {isInternal ? (
                                <span className="flex items-center gap-1 text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px]">
                                  <Lock className="w-3 h-3" /> NOTA INTERNA (Equipe)
                                </span>
                              ) : isAdmin ? (
                                <span className="font-bold text-brand-400 flex items-center gap-1">
                                  <User className="w-3 h-3" /> {msg.sender_name || 'Equipe de Suporte'}
                                </span>
                              ) : (
                                <span className="font-bold text-slate-200 flex items-center gap-1">
                                  <User className="w-3 h-3" /> {msg.sender_name || ticketDetail.user_name || 'Usuário'}
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 text-[11px]">
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              - {new Date(msg.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {msg.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Box */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsInternalNote(false)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            !isInternalNote
                              ? 'bg-brand-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Mensagem ao Usuário
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsInternalNote(true)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                            isInternalNote
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" /> Nota Interna
                        </button>
                      </div>
                      {isInternalNote && (
                        <span className="text-[11px] text-amber-400">
                          Visível apenas para administradores
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <textarea
                        rows={3}
                        placeholder={
                          isInternalNote
                            ? 'Escreva uma anotação interna para sua equipe...'
                            : 'Digite sua resposta ao usuário...'
                        }
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className={`w-full bg-slate-900 border rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none ${
                          isInternalNote
                            ? 'border-amber-500/40 focus:border-amber-400'
                            : 'border-slate-800 focus:border-brand-500'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={submittingReply || !replyMessage.trim()}
                        onClick={handleSendReply}
                        className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                          isInternalNote
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            : 'bg-brand-500 hover:bg-brand-600 text-slate-950'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isInternalNote ? 'Salvar Nota Interna' : 'Enviar Resposta'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar Details Panel */}
                <div className="w-full md:w-80 bg-slate-950/80 p-5 space-y-6 overflow-y-auto">
                  {/* Actions Bar */}
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                      Ações Rápidas
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleResolveTicket}
                        disabled={ticketDetail.status === 'RESOLVED'}
                        className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Resolver
                      </button>
                      <button
                        onClick={handleCloseTicket}
                        disabled={ticketDetail.status === 'CLOSED'}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Archive className="w-3.5 h-3.5" /> Fechar
                      </button>
                    </div>
                  </div>

                  {/* Attributes Controls */}
                  <div className="space-y-4 pt-4 border-t border-slate-800/80 text-xs">
                    {/* Status Select */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                        Status do Chamado
                      </label>
                      <select
                        aria-label="Alterar Status"
                        value={ticketDetail.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-medium"
                      >
                        <option value="OPEN">Aberto</option>
                        <option value="IN_PROGRESS">Em análise</option>
                        <option value="WAITING_USER">Aguardando usuário</option>
                        <option value="RESOLVED">Resolvido</option>
                        <option value="CLOSED">Fechado</option>
                      </select>
                    </div>

                    {/* Priority Select */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                        Prioridade
                      </label>
                      <select
                        aria-label="Alterar Prioridade"
                        value={ticketDetail.priority}
                        onChange={(e) => handlePriorityChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-medium"
                      >
                        <option value="LOW">Baixa</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">Alta</option>
                        <option value="URGENT">Urgente</option>
                      </select>
                    </div>

                    {/* Assignee Select */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                        Responsável da Equipe
                      </label>
                      <select
                        aria-label="Alterar Responsável"
                        value={ticketDetail.assigned_admin_id || ''}
                        onChange={(e) => handleAssignTicket(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-medium"
                      >
                        <option value="">Não atribuído</option>
                        {adminsList.map((adm) => (
                          <option key={adm.id} value={adm.id}>
                            {adm.name} ({adm.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Requester Metadata */}
                  <div className="space-y-3 pt-4 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                        Solicitante
                      </label>
                      {ticketDetail.user_id ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                          <User className="w-3 h-3" /> USUÁRIO REGISTRADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                          CONVIDADO / VISITANTE
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-2.5">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Nome</span>
                        <span className="font-semibold text-white">
                          {ticketDetail.user_name || ticketDetail.guest_name || 'Anônimo'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">E-mail</span>
                        <span className="font-mono text-slate-300">
                          {ticketDetail.user_email || ticketDetail.guest_email || 'Não informado'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[10px]">Aplicativo</span>
                        <span className="text-brand-400 font-medium">
                          {ticketDetail.app_id}
                        </span>
                      </div>

                      {ticketDetail.user_id && (
                        <>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                            <div>
                              <span className="text-slate-500 block text-[10px]">Plano</span>
                              <span className={`text-[11px] font-bold ${ticketDetail.user_is_premium ? 'text-amber-400' : 'text-slate-300'}`}>
                                {ticketDetail.user_is_premium ? '★ PREMIUM' : 'Gratuito'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[10px]">Status da Conta</span>
                              <span className={`text-[11px] font-bold ${ticketDetail.user_is_active === false ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {ticketDetail.user_is_active === false ? 'Bloqueada' : 'Ativa'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[10px]">ID do Usuário</span>
                            <span className="font-mono text-[10px] text-slate-400 truncate block">
                              {ticketDetail.user_id}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/users?search=${encodeURIComponent(ticketDetail.user_email || ticketDetail.user_id || '')}`);
                            }}
                            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Ver no Painel de Usuários
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
