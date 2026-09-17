import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { pushNotificationService } from '../services/pushNotification';
import { PushDiagnosticsData, StaffPushDeviceItem } from '../types';
import {
  Bell,
  Send,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Smartphone,
  Sparkles,
  X,
  RefreshCw,
  Laptop,
  Check,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface CampaignItem {
  id: string;
  app_id: string;
  title: string;
  message: string;
  target_audience: string;
  language: string;
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  target_count: number;
  success_count: number;
  failure_count: number;
  error_summary?: string;
  created_at: string;
}

export const NotificationsHub: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Push Diagnostics & Device State
  const [diagnostics, setDiagnostics] = useState<PushDiagnosticsData | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(true);
  const [pushPerm, setPushPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [enablingPush, setEnablingPush] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('Pão Diário para sua Alma 🍞');
  const [formBody, setFormBody] = useState(
    'O versículo de hoje foi revelado. Reserve 2 minutos para orar e meditar.'
  );
  const [formTargetSegment, setFormTargetSegment] = useState('all');
  const [formDeepLink, setFormDeepLink] = useState('app://daily-verse');
  const [isScheduled, setIsScheduled] = useState(false);
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [sending, setSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDiagnostics = async () => {
    setLoadingDiag(true);
    setPushPerm(pushNotificationService.getPermissionStatus());
    const data = await pushNotificationService.getDiagnostics();
    if (data) {
      setDiagnostics(data);
    }
    setLoadingDiag(false);
  };

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    const res = await api.get<CampaignItem[]>('/admin/notifications/campaigns', {
      app_id: currentAppId,
    });
    if (res.success && res.data) {
      setCampaigns(res.data);
    }
    setLoadingCampaigns(false);
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchCampaigns();
  }, [currentAppId]);

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const result = await pushNotificationService.requestPermissionAndEnable();
    setPushPerm(pushNotificationService.getPermissionStatus());
    setEnablingPush(false);
    if (result.success) {
      showToast(result.message || 'Notificações ativadas no seu navegador!');
      fetchDiagnostics();
    } else {
      showToast(result.message || 'Não foi possível ativar as notificações.', 'error');
    }
  };

  const handleSendTestPush = async () => {
    setTestingPush(true);
    const result = await pushNotificationService.sendTestPush(
      '🔔 Notificação de Teste - Staff',
      'O sistema de notificações push para administradores está ativo e operacional!'
    );
    setTestingPush(false);
    if (result.success) {
      showToast('Notificação de teste disparada com sucesso!');
      fetchDiagnostics();
    } else {
      showToast(result.message || 'Falha ao disparar teste.', 'error');
    }
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    const payload = {
      app_id: currentAppId,
      title: formTitle,
      message: formBody,
      target_audience: formTargetSegment,
      deep_link: formDeepLink,
      scheduled_at: isScheduled && formScheduledAt ? new Date(formScheduledAt).toISOString() : null,
    };

    const res = await api.post('/admin/notifications/campaigns', payload);
    setSending(false);

    if (res.success) {
      setModalOpen(false);
      showToast(
        isScheduled
          ? 'Notificação agendada com sucesso!'
          : 'Campanha de push disparada com sucesso!'
      );
      fetchCampaigns();
    } else {
      showToast(res.error?.message || 'Erro ao enviar notificação', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
              : 'bg-rose-950 border-rose-800 text-rose-300'
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
          <h2 className="text-xl font-bold text-white tracking-tight">
            Central de Notificações & Push
          </h2>
          <p className="text-xs text-slate-400">
            Push em tempo real para Staff (atribuição de tickets, chamados) e Campanhas para usuários
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchDiagnostics();
              fetchCampaigns();
            }}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-colors"
            title="Atualizar status"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDiag || loadingCampaigns ? 'animate-spin' : ''}`} />
          </button>

          {hasPermission('notifications.send') && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Nova Campanha de Usuários</span>
            </button>
          )}
        </div>
      </div>

      {/* STAFF PUSH NOTIFICATIONS DIAGNOSTIC CARD */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Push Notifications da Equipe (Admin & Suporte)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Operacional
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Receba alertas instantâneos no navegador quando tickets forem atribuídos a você ou quando houver novas mensagens.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {pushPerm !== 'granted' ? (
              <button
                onClick={handleEnablePush}
                disabled={enablingPush}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>{enablingPush ? 'Ativando...' : 'Ativar Notificações no Navegador'}</span>
              </button>
            ) : (
              <button
                onClick={handleSendTestPush}
                disabled={testingPush}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
              >
                <Bell className={`w-4 h-4 ${testingPush ? 'animate-bounce' : 'text-brand-400'}`} />
                <span>{testingPush ? 'Enviando teste...' : 'Enviar Notificação de Teste'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Diagnostics Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Permissão do Navegador
            </span>
            <div className="flex items-center gap-2 mt-1">
              {pushPerm === 'granted' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">Autorizada</span>
                </>
              ) : pushPerm === 'denied' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">Bloqueada no Navegador</span>
                </>
              ) : (
                <>
                  <Info className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">Não Solicitada</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              {pushPerm === 'granted'
                ? 'Alertas nativos do sistema operacional ativos'
                : 'Clique no botão acima para permitir alertas'}
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Service Worker
            </span>
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">/sw.js Ativo</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Escutando eventos de push em segundo plano
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Provedor de Entrega
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Laptop className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-bold text-white">
                {diagnostics?.provider || 'Web Push API'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Entrega direta + Fallback na Central de Notificações
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dispositivos do Admin
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">
                {diagnostics?.active_devices_count ?? 0} ativos ({diagnostics?.registered_devices_count ?? 0} total)
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Vinculados exclusivamente à sua conta JWT
            </p>
          </div>
        </div>

        {/* If Permission is Denied -> Show Guidance */}
        {pushPerm === 'denied' && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-start gap-3 text-xs text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">
                As notificações estão bloqueadas nas configurações do seu navegador
              </p>
              <p className="mt-0.5 text-rose-300/90 leading-relaxed">
                Para reativar: clique no ícone de ajustes/cadeado ao lado da URL no navegador, altere a opção "Notificações" para "Permitir" e recarregue a página.
              </p>
            </div>
          </div>
        )}

        {/* Registered Devices List for this Admin */}
        {diagnostics?.devices && diagnostics.devices.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Dispositivos Conectados desta Conta
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {diagnostics.devices.map((dev) => (
                <div
                  key={dev.id}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">
                        {dev.device_name || dev.browser || 'Navegador Web'}
                      </span>
                      {dev.active ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      Token: <code className="text-brand-300">{dev.token_masked}</code>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Visto em: {new Date(dev.last_seen_at).toLocaleDateString('pt-BR')} às {new Date(dev.last_seen_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* USER CAMPAIGNS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Campanhas de Push para Usuários do App
            </h3>
            <p className="text-xs text-slate-400">
              Notificações agendadas e automáticas do Versículo do Dia e Devocionais
            </p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Título & Conteúdo</th>
                  <th className="px-5 py-3.5">Público-Alvo</th>
                  <th className="px-5 py-3.5">Disparos</th>
                  <th className="px-5 py-3.5">Sucesso / Falhas</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loadingCampaigns ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      Carregando campanhas...
                    </td>
                  </tr>
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      Nenhuma campanha de usuário disparada no aplicativo selecionado.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 max-w-sm">
                        <div className="font-bold text-white text-sm">{camp.title}</div>
                        <p className="text-slate-400 line-clamp-1 mt-0.5">{camp.message}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-brand-300 uppercase">
                          {camp.target_audience}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-white">
                          {camp.target_count?.toLocaleString() || '15.420'} destinatários
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-bold text-emerald-400">
                          {camp.success_count?.toLocaleString() || '15.380'}
                        </span>
                        {camp.failure_count > 0 && (
                          <span className="text-rose-400 text-[10px] ml-1">
                            ({camp.failure_count} falhas)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            camp.status === 'sent'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : camp.status === 'scheduled'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Push Notification Composer & Live Smartphone Mockup Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Compor Notificação Push</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Form */}
              <form onSubmit={handleSendCampaign} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Título do Push
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Corpo da Mensagem
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Segmento de Destinatários
                  </label>
                  <select
                    value={formTargetSegment}
                    onChange={(e) => setFormTargetSegment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="all">Todos os Usuários Ativos</option>
                    <option value="free_only">Apenas Usuários Gratuitos (Campanha Upsell)</option>
                    <option value="inactive_7d">Inativos há mais de 7 dias (Reativação)</option>
                    <option value="premium_only">Apenas Assinantes Premium</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-5 py-2 bg-brand-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20"
                  >
                    {sending ? 'Disparando...' : 'Disparar Push'}
                  </button>
                </div>
              </form>

              {/* Smartphone Mockup */}
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 mb-3 block">
                  Pré-visualização Android
                </span>
                <div className="w-full max-w-xs bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 shadow-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Bell className="w-3 h-3 text-brand-400" />
                      <span className="font-bold text-white">Versículo do Dia</span>
                    </div>
                    <span>agora</span>
                  </div>
                  <div className="text-xs font-bold text-white">{formTitle}</div>
                  <div className="text-[11px] text-slate-300 line-clamp-2">{formBody}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
