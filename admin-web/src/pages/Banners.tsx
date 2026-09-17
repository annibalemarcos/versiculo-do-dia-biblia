import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, API_BASE_URL } from '../services/api';
import {
  BannerItem,
  BannerCreatePayload,
  BannerPlacement,
  BannerTargetAudience,
  BannerActionType
} from '../types';
import {
  Flag,
  Plus,
  Search,
  Filter,
  Eye,
  MousePointerClick,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Trash2,
  Edit3,
  Layers,
  Users,
  Target,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  Terminal,
  Activity,
  Copy,
  Info,
  ChevronDown,
  ChevronUp,
  Code2,
  Server
} from 'lucide-react';

const PLACEMENTS: { id: BannerPlacement; label: string; description: string }[] = [
  { id: 'home_top', label: 'Home - Topo', description: 'Acima do versículo do dia' },
  { id: 'home_middle', label: 'Home - Meio', description: 'Entre os devocionais e reflexões' },
  { id: 'home_bottom', label: 'Home - Rodapé', description: 'Parte inferior da tela principal' },
  { id: 'reading_screen', label: 'Tela de Leitura', description: 'Visualizador de capítulos da Bíblia' },
  { id: 'daily_verse', label: 'Versículo do Dia', description: 'Rodapé do card de meditação diária' },
  { id: 'modal_announcement', label: 'Modal / Pop-up', description: 'Aviso pop-up ao abrir o app' },
  { id: 'profile_screen', label: 'Perfil / Minha Conta', description: 'Área de configurações e conta' },
  { id: 'custom', label: 'Posicionamento Personalizado', description: 'Identificador dinâmico customizado' },
];

const AUDIENCES: { id: BannerTargetAudience; label: string; color: string }[] = [
  { id: 'all', label: 'Todos os Usuários', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'free_only', label: 'Apenas Free (Não Pagantes)', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'premium_only', label: 'Apenas Assinantes Premium', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'anonymous_only', label: 'Apenas Não Logados', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'registered_only', label: 'Apenas Cadastrados', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
];

const ACTION_TYPES: { id: BannerActionType; label: string }[] = [
  { id: 'open_url', label: 'Abrir Link Externo (Web/Browser)' },
  { id: 'internal_route', label: 'Navegação Interna no App (Ex: /premium)' },
  { id: 'show_modal', label: 'Exibir Modal Informativo no App' },
  { id: 'dismiss', label: 'Apenas Notificação / Fechar ao Clicar' },
  { id: 'copy_text', label: 'Copiar Texto / Cupom Promocional' },
];

export const Banners: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<string>('all');
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<BannerCreatePayload>({
    app_id: currentAppId || 'verse_daily',
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    badge_text: '',
    placement: 'home_top',
    target_audience: 'all',
    action_type: 'open_url',
    action_url: '',
    action_label: 'Saiba Mais',
    secondary_action_label: '',
    priority: 10,
    is_active: true,
    starts_at: null,
    expires_at: null,
    dismissible: true,
    bg_color: '#1E293B',
    text_color: '#FFFFFF',
    max_impressions: null,
  });

  // Diagnostic Tool State
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isInPageDiagnosticExpanded, setIsInPageDiagnosticExpanded] = useState(false);
  const [inPageDiagnosticTab, setInPageDiagnosticTab] = useState<'response' | 'headers' | 'request'>('response');
  const [diagnosticLogs, setDiagnosticLogs] = useState<{
    timestamp: string;
    url: string;
    httpStatus: number | null;
    statusText: string | null;
    ok: boolean;
    durationMs: number;
    rawHeaders: Record<string, string>;
    rawResponse: any;
    extractedCount: number;
    failureReason: string | null;
  } | null>(null);
  const [copiedDiagnostic, setCopiedDiagnostic] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    const startTime = performance.now();
    const token = localStorage.getItem('admin_token');
    const queryParams = new URLSearchParams();
    if (currentAppId) queryParams.append('app_id', currentAppId);
    queryParams.append('limit', '100');
    
    const targetUrl = `${(API_BASE_URL || '/api/v1').replace(/\/+$/, '')}/admin/banners?${queryParams.toString()}`;

    try {
      console.group(`[Banners Diagnostics] GET ${targetUrl}`);
      console.log('Timestamp:', new Date().toISOString());
      console.log('Request Params:', { app_id: currentAppId, limit: 100 });
      console.log('Has Auth Token:', !!token);

      const rawFetchResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const durationMs = Math.round(performance.now() - startTime);
      const httpStatus = rawFetchResponse.status;
      const statusText = rawFetchResponse.statusText;
      const ok = rawFetchResponse.ok;

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      rawFetchResponse.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      // Parse JSON
      let rawJsonData: any = null;
      let parseError: string | null = null;
      try {
        rawJsonData = await rawFetchResponse.json();
      } catch (e: any) {
        parseError = e?.message || 'Falha ao parsear JSON da resposta';
      }

      console.log('HTTP Status:', httpStatus, statusText);
      console.log('Response Headers:', responseHeaders);
      console.log('Raw Response Data:', rawJsonData);

      // Analyze structure & potential failure causes
      let extractedBanners: BannerItem[] = [];
      let failureReason: string | null = null;

      if (!ok) {
        failureReason = `Erro HTTP ${httpStatus}: ${rawJsonData?.detail || rawJsonData?.error?.message || statusText || 'Falha na requisição'}`;
        console.error('[Banners Diagnostics] Request Failed:', failureReason);
      } else if (parseError) {
        failureReason = `Erro de JSON: ${parseError}`;
        console.error('[Banners Diagnostics] JSON Parse Error:', parseError);
      } else {
        // Evaluate typical payload structures:
        // Case 1: Standard envelope { success: true, data: [ ... ], total: X }
        // Case 2: Nested envelope { success: true, data: { data: [ ... ], total: X } }
        // Case 3: Direct array [ ... ]
        // Case 4: FastApi items key { items: [ ... ] }
        if (Array.isArray(rawJsonData?.data)) {
          extractedBanners = rawJsonData.data;
        } else if (Array.isArray(rawJsonData?.data?.data)) {
          extractedBanners = rawJsonData.data.data;
        } else if (Array.isArray(rawJsonData?.items)) {
          extractedBanners = rawJsonData.items;
        } else if (Array.isArray(rawJsonData)) {
          extractedBanners = rawJsonData;
        } else {
          failureReason = `Estrutura de dados inesperada: esperava array em .data ou .data.data, mas recebeu tipo '${typeof rawJsonData?.data}'. Chaves recebidas: [${Object.keys(rawJsonData || {}).join(', ')}]`;
          console.warn('[Banners Diagnostics] Unexpected Data Structure:', failureReason);
        }
      }

      console.log(`[Banners Diagnostics] Extracted ${extractedBanners.length} banners.`);
      console.groupEnd();

      // Store in diagnostic state for on-screen inspection
      setDiagnosticLogs({
        timestamp: new Date().toLocaleTimeString() + '.' + new Date().getMilliseconds().toString().padStart(3, '0'),
        url: targetUrl,
        httpStatus,
        statusText,
        ok,
        durationMs,
        rawHeaders: responseHeaders,
        rawResponse: rawJsonData,
        extractedCount: extractedBanners.length,
        failureReason,
      });

      if (extractedBanners.length > 0 || ok) {
        setBanners(extractedBanners);
      }

      if (!ok || failureReason) {
        setIsInPageDiagnosticExpanded(true);
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const networkError = err?.message || 'Falha de rede ou conexão';
      console.error('[Banners Diagnostics] Fetch Exception:', err);
      console.groupEnd();

      setIsInPageDiagnosticExpanded(true);
      setDiagnosticLogs({
        timestamp: new Date().toLocaleTimeString(),
        url: targetUrl,
        httpStatus: null,
        statusText: null,
        ok: false,
        durationMs,
        rawHeaders: {},
        rawResponse: { error: networkError },
        extractedCount: 0,
        failureReason: `Exceção de rede: ${networkError}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [currentAppId]);

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormData({
      app_id: currentAppId || 'verse_daily',
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      badge_text: 'NOVO',
      placement: 'home_top',
      target_audience: 'all',
      action_type: 'open_url',
      action_url: 'https://',
      action_label: 'Saiba Mais',
      secondary_action_label: '',
      priority: 50,
      is_active: true,
      starts_at: null,
      expires_at: null,
      dismissible: true,
      bg_color: '#1E293B',
      text_color: '#FFFFFF',
      max_impressions: null,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner: BannerItem) => {
    setEditingBanner(banner);
    setFormData({
      app_id: banner.app_id,
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      badge_text: banner.badge_text || '',
      placement: banner.placement,
      target_audience: banner.target_audience,
      action_type: banner.action_type,
      action_url: banner.action_url || '',
      action_label: banner.action_label || 'Saiba Mais',
      secondary_action_label: banner.secondary_action_label || '',
      priority: banner.priority,
      is_active: banner.is_active,
      starts_at: banner.starts_at ? banner.starts_at.slice(0, 16) : null,
      expires_at: banner.expires_at ? banner.expires_at.slice(0, 16) : null,
      dismissible: banner.dismissible,
      bg_color: banner.bg_color || '#1E293B',
      text_color: banner.text_color || '#FFFFFF',
      max_impressions: banner.max_impressions || null,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (banner: BannerItem) => {
    setTogglingId(banner.id);
    const res = await api.patch<{ is_active: boolean }>(`/admin/banners/${banner.id}/toggle`);
    if (res.success) {
      const newActive = res.data?.is_active ?? (res as any).is_active ?? !banner.is_active;
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: newActive } : b))
      );
    }
    setTogglingId(null);
  };

  const handleDelete = async (bannerId: string) => {
    if (!window.confirm('Tem certeza de que deseja remover este banner permanentemente?')) return;
    const res = await api.delete(`/admin/banners/${bannerId}`);
    if (res.success) {
      setBanners((prev) => prev.filter((b) => b.id !== bannerId));
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('O título do banner é obrigatório.');
      return;
    }

    setModalLoading(true);
    setFormError(null);

    const payload = {
      ...formData,
      app_id: currentAppId || formData.app_id,
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      priority: Number(formData.priority) || 10,
      max_impressions: formData.max_impressions ? Number(formData.max_impressions) : null,
    };

    if (editingBanner) {
      const res = await api.put(`/admin/banners/${editingBanner.id}`, payload);
      if (res.success) {
        setIsModalOpen(false);
        fetchBanners();
      } else {
        setFormError(res.error?.message || 'Erro ao atualizar banner');
      }
    } else {
      const res = await api.post('/admin/banners', payload);
      if (res.success) {
        setIsModalOpen(false);
        fetchBanners();
      } else {
        setFormError(res.error?.message || 'Erro ao criar banner');
      }
    }
    setModalLoading(false);
  };

  // Filtered banners
  const filteredBanners = useMemo(() => {
    const now = new Date();
    return banners.filter((banner) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = banner.title.toLowerCase().includes(q);
        const matchSub = (banner.subtitle || '').toLowerCase().includes(q);
        const matchDesc = (banner.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchDesc) return false;
      }

      // Placement
      if (selectedPlacement !== 'all' && banner.placement !== selectedPlacement) {
        return false;
      }

      // Audience
      if (selectedAudience !== 'all' && banner.target_audience !== selectedAudience) {
        return false;
      }

      // Status
      if (selectedStatus === 'active' && !banner.is_active) return false;
      if (selectedStatus === 'paused' && banner.is_active) return false;
      if (selectedStatus === 'scheduled') {
        if (!banner.starts_at || new Date(banner.starts_at) <= now) return false;
      }
      if (selectedStatus === 'expired') {
        if (!banner.expires_at || new Date(banner.expires_at) >= now) return false;
      }

      return true;
    });
  }, [banners, searchQuery, selectedPlacement, selectedAudience, selectedStatus]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((b) => b.is_active).length;
    const totalImpressions = banners.reduce((acc, b) => acc + (b.impression_count || 0), 0);
    const totalClicks = banners.reduce((acc, b) => acc + (b.click_count || 0), 0);
    const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

    return { total, active, totalImpressions, totalClicks, ctr };
  }, [banners]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Gestão de Banners & Comunicação
              </h2>
              <p className="text-xs text-slate-400">
                Placements dinâmicos, segmentação de público, agendamento de veiculação e análise de engajamento
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInPageDiagnosticExpanded(!isInPageDiagnosticExpanded)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-all cursor-pointer ${
              diagnosticLogs?.ok === false
                ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                : diagnosticLogs?.failureReason
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                : isInPageDiagnosticExpanded
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700/80'
            }`}
            title="Alternar painel de diagnóstico da API nesta página"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-medium">
              {isInPageDiagnosticExpanded ? 'Ocultar Diagnóstico' : 'Diagnóstico API'}
            </span>
            {diagnosticLogs && (
              <span
                className={`w-2 h-2 rounded-full ${
                  diagnosticLogs.ok ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'
                }`}
              />
            )}
          </button>
          <button
            onClick={fetchBanners}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl transition-all"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Banner
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total de Banners</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.total}</div>
          <div className="text-[11px] text-slate-500 mt-1">Configurados no app</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Banners Ativos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{metrics.active}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics.total > 0 ? `${Math.round((metrics.active / metrics.total) * 100)}% ativos` : '0%'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total de Impressões</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {metrics.totalImpressions.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Exibições registradas</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Cliques & CTR Médio</span>
            <MousePointerClick className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">{metrics.totalClicks.toLocaleString()}</span>
            <span className="text-xs font-semibold text-amber-300/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              {metrics.ctr}% CTR
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Taxa de interação total</div>
        </div>
      </div>

      {/* DIAGNOSTIC UI COMPONENT IN THE BANNERS PAGE */}
      <div
        className={`rounded-3xl border transition-all shadow-xl overflow-hidden ${
          diagnosticLogs?.ok === false
            ? 'bg-red-950/20 border-red-500/40 shadow-red-950/20'
            : diagnosticLogs?.failureReason
            ? 'bg-amber-950/20 border-amber-500/40 shadow-amber-950/20'
            : 'bg-slate-900/90 border-slate-800 shadow-slate-950/40'
        }`}
      >
        {/* Component Header / Summary Bar */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border shrink-0 ${
                diagnosticLogs?.ok === false
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : diagnosticLogs?.failureReason
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-amber-400'
              }`}
            >
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  Diagnóstico da API de Banners
                </span>
                {diagnosticLogs ? (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                        diagnosticLogs.ok
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                      }`}
                    >
                      {diagnosticLogs.httpStatus ? (
                        <>HTTP {diagnosticLogs.httpStatus} {diagnosticLogs.statusText || ''}</>
                      ) : (
                        'FALHA DE REDE / REQUISIÇÃO'
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/50 border border-indigo-800/50 px-2 py-0.5 rounded-md">
                      {diagnosticLogs.durationMs} ms
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                      {diagnosticLogs.extractedCount} banners
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 font-mono">Aguardando requisição...</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono truncate">
                GET {diagnosticLogs?.url || `${API_BASE_URL}/admin/banners?app_id=${currentAppId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={fetchBanners}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition-all cursor-pointer font-medium"
              title="Executar requisição novamente"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Re-testar</span>
            </button>

            {diagnosticLogs?.rawResponse && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(diagnosticLogs.rawResponse, null, 2));
                  setCopiedDiagnostic(true);
                  setTimeout(() => setCopiedDiagnostic(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition-all cursor-pointer font-medium"
                title="Copiar JSON bruto retornado"
              >
                {copiedDiagnostic ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar JSON</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setIsInPageDiagnosticExpanded(!isInPageDiagnosticExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs rounded-xl border border-amber-500/30 transition-all cursor-pointer font-medium"
              title={isInPageDiagnosticExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
            >
              <span>{isInPageDiagnosticExpanded ? 'Recolher' : 'Ver Detalhes & JSON'}</span>
              {isInPageDiagnosticExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Component Body (Expanded view) */}
        {isInPageDiagnosticExpanded && (
          <div className="p-5 space-y-4 bg-slate-950/40 animate-fade-in">
            {!diagnosticLogs ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-900/60 rounded-2xl border border-slate-800">
                Nenhum dado capturado ainda. Clique em "Re-testar" para disparar a requisição de diagnóstico.
              </div>
            ) : (
              <>
                {/* Failure Analysis / Reason Warning */}
                {diagnosticLogs.failureReason && (
                  <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-red-300 flex items-center gap-2">
                        <span>Causa da Falha ou Inconsistência Detectada:</span>
                        <span className="text-[10px] font-mono bg-red-900/60 px-2 py-0.5 rounded text-red-200">
                          {diagnosticLogs.httpStatus ? `HTTP ${diagnosticLogs.httpStatus}` : 'ERRO DE REDE'}
                        </span>
                      </h4>
                      <p className="text-xs text-red-200 font-mono break-all leading-relaxed">
                        {diagnosticLogs.failureReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Status & Telemetry Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span>Status HTTP</span>
                      <Activity className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div
                      className={`text-base font-bold font-mono mt-1 ${
                        diagnosticLogs.ok ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {diagnosticLogs.httpStatus
                        ? `${diagnosticLogs.httpStatus} ${diagnosticLogs.statusText || ''}`
                        : 'Falha na Conexão'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {diagnosticLogs.ok ? 'Requisição OK (2xx)' : 'Código de erro ou exceção'}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span>Latência de Rede</span>
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="text-base font-bold font-mono text-indigo-400 mt-1">
                      {diagnosticLogs.durationMs} ms
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      Timestamp: {diagnosticLogs.timestamp}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span>Banners Identificados</span>
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-base font-bold font-mono text-amber-400 mt-1">
                      {diagnosticLogs.extractedCount} itens
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      Array parseado no client
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                      <span>Autenticação Bearer</span>
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="text-base font-bold font-mono text-slate-200 mt-1">
                      {localStorage.getItem('admin_token') ? 'Token Ativo' : 'Sem Token'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      Header: Authorization
                    </div>
                  </div>
                </div>

                {/* Sub-tabs for Inspecting Response */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInPageDiagnosticTab('response')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                          inPageDiagnosticTab === 'response'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Resposta JSON Bruta</span>
                      </button>

                      <button
                        onClick={() => setInPageDiagnosticTab('headers')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                          inPageDiagnosticTab === 'headers'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>Cabeçalhos HTTP ({Object.keys(diagnosticLogs.rawHeaders).length})</span>
                      </button>

                      <button
                        onClick={() => setInPageDiagnosticTab('request')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                          inPageDiagnosticTab === 'request'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Detalhes da Requisição</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsDiagnosticOpen(true)}
                      className="text-xs text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
                      title="Abrir em modal de tela cheia"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver em Janela Modal</span>
                    </button>
                  </div>

                  {/* Tab 1: Raw JSON Response */}
                  {inPageDiagnosticTab === 'response' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Payload JSON bruto retornado pelo servidor:</span>
                        <span>
                          {JSON.stringify(diagnosticLogs.rawResponse || {}).length.toLocaleString()} caracteres
                        </span>
                      </div>
                      <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-80 overflow-auto leading-relaxed select-all">
                        {JSON.stringify(diagnosticLogs.rawResponse, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Tab 2: Response Headers */}
                  {inPageDiagnosticTab === 'headers' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                      <div className="text-[11px] text-slate-400">
                        Cabeçalhos HTTP retornados pelo servidor na resposta:
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-64 overflow-y-auto space-y-1.5">
                        {Object.keys(diagnosticLogs.rawHeaders).length === 0 ? (
                          <div className="text-slate-500 italic p-2">Nenhum cabeçalho retornado ou capturado</div>
                        ) : (
                          Object.entries(diagnosticLogs.rawHeaders).map(([k, v]) => (
                            <div key={k} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 border-b border-slate-900 pb-1">
                              <span className="text-indigo-400 font-semibold shrink-0">{k}:</span>
                              <span className="text-slate-300 break-all">{v}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Request Details */}
                  {inPageDiagnosticTab === 'request' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1 font-medium">URL Completa Requisitada:</div>
                        <div className="text-xs font-mono text-amber-300 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 break-all select-all">
                          {diagnosticLogs.url}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Método HTTP</span>
                          <span className="font-mono text-emerald-400 font-bold">GET</span>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Parâmetros de Consulta</span>
                          <span className="font-mono text-slate-300">app_id={currentAppId}, limit=100</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar título ou conteúdo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Placement Filter */}
          <div>
            <select
              value={selectedPlacement}
              onChange={(e) => setSelectedPlacement(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="all">Todos os Placements</option>
              {PLACEMENTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Audience Filter */}
          <div>
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="all">Todo o Público</option>
              {AUDIENCES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Somente Ativos</option>
              <option value="paused">Somente Pausados</option>
              <option value="scheduled">Somente Agendados (Futuros)</option>
              <option value="expired">Somente Expirados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Banners List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/80 rounded-2xl border border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
            Carregando banners e campanhas...
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="space-y-3">
            {diagnosticLogs && (!diagnosticLogs.ok || diagnosticLogs.failureReason) && (
              <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-red-300">Falha detectada na busca de banners</div>
                    <div className="text-slate-300 text-[11px] font-mono mt-0.5">
                      {diagnosticLogs.failureReason || `HTTP ${diagnosticLogs.httpStatus} ${diagnosticLogs.statusText}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDiagnosticOpen(true)}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer border border-red-500/30"
                >
                  Ver Diagnóstico Completo
                </button>
              </div>
            )}
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/80 rounded-2xl border border-slate-800">
              Nenhum banner encontrado para os filtros selecionados.
            </div>
          </div>
        ) : (
          filteredBanners.map((banner) => {
            const placementObj = PLACEMENTS.find((p) => p.id === banner.placement);
            const audienceObj = AUDIENCES.find((a) => a.id === banner.target_audience);
            const isToggling = togglingId === banner.id;
            const now = new Date();
            const isScheduledFuture = banner.starts_at && new Date(banner.starts_at) > now;
            const isExpired = banner.expires_at && new Date(banner.expires_at) < now;
            const ctr =
              banner.impression_count > 0
                ? ((banner.click_count / banner.impression_count) * 100).toFixed(1)
                : '0.0';

            return (
              <div
                key={banner.id}
                className={`bg-slate-900/80 border transition-all rounded-2xl p-5 space-y-4 ${
                  banner.is_active
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/50 opacity-75'
                }`}
              >
                {/* Banner Header Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Expirado
                      </span>
                    ) : isScheduledFuture ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Agendado
                      </span>
                    ) : banner.is_active ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/40 text-slate-400 border border-slate-600/30 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Pausado
                      </span>
                    )}

                    {/* Placement Badge */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      📍 {placementObj ? placementObj.label : banner.placement}
                    </span>

                    {/* Target Audience Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                        audienceObj ? audienceObj.color : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      🎯 {audienceObj ? audienceObj.label : banner.target_audience}
                    </span>

                    {/* Priority Badge */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Prioridade {banner.priority}
                    </span>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {/* Toggle Active Switch */}
                    <button
                      onClick={() => handleToggleActive(banner)}
                      disabled={isToggling}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        banner.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {isToggling ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : banner.is_active ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      {banner.is_active ? 'Ativo' : 'Pausado'}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(banner)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl transition-all cursor-pointer"
                      title="Editar banner"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all cursor-pointer"
                      title="Excluir banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Live Mockup Preview of the Banner */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Pré-visualização no Aplicativo Mobile
                  </div>

                  <div
                    className="relative overflow-hidden rounded-xl border border-slate-700/60 p-4 shadow-lg transition-all"
                    style={{
                      backgroundColor: banner.bg_color || '#1E293B',
                      color: banner.text_color || '#FFFFFF',
                    }}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-xl">
                        {banner.badge_text && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-amber-400 text-slate-950">
                            {banner.badge_text}
                          </span>
                        )}
                        <h4 className="text-sm sm:text-base font-bold tracking-tight">
                          {banner.title}
                        </h4>
                        {banner.subtitle && (
                          <p className="text-xs opacity-90 font-medium">{banner.subtitle}</p>
                        )}
                        {banner.description && (
                          <p className="text-[11px] opacity-75 line-clamp-2">{banner.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {banner.action_label && (
                          <button
                            type="button"
                            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-default"
                          >
                            <span>{banner.action_label}</span>
                            {banner.action_type === 'open_url' && <ExternalLink className="w-3 h-3" />}
                          </button>
                        )}
                        {banner.secondary_action_label && (
                          <button
                            type="button"
                            className="px-2.5 py-1.5 rounded-lg text-xs opacity-80 hover:opacity-100 font-medium cursor-default"
                          >
                            {banner.secondary_action_label}
                          </button>
                        )}
                      </div>
                    </div>

                    {banner.dismissible && (
                      <div className="absolute top-2 right-2 opacity-50 hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metrics & Schedule details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Impressões:</span>{' '}
                    <strong className="text-slate-200">
                      {banner.impression_count.toLocaleString()}
                    </strong>
                    {banner.max_impressions && (
                      <span className="text-slate-500 text-[10px]"> / {banner.max_impressions} max</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500">Cliques:</span>{' '}
                    <strong className="text-slate-200">
                      {banner.click_count.toLocaleString()}
                    </strong>{' '}
                    <span className="text-amber-400/90 font-semibold">({ctr}% CTR)</span>
                  </div>

                  <div>
                    <span className="text-slate-500">Início:</span>{' '}
                    <span className="text-slate-300">
                      {banner.starts_at
                        ? new Date(banner.starts_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Imediato'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Término:</span>{' '}
                    <span className="text-slate-300">
                      {banner.expires_at
                        ? new Date(banner.expires_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Sem expiração'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingBanner ? 'Editar Banner' : 'Novo Banner'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure a exibição, segmentação e ação do banner no aplicativo
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="space-y-4">
              {/* Título & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Título Principal <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Desbloqueie Planos Devocionais"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Tag / Badge</label>
                  <input
                    type="text"
                    placeholder="Ex: NOVO, OFERTA"
                    value={formData.badge_text || ''}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Subtítulo */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Subtítulo (Chamada)</label>
                <input
                  type="text"
                  placeholder="Ex: Acesso ilimitado a comentários teológicos e narração com áudio HD."
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Placement & Segmentação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Posicionamento (Placement) <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={formData.placement}
                    onChange={(e) =>
                      setFormData({ ...formData, placement: e.target.value as BannerPlacement })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                  >
                    {PLACEMENTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Segmentação de Público <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_audience: e.target.value as BannerTargetAudience,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ação & Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Tipo de Ação</label>
                  <select
                    value={formData.action_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        action_type: e.target.value as BannerActionType,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500/60"
                  >
                    {ACTION_TYPES.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    URL ou Rota de Destino
                  </label>
                  <input
                    type="text"
                    placeholder="https://... ou /premium ou rota interna"
                    value={formData.action_url || ''}
                    onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Rótulo do Botão & Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Texto do Botão CTA</label>
                  <input
                    type="text"
                    placeholder="Saiba Mais"
                    value={formData.action_label || ''}
                    onChange={(e) => setFormData({ ...formData, action_label: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Botão Secundário</label>
                  <input
                    type="text"
                    placeholder="Ex: Agora não"
                    value={formData.secondary_action_label || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, secondary_action_label: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Prioridade (1 - 1000)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 10 })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Agendamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Início da Veiculação (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.starts_at || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, starts_at: e.target.value || null })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Término da Veiculação (Opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, expires_at: e.target.value || null })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Estilização & Cores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Cor de Fundo (HEX)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.bg_color || '#1E293B'}
                      onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.bg_color || '#1E293B'}
                      onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Cor do Texto (HEX)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.text_color || '#FFFFFF'}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.text_color || '#FFFFFF'}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.dismissible}
                      onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20"
                    />
                    Permitir Fechar (Dismiss)
                  </label>
                </div>
              </div>

              {/* Preview no Modal */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pré-visualização Instantânea
                </span>
                <div
                  className="p-3 rounded-lg border border-slate-700/60 flex items-center justify-between"
                  style={{
                    backgroundColor: formData.bg_color || '#1E293B',
                    color: formData.text_color || '#FFFFFF',
                  }}
                >
                  <div className="space-y-1">
                    {formData.badge_text && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-400 text-slate-950">
                        {formData.badge_text}
                      </span>
                    )}
                    <div className="text-xs font-bold">{formData.title || 'Título do Banner'}</div>
                    {formData.subtitle && (
                      <div className="text-[11px] opacity-90">{formData.subtitle}</div>
                    )}
                  </div>
                  {formData.action_label && (
                    <span className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[10px]">
                      {formData.action_label}
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {modalLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingBanner ? 'Salvar Alterações' : 'Criar Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC INSPECTION MODAL */}
      {isDiagnosticOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Diagnóstico da API de Banners
                    {diagnosticLogs && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          diagnosticLogs.ok
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {diagnosticLogs.httpStatus ? `HTTP ${diagnosticLogs.httpStatus}` : 'Erro de Rede'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspeção do status HTTP, tempo de resposta, headers e estrutura bruta JSON retornada
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchBanners}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                  title="Executar requisição agora"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Re-testar</span>
                </button>
                <button
                  onClick={() => setIsDiagnosticOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {!diagnosticLogs ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                  Nenhuma telemetria registrada ainda. Clique em "Re-testar" para disparar a chamada.
                </div>
              ) : (
                <>
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 font-medium">Status HTTP</div>
                      <div
                        className={`text-lg font-bold font-mono mt-1 ${
                          diagnosticLogs.ok ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {diagnosticLogs.httpStatus ? `${diagnosticLogs.httpStatus} ${diagnosticLogs.statusText || ''}` : 'N/A (Failed)'}
                      </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 font-medium">Latência</div>
                      <div className="text-lg font-bold font-mono text-indigo-400 mt-1">
                        {diagnosticLogs.durationMs} ms
                      </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 font-medium">Banners Extraídos</div>
                      <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                        {diagnosticLogs.extractedCount} itens
                      </div>
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 font-medium">Timestamp</div>
                      <div className="text-xs font-bold font-mono text-slate-300 mt-1 truncate">
                        {diagnosticLogs.timestamp}
                      </div>
                    </div>
                  </div>

                  {/* Failure / Warning Alert */}
                  {diagnosticLogs.failureReason && (
                    <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-red-300">Causa da Falha ou Inconsistência Detectada:</h4>
                        <p className="text-xs text-red-200 font-mono break-all leading-relaxed">
                          {diagnosticLogs.failureReason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Endpoint URL */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                        Endpoint Alvo Requisitado
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">GET</span>
                    </div>
                    <div className="text-xs font-mono text-amber-300 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all select-all">
                      {diagnosticLogs.url}
                    </div>
                  </div>

                  {/* Response Headers (collapsible/scannable) */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      Cabeçalhos da Resposta (Response Headers)
                    </span>
                    <div className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800 max-h-32 overflow-y-auto space-y-1">
                      {Object.keys(diagnosticLogs.rawHeaders).length === 0 ? (
                        <span className="text-slate-500 italic">Nenhum cabeçalho capturado</span>
                      ) : (
                        Object.entries(diagnosticLogs.rawHeaders).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-indigo-400 font-semibold">{k}:</span>
                            <span className="text-slate-300 truncate">{v}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Raw Data Structure Viewer */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        Estrutura Bruta dos Dados (Raw Response Body)
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            JSON.stringify(diagnosticLogs.rawResponse, null, 2)
                          );
                          setCopiedDiagnostic(true);
                          setTimeout(() => setCopiedDiagnostic(false), 2000);
                        }}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {copiedDiagnostic ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar JSON</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="text-[11px] font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-72 overflow-auto leading-relaxed select-all">
                      {JSON.stringify(diagnosticLogs.rawResponse, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                <span>Os dados também são registrados em tempo real no console do desenvolvedor (<code className="text-slate-300 font-mono">[Banners Diagnostics]</code>).</span>
              </div>
              <button
                onClick={() => setIsDiagnosticOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition-all cursor-pointer font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banners;
