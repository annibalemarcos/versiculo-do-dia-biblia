import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardResponse, MetricCardData, ChartPoint, TopItem } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Sparkles,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { UserEngagementSection } from '../components/dashboard/UserEngagementSection';

export const Dashboard: React.FC = () => {
  const { currentAppId } = useAuth();
  const [preset, setPreset] = useState<string>('executive');
  const [period, setPeriod] = useState<string>('30d');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboard = async () => {
    setLoading(true);
    const res = await api.get<DashboardResponse>('/admin/dashboard/metrics', {
      preset,
      period,
      app_id: currentAppId,
    });
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [preset, period, currentAppId]);

  return (
    <div className="space-y-8">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {[
            { id: 'executive', label: 'Executivo' },
            { id: 'engagement', label: 'User Engagement' },
            { id: 'product', label: 'Produto & Engajamento' },
            { id: 'monetization', label: 'Monetização & MRR' },
            { id: 'operations', label: 'Operações & Sistema' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                preset === p.id
                  ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Period & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700/60 text-xs">
            {['7d', '30d', '90d'].map((per) => (
              <button
                key={per}
                onClick={() => setPeriod(per)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  period === per ? 'bg-slate-900 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {per.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-colors disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 h-32 animate-pulse flex flex-col justify-between"
            >
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-8 bg-slate-800 rounded w-1/2" />
              <div className="h-3 bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : data?.cards && data.cards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.cards.map((card) => {
            return (
              <div
                key={card.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium text-slate-400 tracking-wide truncate">
                    {card.title}
                  </span>
                  {card.change_pct !== undefined && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        card.change_direction === 'up'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          : card.change_direction === 'down'
                          ? 'bg-red-950/60 text-red-400 border border-red-800/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {card.change_direction === 'up' && <TrendingUp className="w-3 h-3" />}
                      {card.change_direction === 'down' && <TrendingDown className="w-3 h-3" />}
                      {card.change_pct > 0 ? `+${card.change_pct}%` : `${card.change_pct}%`}
                    </span>
                  )}
                </div>

                <div className="my-2">
                  <div className="text-2xl font-extrabold text-white tracking-tight">
                    {card.value ?? 'Sem dados'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                  <span className="capitalize">{card.category || 'Métrica'}</span>
                  {card.tooltip && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={card.tooltip}>
                      {card.tooltip}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/80 border border-slate-800 rounded-2xl text-xs text-slate-400">
          Sem dados disponíveis para esta categoria no momento.
        </div>
      )}

      {/* Main Timeseries Chart */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Evolução Temporal ({period.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-400">
              Tendência de engajamento, visualizações e faturamento diário
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          {data?.timeseries && data.timeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c29337" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#c29337" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="values.dau"
                  name="Usuários Ativos (DAU)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#dauGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="values.daily_verse_views"
                  name="Leituras Versículo do Dia"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={0.1}
                  fill="#10b981"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Sem dados de série temporal encontrados para este período.
            </div>
          )}
        </div>
      </div>

      {/* User Engagement Section: Real-Time Active Users & Trending Verse Shares */}
      <UserEngagementSection currentAppId={currentAppId} />

      {/* Breakdowns & Funnels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Themes */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white">Temas Mais Lidos</h4>
            <Sparkles className="w-4 h-4 text-brand-400" />
          </div>
          <div className="space-y-3">
            {data?.top_themes && data.top_themes.length > 0 ? (
              data.top_themes.map((theme, idx) => (
                <div key={theme.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">
                      {idx + 1}. {theme.name}
                    </span>
                    <span className="text-slate-400">{theme.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full"
                      style={{ width: `${theme.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                Sem dados de temas para este período.
              </div>
            )}
          </div>
        </div>

        {/* Emotions Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-white">Emoções Espirituais</h4>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="p-2 mb-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[10px] text-slate-400">
            🔒 Dados puramente agregados. Nunca utilizados para perfilamento de anúncios.
          </div>
          <div className="space-y-3">
            {data?.aggregated_emotions && data.aggregated_emotions.length > 0 ? (
              data.aggregated_emotions.map((emo) => (
                <div key={emo.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{emo.name}</span>
                    <span className="text-slate-400">{emo.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${emo.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                Sem dados de emoções para este período.
              </div>
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white">Funil de Conversão</h4>
            <DollarSign className="w-4 h-4 text-brand-400" />
          </div>
          <div className="space-y-4">
            {data?.conversion_funnel && data.conversion_funnel.length > 0 ? (
              data.conversion_funnel.map((step) => (
                <div key={step.name} className="relative bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200">{step.name}</span>
                    <span className="font-bold text-brand-400">{step.count.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Taxa de Retenção do Passo: {step.percentage}%
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                Sem dados de conversão registrados.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
