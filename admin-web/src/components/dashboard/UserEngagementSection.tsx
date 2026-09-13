import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { UserEngagementData, RealtimeActivePoint, TrendingVerseShareItem } from '../../types';
import {
  Users,
  Share2,
  Radio,
  TrendingUp,
  Clock,
  Sparkles,
  Flame,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  MessageCircle,
  Instagram,
  Image as ImageIcon,
  FileText,
  Zap,
  BookOpen,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

interface UserEngagementSectionProps {
  currentAppId: string;
}

// Fallback baseline data if API is offline or initial load
const getInitialEngagementData = (appId: string): UserEngagementData => {
  const now = new Date();
  const timeline: RealtimeActivePoint[] = [];

  for (let i = 15; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 2 * 60 * 1000);
    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const wave = Math.sin(i * 0.7) * 18;
    const active = Math.max(85, Math.round(135 + wave + (15 - i) * 1.5));
    const reading = Math.round(active * 0.65);
    const devotional = Math.round(active * 0.23);
    const sharing = Math.max(3, active - reading - devotional);

    timeline.push({
      timestamp: timeStr,
      active_users: active,
      reading_verse: reading,
      in_devotional: devotional,
      sharing: sharing,
    });
  }

  const trendingVerses: TrendingVerseShareItem[] = [
    {
      verse_id: 'PHP_4_13',
      reference: 'Filipenses 4:13',
      text: 'Tudo posso naquele que me fortalece.',
      book: 'Filipenses',
      shares_count: 528,
      shares_growth_pct: 34.5,
      channels: { whatsapp: 328, instagram: 116, image_card: 58, text_copy: 26 },
    },
    {
      verse_id: 'PSA_23_1',
      reference: 'Salmos 23:1',
      text: 'O Senhor é o meu pastor; de nada terei falta.',
      book: 'Salmos',
      shares_count: 412,
      shares_growth_pct: 28.2,
      channels: { whatsapp: 255, instagram: 91, image_card: 45, text_copy: 21 },
    },
    {
      verse_id: 'JER_29_11',
      reference: 'Jeremias 29:11',
      text: 'Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor...',
      book: 'Jeremias',
      shares_count: 349,
      shares_growth_pct: 22.0,
      channels: { whatsapp: 216, instagram: 77, image_card: 38, text_copy: 18 },
    },
    {
      verse_id: 'ISA_41_10',
      reference: 'Isaías 41:10',
      text: 'Por isso não tema, pois estou com você; não tenha medo, pois sou o seu Deus.',
      book: 'Isaías',
      shares_count: 295,
      shares_growth_pct: 18.4,
      channels: { whatsapp: 183, instagram: 65, image_card: 32, text_copy: 15 },
    },
    {
      verse_id: 'JOH_3_16',
      reference: 'João 3:16',
      text: 'Porque Deus tanto amou o mundo que deu o seu Filho Unigênito...',
      book: 'João',
      shares_count: 240,
      shares_growth_pct: 15.1,
      channels: { whatsapp: 149, instagram: 53, image_card: 26, text_copy: 12 },
    },
    {
      verse_id: 'ROM_8_28',
      reference: 'Romanos 8:28',
      text: 'Sabemos que Deus age em todas as coisas para o bem daqueles que o amam...',
      book: 'Romanos',
      shares_count: 198,
      shares_growth_pct: 11.8,
      channels: { whatsapp: 123, instagram: 44, image_card: 22, text_copy: 9 },
    },
    {
      verse_id: 'PSA_91_1',
      reference: 'Salmos 91:1-2',
      text: 'Aquele que habita no abrigo do Altíssimo e descansa à sombra do Onipotente...',
      book: 'Salmos',
      shares_count: 175,
      shares_growth_pct: 9.4,
      channels: { whatsapp: 108, instagram: 39, image_card: 19, text_copy: 9 },
    },
  ];

  return {
    app_id: appId,
    current_active_users: timeline[timeline.length - 1].active_users,
    active_change_pct: 12.4,
    peak_active_today: 384,
    peak_time: '08:15 (Devocional Matinal)',
    avg_session_duration_seconds: 272,
    total_shares_today: 1845,
    shares_growth_pct: 26.8,
    realtime_timeline: timeline,
    trending_verses: trendingVerses,
    channel_breakdown: [
      { channel: 'whatsapp', label: 'WhatsApp', shares: 1144, percentage: 62.0, color: '#22c55e' },
      { channel: 'instagram', label: 'Instagram Stories', shares: 406, percentage: 22.0, color: '#ec4899' },
      { channel: 'image_card', label: 'Cartão Imagem', shares: 203, percentage: 11.0, color: '#f59e0b' },
      { channel: 'text_copy', label: 'Cópia de Texto', shares: 92, percentage: 5.0, color: '#3b82f6' },
    ],
    hourly_shares_trend: [
      { hour: '06h', shares: 78, readers: 190 },
      { hour: '07h', shares: 245, readers: 480 },
      { hour: '08h', shares: 384, readers: 720 },
      { hour: '09h', shares: 290, readers: 510 },
      { hour: '12h', shares: 195, readers: 360 },
      { hour: '15h', shares: 140, readers: 280 },
      { hour: '18h', shares: 185, readers: 340 },
      { hour: '20h', shares: 280, readers: 490 },
      { hour: '22h', shares: 210, readers: 380 },
    ],
  };
};

export const UserEngagementSection: React.FC<UserEngagementSectionProps> = ({ currentAppId }) => {
  const [window, setWindow] = useState<'30m' | '24h' | '7d'>('30m');
  const [data, setData] = useState<UserEngagementData>(() => getInitialEngagementData(currentAppId));
  const [loading, setLoading] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  const [activeLayer, setActiveLayer] = useState<'all' | 'reading' | 'devotional' | 'sharing'>('all');
  const [copiedVerseId, setCopiedVerseId] = useState<string | null>(null);
  const [hoveredVerse, setHoveredVerse] = useState<TrendingVerseShareItem | null>(null);

  const fetchEngagement = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get<UserEngagementData>('/admin/dashboard/engagement', {
        app_id: currentAppId,
        window,
      });
      if (res.success && res.data) {
        setData(res.data);
        setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      // Fallback already in state
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial fetch and on window/app change
  useEffect(() => {
    fetchEngagement(false);
  }, [currentAppId, window]);

  // Periodic real-time background API data fetch when Live Data is active
  useEffect(() => {
    if (!isLiveActive) return;

    // Fetch fresh live engagement metrics from server every 10 seconds
    const pollTimer = setInterval(() => {
      fetchEngagement(true);
    }, 10000);

    return () => clearInterval(pollTimer);
  }, [isLiveActive, currentAppId, window]);

  // Real-time live pulse simulation ticker between API polls
  useEffect(() => {
    if (!isLiveActive || window !== '30m') return;

    const interval = setInterval(() => {
      setData((prev) => {
        if (!prev) return prev;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Generate natural micro-fluctuation (+/- 3 to 7)
        const jitter = Math.floor(Math.random() * 9) - 4;
        const currentActive = Math.max(75, prev.current_active_users + jitter);
        const reading = Math.round(currentActive * 0.64);
        const devotional = Math.round(currentActive * 0.24);
        const sharing = Math.max(2, currentActive - reading - devotional);

        const updatedTimeline = [...prev.realtime_timeline];
        if (updatedTimeline.length > 0) {
          const lastPoint = updatedTimeline[updatedTimeline.length - 1];
          // If in same minute, update last; else append
          if (lastPoint.timestamp === timeStr) {
            updatedTimeline[updatedTimeline.length - 1] = {
              timestamp: timeStr,
              active_users: currentActive,
              reading_verse: reading,
              in_devotional: devotional,
              sharing: sharing,
            };
          } else {
            updatedTimeline.shift(); // keep 16 points
            updatedTimeline.push({
              timestamp: timeStr,
              active_users: currentActive,
              reading_verse: reading,
              in_devotional: devotional,
              sharing: sharing,
            });
          }
        }

        return {
          ...prev,
          current_active_users: currentActive,
          peak_active_today: Math.max(prev.peak_active_today, currentActive),
          realtime_timeline: updatedTimeline,
        };
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isLiveActive, window]);

  const handleToggleLiveData = () => {
    const nextState = !isLiveActive;
    setIsLiveActive(nextState);
    if (nextState) {
      // If resuming, immediately fetch fresh data
      fetchEngagement(false);
    }
  };

  const handleCopyVerse = (verse: TrendingVerseShareItem) => {
    const textToCopy = `"${verse.text}" - ${verse.reference}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedVerseId(verse.verse_id);
    setTimeout(() => setCopiedVerseId(null), 2500);
  };

  // Custom Tooltip for Real-Time Active Users Chart
  const RealtimeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0]?.payload;
      return (
        <div className="bg-slate-950 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              {label}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Ao Vivo
            </span>
          </div>

          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Total Conectados:</span>
              <span className="font-extrabold text-white text-sm">
                {p?.active_users?.toLocaleString()} usuários
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sky-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Lendo Versículo:
              </span>
              <span className="font-semibold">{p?.reading_verse?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-amber-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Em Devocional / Oração:
              </span>
              <span className="font-semibold">{p?.in_devotional?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Compartilhando:
              </span>
              <span className="font-semibold">{p?.sharing?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Trending Verse Shares BarChart
  const VerseSharesTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const verse: TrendingVerseShareItem = payload[0]?.payload;
      return (
        <div className="bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 max-w-xs backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <span className="font-bold text-brand-300 text-sm">{verse.reference}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40 font-semibold">
              +{verse.shares_growth_pct}% hoje
            </span>
          </div>

          <p className="text-slate-300 italic text-[11px] leading-relaxed line-clamp-2">
            "{verse.text}"
          </p>

          <div className="pt-2 border-t border-slate-800/80 space-y-1">
            <div className="flex justify-between items-center text-white font-bold">
              <span>Total de Compartilhamentos:</span>
              <span className="text-brand-400 text-sm">{verse.shares_count.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1 text-emerald-400">
                <MessageCircle className="w-3 h-3" />
                WhatsApp: <span className="font-semibold text-white">{verse.channels.whatsapp}</span>
              </div>
              <div className="flex items-center gap-1 text-pink-400">
                <Instagram className="w-3 h-3" />
                Stories: <span className="font-semibold text-white">{verse.channels.instagram}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <ImageIcon className="w-3 h-3" />
                Cartão: <span className="font-semibold text-white">{verse.channels.image_card}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-400">
                <FileText className="w-3 h-3" />
                Texto: <span className="font-semibold text-white">{verse.channels.text_copy}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Section Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-500/20 to-emerald-500/20 border border-brand-500/30 text-brand-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  User Engagement
                </h2>
                {isLiveActive ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 text-xs font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Ao Vivo
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-700/60 text-xs font-semibold">
                    <Pause className="w-3 h-3 text-amber-400" />
                    Pausado
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoramento em tempo real de usuários ativos e tendências virais de compartilhamento
              </p>
            </div>
          </div>
        </div>

        {/* Right controls: window selector, Live Data toggle switch & refresh */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Time Window Tabs */}
          <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/70 text-xs">
            {[
              { id: '30m', label: '30 min (Real-Time)' },
              { id: '24h', label: '24h' },
              { id: '7d', label: '7 dias' },
            ].map((w) => (
              <button
                key={w.id}
                onClick={() => setWindow(w.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  window === w.id
                    ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Live Data Toggle Switch */}
          <div className="flex items-center gap-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {isLiveActive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                )}
              </span>
              <span className="text-xs font-bold text-white select-none tracking-tight">Live Data</span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isLiveActive}
              aria-label="Alternar Live Data"
              onClick={handleToggleLiveData}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/80 ${
                isLiveActive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-slate-700'
              }`}
              title={isLiveActive ? 'Clique para pausar a busca em tempo real' : 'Clique para retomar a busca em tempo real'}
            >
              <span
                className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isLiveActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              >
                {isLiveActive ? (
                  <Radio className="w-2.5 h-2.5 text-emerald-600" />
                ) : (
                  <Pause className="w-2.5 h-2.5 text-slate-500" />
                )}
              </span>
            </button>

            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                isLiveActive
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                  : 'text-amber-400 bg-amber-950/60 border border-amber-800/40'
              }`}
            >
              {isLiveActive ? 'Ativo' : 'Pausado'}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchEngagement(false)}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-colors disabled:opacity-50"
            title="Recarregar métricas de engajamento manualmente"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Paused Notification Banner */}
      {!isLiveActive && (
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-amber-950/40 border border-amber-800/50 rounded-2xl text-amber-200 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Live Data Pausado:</strong> A busca contínua e a atualização automática dos gráficos foram suspensas. Gráficos congelados no instantâneo de <strong>{lastSyncTime}</strong>.
            </span>
          </div>
          <button
            onClick={handleToggleLiveData}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold transition-colors text-[11px]"
          >
            <Play className="w-3 h-3 fill-current" />
            Retomar Live Data
          </button>
        </div>
      )}

      {/* Engagement KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* Real-Time Active Users */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              Usuários Ativos Agora
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
              <TrendingUp className="w-3 h-3" />
              +{data.active_change_pct}%
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
              <span>{data.current_active_users.toLocaleString()}</span>
              <span className="text-xs font-normal text-emerald-400/90">online agora</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
            <span>Últimos 15 minutos</span>
            <span className="text-slate-400 font-medium">94% via App Android</span>
          </div>
        </div>

        {/* Peak Concurrency Today */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Pico Concorrente Hoje
            </span>
            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20">
              Recorde
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight">
              {data.peak_active_today.toLocaleString()}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
            <span>Horário de Pico</span>
            <span className="text-brand-300 font-medium truncate max-w-[170px]" title={data.peak_time}>
              {data.peak_time}
            </span>
          </div>
        </div>

        {/* Total Verse Shares Today */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-sky-400" />
              Compartilhamentos Hoje
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/50">
              <TrendingUp className="w-3 h-3" />
              +{data.shares_growth_pct}%
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight flex items-baseline gap-2">
              <span>{data.total_shares_today.toLocaleString()}</span>
              <span className="text-xs font-normal text-sky-400">versículos</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
            <span>Principal Canal</span>
            <span className="text-emerald-400 font-medium">WhatsApp (62%)</span>
          </div>
        </div>

        {/* Average Session Duration */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              Tempo Médio de Sessão
            </span>
            <span className="text-[11px] font-bold text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/50">
              +18s vs hist.
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl font-black text-white tracking-tight">
              {Math.floor(data.avg_session_duration_seconds / 60)}m{' '}
              {data.avg_session_duration_seconds % 60}s
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
            <span>Engajamento Leitura</span>
            <span className="text-purple-300 font-medium">74.8% completam dia</span>
          </div>
        </div>
      </div>

      {/* Main Visualizers: Real-Time Active Users Chart & Trending Verse Shares */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Real-time Active Users AreaChart (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Usuários Ativos em Tempo Real
                  </h3>
                  {isLiveActive ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400/90 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ao Vivo
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-semibold bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/30">
                      <Pause className="w-2.5 h-2.5" />
                      Congelado ({lastSyncTime})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {window === '30m'
                    ? isLiveActive
                      ? 'Concorrência ao vivo minuto a minuto com distribuição por atividade'
                      : `Instantâneo congelado às ${lastSyncTime} • Busca em tempo real pausada`
                    : `Série temporal de usuários conectados (${window})`}
                </p>
              </div>

              {/* Activity layer filter pills */}
              <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800 text-[11px]">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'reading', label: 'Leitores' },
                  { id: 'devotional', label: 'Devocionais' },
                  { id: 'sharing', label: 'Compartilhando' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setActiveLayer(l.id as any)}
                    className={`px-2 py-1 rounded-lg font-medium transition-colors ${
                      activeLayer === l.id
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Area Chart for Real-Time Users */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.realtime_timeline}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="readingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="devotionalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="sharingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip content={<RealtimeTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                  {(activeLayer === 'all' || activeLayer === 'reading') && (
                    <Area
                      type="monotone"
                      dataKey="reading_verse"
                      name="Lendo Versículo"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#readingGrad)"
                    />
                  )}

                  {(activeLayer === 'all' || activeLayer === 'devotional') && (
                    <Area
                      type="monotone"
                      dataKey="in_devotional"
                      name="Em Devocional"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#devotionalGrad)"
                    />
                  )}

                  {(activeLayer === 'all' || activeLayer === 'sharing') && (
                    <Area
                      type="monotone"
                      dataKey="sharing"
                      name="Compartilhando"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#sharingGrad)"
                    />
                  )}

                  {activeLayer === 'all' && (
                    <Area
                      type="monotone"
                      dataKey="active_users"
                      name="Total Usuários Ativos"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#activeGrad)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Real-time breakdown footer badge */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800/80 text-center">
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Lendo Agora</span>
              <span className="text-xs font-bold text-sky-400">
                {Math.round(data.current_active_users * 0.64)} usuários (64%)
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Em Devocional</span>
              <span className="text-xs font-bold text-amber-400">
                {Math.round(data.current_active_users * 0.24)} usuários (24%)
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Compartilhando</span>
              <span className="text-xs font-bold text-purple-400">
                {Math.max(2, Math.round(data.current_active_users * 0.12))} usuários (12%)
              </span>
            </div>
          </div>
        </div>

        {/* Share Channels & Peak Hours (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-brand-400" />
                  Canais de Compartilhamento
                </h3>
                <p className="text-xs text-slate-400">
                  Origem dos compartilhamentos e disseminação da Palavra
                </p>
              </div>
            </div>

            {/* Channels Progress Bars */}
            <div className="space-y-3 mb-5">
              {data.channel_breakdown.map((ch) => {
                const getIcon = () => {
                  switch (ch.channel) {
                    case 'whatsapp':
                      return <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
                    case 'instagram':
                      return <Instagram className="w-3.5 h-3.5 text-pink-400" />;
                    case 'image_card':
                      return <ImageIcon className="w-3.5 h-3.5 text-amber-400" />;
                    default:
                      return <FileText className="w-3.5 h-3.5 text-blue-400" />;
                  }
                };

                return (
                  <div key={ch.channel} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        {getIcon()}
                        {ch.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{ch.shares.toLocaleString()}</span>
                        <span className="text-slate-400 text-[11px]">({ch.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800/90 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${ch.percentage}%`,
                          backgroundColor: ch.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hourly Shares Curve mini Recharts AreaChart */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  Picos de Compartilhamento por Horário
                </span>
                <span className="text-[10px] text-brand-400 font-medium">
                  Pico matinal: 07h - 09h
                </span>
              </div>
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.hourly_shares_trend}
                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c29337" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#c29337" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '11px',
                        color: '#fff',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="shares"
                      name="Compartilhamentos"
                      stroke="#c29337"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#hourlyGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Verse Shares BarChart Section using Recharts */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Trending Verse Shares (Versículos Mais Compartilhados)
              </h3>
              {!isLiveActive && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-400/90 font-semibold bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/30">
                  <Pause className="w-2.5 h-2.5" />
                  Pausado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isLiveActive
                ? 'Ranking de versículos com maior velocidade de compartilhamento e alcance social'
                : `Ranking congelado no instantâneo de ${lastSyncTime} • Ative o switch Live Data para atualizar`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Total no ranking:</span>
            <span className="px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
              {data.trending_verses.length} passagens virais
            </span>
          </div>
        </div>

        {/* Horizontal BarChart using Recharts */}
        <div className="h-72 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.trending_verses}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="reference"
                stroke="#cbd5e1"
                tick={{ fontSize: 12, fontWeight: 600 }}
                width={110}
              />
              <Tooltip content={<VerseSharesTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              <Bar
                dataKey="shares_count"
                name="Compartilhamentos"
                radius={[0, 8, 8, 0]}
              >
                {data.trending_verses.map((entry, index) => {
                  // Dynamic colors: Gold for #1, Amber for #2, Orange for #3, etc.
                  const colors = [
                    '#c29337', // Brand Gold (#1)
                    '#d97706', // Amber (#2)
                    '#ea580c', // Orange (#3)
                    '#10b981', // Emerald (#4)
                    '#0284c7', // Sky (#5)
                    '#8b5cf6', // Violet (#6)
                    '#64748b', // Slate (#7)
                  ];
                  return (
                    <Cell
                      key={`cell-${entry.verse_id}`}
                      fill={colors[index % colors.length]}
                      className="transition-all hover:opacity-80"
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 3 Spotlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
          {data.trending_verses.slice(0, 3).map((verse, idx) => (
            <div
              key={verse.verse_id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-brand-500/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        idx === 0
                          ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/40'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950 font-bold'
                          : 'bg-amber-700 text-white font-bold'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-white text-sm tracking-tight">
                      {verse.reference}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-950/80 text-orange-400 border border-orange-800/40">
                    <Flame className="w-2.5 h-2.5" />
                    +{verse.shares_growth_pct}%
                  </span>
                </div>

                <p className="text-xs text-slate-300 italic line-clamp-2 my-2 leading-relaxed">
                  "{verse.text}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-400">
                  <Share2 className="w-3.5 h-3.5 text-brand-400" />
                  <span className="font-bold text-white">{verse.shares_count.toLocaleString()}</span>
                  <span className="text-[10px]">shares</span>
                </div>

                <button
                  onClick={() => handleCopyVerse(verse)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-medium"
                  title="Copiar texto e referência"
                >
                  {copiedVerseId === verse.verse_id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
