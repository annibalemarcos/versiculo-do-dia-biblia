import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemHealthData, ComponentHealth, ProviderTestResult, AllProvidersTestResponse } from '../types';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Server,
  Database,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Clock,
  Radio,
  Bell,
  Sliders,
  ExternalLink,
  Lock,
  XCircle,
  HelpCircle,
  Lightbulb,
  Zap,
  CreditCard,
  Layers,
  Info,
  ShieldAlert,
  X
} from 'lucide-react';

// Explicit target providers requested: Backend, DB, FCM, AdMob, Billing
const TARGET_PROVIDERS = [
  { id: 'api', name: 'Backend', subtitle: 'FastAPI Central REST API', icon: Server, color: 'text-brand-400' },
  { id: 'database', name: 'DB', subtitle: 'PostgreSQL / SQLite Database', icon: Database, color: 'text-blue-400' },
  { id: 'push_fcm', name: 'FCM', subtitle: 'Firebase Cloud Messaging', icon: Bell, color: 'text-rose-400' },
  { id: 'admob', name: 'AdMob', subtitle: 'Google AdMob Mobile Ads', icon: Layers, color: 'text-amber-400' },
  { id: 'billing', name: 'Billing', subtitle: 'Google Play Billing & Subscriptions', icon: CreditCard, color: 'text-emerald-400' },
  { id: 'play_integrity', name: 'Play Integrity', subtitle: 'Google Play Integrity API', icon: Lock, color: 'text-indigo-400' },
  { id: 'ump', name: 'UMP', subtitle: 'User Messaging Platform (GDPR/LGPD)', icon: Sliders, color: 'text-teal-400' },
] as const;

export type HealthDisplayStatus = 'CONFIGURADO' | 'NÃO CONFIGURADO' | 'SAUDÁVEL' | 'DEGRADADO' | 'ERRO';

export const SystemHealth: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<Record<string, ProviderTestResult>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Provider Detail Modal
  const [selectedProvider, setSelectedProvider] = useState<ComponentHealth | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  /**
   * Real fetch to the FastAPI endpoint /api/v1/admin/health
   */
  const fetchHealth = async () => {
    setLoading(true);
    const res = await api.get<SystemHealthData>('/api/v1/admin/health');
    if (res.success && res.data) {
      setHealthData(res.data);
    } else {
      showToast('Erro ao consultar /api/v1/admin/health', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  /**
   * Test a single provider connection via POST /api/v1/admin/health/test/{providerId}
   */
  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    const res = await api.post<ProviderTestResult>(`/api/v1/admin/health/test/${providerId}`);
    setTestingProvider(null);

    if (res.success && res.data) {
      const result = res.data;
      setTestResults((prev) => ({
        ...prev,
        [providerId]: result,
      }));

      const displayStatus = mapToDisplayStatus(result.status, providerId, true);
      showToast(
        `${result.display_name}: ${displayStatus} (${result.response_time_ms ?? 0}ms)`,
        displayStatus === 'SAUDÁVEL' || displayStatus === 'CONFIGURADO' ? 'success' : 'error'
      );
    } else {
      showToast(`Falha ao testar conexão com '${providerId}'`, 'error');
    }
  };

  /**
   * Test all providers in batch via POST /api/v1/admin/health/test-all
   */
  const handleTestAllProviders = async () => {
    setIsTestingAll(true);
    const res = await api.post<AllProvidersTestResponse>('/api/v1/admin/health/test-all');
    setIsTestingAll(false);

    if (res.success && res.data) {
      setTestResults(res.data.results);
      showToast(
        `Diagnóstico concluído! ${res.data.total_providers_tested} provedores testados (${res.data.average_response_time_ms}ms)`,
        'success'
      );
      fetchHealth();
    } else {
      showToast('Falha ao rodar teste em lote', 'error');
    }
  };

  /**
   * Maps raw status from backend or test result into one of the 5 explicit statuses:
   * 'CONFIGURADO', 'NÃO CONFIGURADO', 'SAUDÁVEL', 'DEGRADADO' ou 'ERRO'
   */
  const mapToDisplayStatus = (
    rawStatus: string | undefined,
    providerId: string,
    wasDirectlyTested = false
  ): HealthDisplayStatus => {
    const s = (rawStatus || '').toLowerCase().trim();

    if (s === 'not_configured') {
      return 'NÃO CONFIGURADO';
    }
    if (s === 'degraded') {
      return 'DEGRADADO';
    }
    if (s === 'unavailable' || s === 'error') {
      return 'ERRO';
    }
    if (s === 'configured') {
      return 'CONFIGURADO';
    }

    if (s === 'healthy') {
      // If directly tested with real ping response, mark as SAUDÁVEL
      // Core continuous servers (API, Database) are also SAUDÁVEL
      if (wasDirectlyTested || providerId === 'api' || providerId === 'database') {
        return 'SAUDÁVEL';
      }
      // For external configurations like AdMob, Play Integrity, Billing or UMP that are configured and validated
      return 'CONFIGURADO';
    }

    return 'SAUDÁVEL';
  };

  /**
   * Visual badge for the 5 explicit statuses
   */
  const renderStatusBadge = (status: HealthDisplayStatus) => {
    switch (status) {
      case 'SAUDÁVEL':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>SAUDÁVEL</span>
          </span>
        );
      case 'CONFIGURADO':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>CONFIGURADO</span>
          </span>
        );
      case 'NÃO CONFIGURADO':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider bg-slate-900 text-amber-300 border border-amber-700/60">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>NÃO CONFIGURADO</span>
          </span>
        );
      case 'DEGRADADO':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>DEGRADADO</span>
          </span>
        );
      case 'ERRO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>ERRO</span>
          </span>
        );
    }
  };

  // Associate loaded components by target ID
  const componentsMap = (healthData?.components || []).reduce<Record<string, ComponentHealth>>(
    (acc, cmp) => {
      acc[cmp.name] = cmp;
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-medium animate-fade-in border ${
            toastType === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
              : toastType === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-300'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          {toastType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toastType === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-brand-400 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Saúde Operacional & Diagnóstico de Provedores
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30 uppercase">
              GET /api/v1/admin/health
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Status dos 7 provedores principais: Backend API, Database, FCM, AdMob, Google Play Billing, Play Integrity e UMP
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHealth}
            disabled={loading || isTestingAll}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
            <span>{loading ? 'Consultando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={handleTestAllProviders}
            disabled={isTestingAll || loading}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all active:scale-95"
          >
            <Zap className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-bounce text-slate-950' : ''}`} />
            <span>{isTestingAll ? 'Testando Provedores...' : 'Testar Todos os Provedores'}</span>
          </button>
        </div>
      </div>

      {/* Loading State Banner */}
      {loading && !healthData ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xl">
          <div className="inline-flex p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-base font-bold text-white">
            Carregando diagnóstico em tempo real...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
            Consultando endpoint seguro /api/v1/admin/health e inspecionando serviços essenciais
          </p>
        </div>
      ) : (
        <>
          {/* Global Status Banner */}
          <div
            className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl ${
              healthData?.overall_status === 'healthy'
                ? 'bg-emerald-950/30 border-emerald-800/60'
                : healthData?.overall_status === 'degraded'
                ? 'bg-amber-950/30 border-amber-800/60'
                : 'bg-rose-950/30 border-rose-800/60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
                  healthData?.overall_status === 'healthy'
                    ? 'bg-emerald-900/60 text-emerald-400'
                    : healthData?.overall_status === 'degraded'
                    ? 'bg-amber-900/60 text-amber-400'
                    : 'bg-rose-900/60 text-rose-400'
                }`}
              >
                {healthData?.overall_status === 'healthy' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : healthData?.overall_status === 'degraded' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {healthData?.overall_status === 'healthy'
                    ? 'Infraestrutura e Provedores Operando Normalmente'
                    : healthData?.overall_status === 'degraded'
                    ? 'Alguns Provedores Requerem Atenção ou Configuração (.env)'
                    : 'Instabilidade Operacional Detectada nos Serviços Centrais'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Status geral:{' '}
                  <strong className="uppercase font-mono text-white">
                    {healthData?.overall_status === 'healthy' ? 'SAUDÁVEL' : healthData?.overall_status || 'DESCONHECIDO'}
                  </strong>
                  {' • '}
                  Última consulta:{' '}
                  {healthData ? new Date(healthData.checked_at).toLocaleTimeString('pt-BR') : 'Carregando...'}
                </p>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Conexão ativa com o backend</span>
            </div>
          </div>

          {/* List of the 7 Requested Providers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-400" />
                <span>Provedores Monitorados ({TARGET_PROVIDERS.length})</span>
              </h3>
              <span className="text-xs font-mono text-slate-500">
                Backend API • Database • FCM • AdMob • Google Play Billing • Play Integrity • UMP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {TARGET_PROVIDERS.map((target) => {
                const cmp = componentsMap[target.id] || {
                  name: target.id,
                  display_name: target.name,
                  status: 'not_configured',
                  message: 'Aguardando diagnóstico operacional...',
                  last_check_at: new Date().toISOString(),
                };

                const testResult = testResults[target.id];
                const isTesting = testingProvider === target.id;
                const wasDirectlyTested = Boolean(testResult);

                // Compute exact display status according to specification:
                // 'CONFIGURADO', 'NÃO CONFIGURADO', 'SAUDÁVEL', 'DEGRADADO' ou 'ERRO'
                const currentRawStatus = testResult ? testResult.status : cmp.status;
                const displayStatus = mapToDisplayStatus(currentRawStatus, target.id, wasDirectlyTested);

                const responseTime =
                  testResult && testResult.response_time_ms !== null
                    ? testResult.response_time_ms
                    : cmp.response_time_ms;

                const Icon = target.icon;

                return (
                  <div
                    key={target.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl hover:border-slate-700/80 transition-all relative overflow-hidden group"
                  >
                    {/* Top indicator bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        displayStatus === 'SAUDÁVEL'
                          ? 'bg-emerald-500'
                          : displayStatus === 'CONFIGURADO'
                          ? 'bg-blue-500'
                          : displayStatus === 'DEGRADADO'
                          ? 'bg-amber-500'
                          : displayStatus === 'NÃO CONFIGURADO'
                          ? 'bg-amber-600/70'
                          : 'bg-rose-500'
                      }`}
                    />

                    <div className="space-y-4">
                      {/* Top row: Icon, Name and Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform">
                            <Icon className={`w-6 h-6 ${target.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white tracking-tight">
                                {target.name}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-500">
                                ({target.id})
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                              {target.subtitle}
                            </span>
                          </div>
                        </div>

                        <div>{renderStatusBadge(displayStatus)}</div>
                      </div>

                      {/* Operational Message */}
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                        {testResult ? testResult.message : cmp.message}
                      </div>

                      {/* Recommendation banner if not healthy */}
                      {cmp.recommendation && displayStatus !== 'SAUDÁVEL' && displayStatus !== 'CONFIGURADO' && (
                        <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-amber-200 text-xs flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-amber-300">
                              Recomendação:
                            </span>
                            <span className="text-slate-300 text-[11px] leading-snug">
                              {cmp.recommendation}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Metrics: Latency and Check Time */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
                        <div>
                          <span className="text-slate-500 block">Latência:</span>
                          <span className="font-mono font-bold text-white">
                            {responseTime !== undefined && responseTime !== null
                              ? `${responseTime} ms`
                              : 'Sem medição'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Última Consulta:</span>
                          <span className="font-mono text-slate-300">
                            {testResult
                              ? new Date(testResult.tested_at).toLocaleTimeString('pt-BR')
                              : new Date(cmp.last_check_at).toLocaleTimeString('pt-BR')}
                          </span>
                        </div>

                        {testResult?.error_summary && (
                          <div className="col-span-2 mt-1 p-2 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-[10px]">
                            ⚠️ {testResult.error_summary}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Details Modal & Test Connection */}
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <button
                        onClick={() => setSelectedProvider(cmp)}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Ver detalhes
                      </button>

                      <button
                        onClick={() => handleTestProvider(target.id)}
                        disabled={isTesting || isTestingAll}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all active:scale-95"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'TESTANDO...' : 'TESTAR CONEXÃO'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Sanitized Detail Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {selectedProvider.display_name}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  ID do Provedor: {selectedProvider.name}
                </span>
              </div>

              <button
                onClick={() => setSelectedProvider(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <span className="font-bold text-slate-400 block mb-1">Status Atual:</span>
                <div>
                  {renderStatusBadge(
                    mapToDisplayStatus(
                      testResults[selectedProvider.name]?.status || selectedProvider.status,
                      selectedProvider.name,
                      Boolean(testResults[selectedProvider.name])
                    )
                  )}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-400 block mb-1">Diagnóstico Operacional:</span>
                <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px]">
                  {testResults[selectedProvider.name]?.message || selectedProvider.message}
                </p>
              </div>

              {selectedProvider.recommendation && (
                <div>
                  <span className="font-bold text-amber-300 block mb-1">Ação de Configuração:</span>
                  <p className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-200 text-xs">
                    {selectedProvider.recommendation}
                  </p>
                </div>
              )}

              {selectedProvider.details && Object.keys(selectedProvider.details).length > 0 && (
                <div>
                  <span className="font-bold text-slate-400 block mb-1">Propriedades Sanitizadas:</span>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
                    {Object.entries(selectedProvider.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500">{k}:</span>
                        <span className="text-white">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedProvider(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar
              </button>

              <button
                onClick={() => {
                  handleTestProvider(selectedProvider.name);
                }}
                disabled={testingProvider === selectedProvider.name || isTestingAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    testingProvider === selectedProvider.name ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {testingProvider === selectedProvider.name
                    ? 'TESTANDO...'
                    : 'TESTAR CONEXÃO'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
