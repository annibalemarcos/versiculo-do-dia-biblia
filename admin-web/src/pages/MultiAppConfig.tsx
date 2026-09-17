import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AppItem, AppConfigData, FeatureFlagItem } from '../types';
import {
  Layers,
  Settings,
  Flag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Save,
  Smartphone,
  X,
  ShieldAlert,
  UserPlus,
  ShoppingCart,
  Crown,
  Bell,
  LifeBuoy,
  Cloud,
  BookOpen,
  Search,
  Share2,
  Download,
  LogIn,
  LogOut,
  Key,
  Lock,
  Globe,
  ShieldCheck,
  Clock,
  Info,
} from 'lucide-react';

export const MultiAppConfig: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();

  const [apps, setApps] = useState<AppItem[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfigData | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Config Form - Maintenance
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLevel, setMaintenanceLevel] = useState<'informational' | 'partial' | 'full'>('informational');
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEstimatedEnd, setMaintenanceEstimatedEnd] = useState('');

  // Config Form - Access & Auth Governance
  const [authenticationSystemEnabled, setAuthenticationSystemEnabled] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [localAuthEnabled, setLocalAuthEnabled] = useState(true);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [googleAuthStatus, setGoogleAuthStatus] = useState<'enabled' | 'disabled' | 'coming_soon'>('coming_soon');
  const [logoutEnabled, setLogoutEnabled] = useState(true);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false);

  // Config Form - Monetization
  const [purchasesEnabled, setPurchasesEnabled] = useState(true);
  const [premiumEnabled, setPremiumEnabled] = useState(true);

  // Config Form - Core Features
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [supportEnabled, setSupportEnabled] = useState(true);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);
  const [devotionalsEnabled, setDevotionalsEnabled] = useState(true);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [offlineDownloadEnabled, setOfflineDownloadEnabled] = useState(true);

  // Config Form - Versioning
  const [minVersion, setMinVersion] = useState(1);
  const [latestVersion, setLatestVersion] = useState(1);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Feature Flag Modal
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [newFlagKey, setNewFlagKey] = useState('');
  const [newFlagDesc, setNewFlagDesc] = useState('');
  const [newFlagEnabled, setNewFlagEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [appsRes, cfgRes, flagsRes] = await Promise.all([
      api.get<AppItem[]>('/admin/apps'),
      api.get<AppConfigData>(`/admin/apps/${currentAppId}/config`),
      api.get<FeatureFlagItem[]>('/admin/feature-flags', { app_id: currentAppId }),
    ]);

    if (appsRes.success && appsRes.data) setApps(appsRes.data);
    if (cfgRes.success && cfgRes.data) {
      setAppConfig(cfgRes.data);
      setMaintenanceMode(cfgRes.data.maintenance_mode);
      setMaintenanceLevel(cfgRes.data.maintenance_level || 'informational');
      setMaintenanceTitle(cfgRes.data.maintenance_title || '');
      setMaintenanceMessage(cfgRes.data.maintenance_message);
      setMaintenanceEstimatedEnd(
        cfgRes.data.maintenance_estimated_end
          ? new Date(cfgRes.data.maintenance_estimated_end).toISOString().slice(0, 16)
          : ''
      );
      setRegistrationEnabled(cfgRes.data.registration_enabled ?? true);
      setAuthenticationSystemEnabled(cfgRes.data.authentication_system_enabled ?? true);
      setLoginEnabled(cfgRes.data.login_enabled ?? true);
      setLocalAuthEnabled(cfgRes.data.local_auth_enabled ?? true);
      setGoogleAuthEnabled(cfgRes.data.google_auth_enabled ?? cfgRes.data.google_login_enabled ?? false);
      setGoogleAuthStatus(cfgRes.data.google_auth_status ?? 'coming_soon');
      setLogoutEnabled(cfgRes.data.logout_enabled ?? true);
      setGoogleLoginEnabled(cfgRes.data.google_auth_enabled ?? cfgRes.data.google_login_enabled ?? false);
      setPurchasesEnabled(cfgRes.data.purchases_enabled ?? true);
      setPremiumEnabled(cfgRes.data.premium_enabled ?? true);
      setNotificationsEnabled(cfgRes.data.notifications_enabled ?? true);
      setSupportEnabled(cfgRes.data.support_enabled ?? true);
      setCloudSyncEnabled(cfgRes.data.cloud_sync_enabled ?? true);
      setDevotionalsEnabled(cfgRes.data.devotionals_enabled ?? true);
      setSearchEnabled(cfgRes.data.search_enabled ?? true);
      setSharingEnabled(cfgRes.data.sharing_enabled ?? true);
      setOfflineDownloadEnabled(cfgRes.data.offline_download_enabled ?? true);

      setMinVersion(cfgRes.data.minimum_supported_version);
      setLatestVersion(cfgRes.data.latest_version);
      setForceUpdate(cfgRes.data.force_update);
      setStoreUrl(cfgRes.data.store_url || '');
    }
    if (flagsRes.success && flagsRes.data) setFeatureFlags(flagsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentAppId]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);

    const payload = {
      maintenance_mode: maintenanceMode,
      maintenance_level: maintenanceLevel,
      maintenance_title: maintenanceTitle.trim() || null,
      maintenance_message: maintenanceMessage,
      maintenance_estimated_end: maintenanceEstimatedEnd ? new Date(maintenanceEstimatedEnd).toISOString() : null,
      authentication_system_enabled: authenticationSystemEnabled,
      registration_enabled: registrationEnabled,
      login_enabled: loginEnabled,
      local_auth_enabled: localAuthEnabled,
      google_auth_enabled: googleAuthEnabled,
      google_auth_status: googleAuthStatus,
      logout_enabled: logoutEnabled,
      google_login_enabled: googleAuthEnabled,
      purchases_enabled: purchasesEnabled,
      premium_enabled: premiumEnabled,
      notifications_enabled: notificationsEnabled,
      support_enabled: supportEnabled,
      cloud_sync_enabled: cloudSyncEnabled,
      devotionals_enabled: devotionalsEnabled,
      search_enabled: searchEnabled,
      sharing_enabled: sharingEnabled,
      offline_download_enabled: offlineDownloadEnabled,
      minimum_supported_version: minVersion,
      latest_version: latestVersion,
      force_update: forceUpdate,
      store_url: storeUrl,
    };

    const res = await api.put(`/admin/apps/${currentAppId}/config`, payload);
    setSavingConfig(false);

    if (res.success) {
      setToastMessage('Configurações remotas do aplicativo salvas com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
      fetchData();
    } else {
      alert(res.error?.message || 'Erro ao salvar configurações');
    }
  };

  const handleToggleFlag = async (flag: FeatureFlagItem) => {
    const newEnabled = !flag.enabled;
    const res = await api.put(`/admin/feature-flags/${flag.id}`, {
      enabled: newEnabled,
    });
    if (res.success) {
      setFeatureFlags(
        featureFlags.map((f) => (f.id === flag.id ? { ...f, enabled: newEnabled } : f))
      );
      setToastMessage(`Feature flag "${flag.key}" ${newEnabled ? 'ativada' : 'desativada'}.`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/admin/feature-flags', {
      app_id: currentAppId,
      key: newFlagKey,
      description: newFlagDesc,
      enabled: newFlagEnabled,
      platform: 'all',
    });

    if (res.success) {
      setFlagModalOpen(false);
      setNewFlagKey('');
      setNewFlagDesc('');
      setToastMessage('Feature flag criada com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
      fetchData();
    } else {
      alert(res.error?.message || 'Erro ao criar feature flag');
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
            Configuração Remota & Controle Operacional
          </h2>
          <p className="text-xs text-slate-400">
            Governança em tempo real: manutenção, controle de compras, cadastros e feature flags para o app Android
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* App Config Form */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-400" />
              <span>Configuração Remota ({currentAppId})</span>
            </div>
            {appConfig?.updated_by && (
              <span className="text-[10px] text-slate-500 font-mono">
                Última alt.: {appConfig.updated_by}
              </span>
            )}
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            {/* 1. Maintenance Section */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${maintenanceMode ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Modo de Manutenção</span>
                    <span className="text-[11px] text-slate-400">
                      Sinaliza estado de manutenção remota para os clientes conectados
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`p-1 rounded-lg transition-colors ${
                    maintenanceMode ? 'text-amber-400' : 'text-slate-600'
                  }`}
                  title={maintenanceMode ? 'Desativar Manutenção' : 'Ativar Manutenção'}
                >
                  {maintenanceMode ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>

              {maintenanceMode && (
                <div className="pt-3 border-t border-slate-800/80 space-y-4 animate-fade-in">
                  {/* Maintenance Level */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">
                      Nível de Manutenção (maintenance_level)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setMaintenanceLevel('informational')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          maintenanceLevel === 'informational'
                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">Informational</span>
                        <span className="text-[10px] opacity-80 block mt-0.5">
                          Banner informativo; app e funções continuam abertos
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMaintenanceLevel('partial')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          maintenanceLevel === 'partial'
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">Partial</span>
                        <span className="text-[10px] opacity-80 block mt-0.5">
                          Banner + Bloqueio de novas compras e cadastros
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMaintenanceLevel('full')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          maintenanceLevel === 'full'
                            ? 'bg-rose-500/10 border-rose-500/50 text-rose-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">Full</span>
                        <span className="text-[10px] opacity-80 block mt-0.5">
                          Bloqueio total com tela de manutenção e retry
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Title & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                        Título do Aviso (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Manutenção Preventiva de Servidores"
                        value={maintenanceTitle}
                        onChange={(e) => setMaintenanceTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                        Previsão de Término (Opcional)
                      </label>
                      <input
                        type="datetime-local"
                        value={maintenanceEstimatedEnd}
                        onChange={(e) => setMaintenanceEstimatedEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                      Mensagem de Manutenção para o Usuário
                    </label>
                    <textarea
                      rows={2}
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
                      placeholder="Estamos realizando melhorias programadas. Voltamos em breve!"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Access, Registration & Auth Governance */}
            <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-brand-500/10 rounded-lg text-brand-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Governança de Autenticação & Acesso</h4>
                    <p className="text-[11px] text-slate-400">Controle granular de contas, provedores e fluxos de autenticação</p>
                  </div>
                </div>

                {/* Live Scenario Status */}
                <div className="flex items-center gap-2">
                  {!authenticationSystemEnabled ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                      Sistema Globalmente Desativado
                    </span>
                  ) : !registrationEnabled && loginEnabled ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Modo Restrito (Apenas Login)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Autenticação em Operação
                    </span>
                  )}
                </div>
              </div>

              {/* Master Activation Switch */}
              <div className={`p-4 rounded-xl border transition-all ${
                authenticationSystemEnabled 
                  ? 'bg-brand-950/30 border-brand-800/60' 
                  : 'bg-rose-950/20 border-rose-800/40'
              } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${authenticationSystemEnabled ? 'text-brand-400' : 'text-rose-400'}`} />
                    <span className="text-xs font-bold text-white">Chave Mestra do Sistema de Autenticação</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
                    {authenticationSystemEnabled 
                      ? 'O ecossistema de autenticação está operacional. Configurações granulares abaixo determinam o comportamento de login, cadastro e provedores.'
                      : 'ATENÇÃO: Todas as rotas de login, registro e tokens estão bloqueadas no servidor. O aplicativo funcionará em modo exclusivamente anônimo/local.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthenticationSystemEnabled(!authenticationSystemEnabled)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors shrink-0 ${
                    authenticationSystemEnabled
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 hover:bg-brand-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  }`}
                >
                  {authenticationSystemEnabled ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-brand-400" />
                      <span>Ativado Globalmente</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-rose-400" />
                      <span>Desativado</span>
                    </>
                  )}
                </button>
              </div>

              {/* Granular Feature Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Registration */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-white">Novos Cadastros</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">registration_enabled</span>
                    <span className="text-[10px] text-slate-500">Permite criar novas contas</span>
                  </div>
                  <button
                    type="button"
                    disabled={!authenticationSystemEnabled}
                    onClick={() => setRegistrationEnabled(!registrationEnabled)}
                    className={`p-1 rounded-lg transition-opacity ${
                      !authenticationSystemEnabled ? 'opacity-40 cursor-not-allowed' : ''
                    } ${registrationEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {registrationEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                {/* 2. Login */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <LogIn className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-white">Login de Usuários</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">login_enabled</span>
                    <span className="text-[10px] text-slate-500">Permite autenticar contas existentes</span>
                  </div>
                  <button
                    type="button"
                    disabled={!authenticationSystemEnabled}
                    onClick={() => setLoginEnabled(!loginEnabled)}
                    className={`p-1 rounded-lg transition-opacity ${
                      !authenticationSystemEnabled ? 'opacity-40 cursor-not-allowed' : ''
                    } ${loginEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {loginEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                {/* 3. Local Auth (Email/Username/Password) */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-white">Autenticação Local</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">local_auth_enabled</span>
                    <span className="text-[10px] text-slate-500">E-mail, Nome de Usuário e Senha</span>
                  </div>
                  <button
                    type="button"
                    disabled={!authenticationSystemEnabled}
                    onClick={() => setLocalAuthEnabled(!localAuthEnabled)}
                    className={`p-1 rounded-lg transition-opacity ${
                      !authenticationSystemEnabled ? 'opacity-40 cursor-not-allowed' : ''
                    } ${localAuthEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {localAuthEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                {/* 4. Logout Control */}
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold text-white">Encerramento de Sessão</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">logout_enabled</span>
                    <span className="text-[10px] text-slate-500">Permite ao usuário deslogar do app</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogoutEnabled(!logoutEnabled)}
                    className={`p-1 rounded-lg ${logoutEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {logoutEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>
              </div>

              {/* Google Sign-In Provider Governance */}
              <div className="p-4 bg-slate-900/70 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <div>
                      <span className="text-xs font-bold text-white">Provedor: Google Sign-In</span>
                      <span className="text-[10px] text-slate-400 block">google_auth_enabled & google_auth_status</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status badge & selector */}
                    <select
                      value={googleAuthStatus}
                      onChange={(e) => setGoogleAuthStatus(e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="coming_soon">Status: Em Breve (coming_soon)</option>
                      <option value="enabled">Status: Habilitado (enabled)</option>
                      <option value="disabled">Status: Desabilitado (disabled)</option>
                    </select>

                    <button
                      type="button"
                      disabled={!authenticationSystemEnabled}
                      onClick={() => setGoogleAuthEnabled(!googleAuthEnabled)}
                      className={`p-1 rounded-lg transition-opacity ${
                        !authenticationSystemEnabled ? 'opacity-40 cursor-not-allowed' : ''
                      } ${googleAuthEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                    >
                      {googleAuthEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    O Google Sign-In é governado de forma independente: quando o status for <strong>Em Breve</strong>, o app exibe a pré-indicação sem disparar fluxos com credenciais ausentes. Ative apenas quando o SHA-1 e o Client ID OAuth estiverem configurados.
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Commerce & Premium */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                <span>Monetização & Comércio</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Compras no App</span>
                    <span className="text-[10px] text-slate-400">purchases_enabled (Google Play)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPurchasesEnabled(!purchasesEnabled)}
                    className={`p-1 rounded-lg ${purchasesEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {purchasesEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Sistema Premium</span>
                    <span className="text-[10px] text-slate-400">premium_enabled (Ofertas/Paywall)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPremiumEnabled(!premiumEnabled)}
                    className={`p-1 rounded-lg ${premiumEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {premiumEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Core Features Toggles */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Recursos & Módulos do Aplicativo</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Notificações</span>
                      <span className="text-[10px] text-slate-400">notifications_enabled</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={`p-1 rounded-lg ${notificationsEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {notificationsEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Central de Suporte</span>
                      <span className="text-[10px] text-slate-400">support_enabled</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSupportEnabled(!supportEnabled)}
                    className={`p-1 rounded-lg ${supportEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {supportEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Sincronização Nuvem</span>
                      <span className="text-[10px] text-slate-400">cloud_sync_enabled</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCloudSyncEnabled(!cloudSyncEnabled)}
                    className={`p-1 rounded-lg ${cloudSyncEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {cloudSyncEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Devocionais</span>
                      <span className="text-[10px] text-slate-400">devotionals_enabled</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDevotionalsEnabled(!devotionalsEnabled)}
                    className={`p-1 rounded-lg ${devotionalsEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {devotionalsEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Busca Bíblica</span>
                      <span className="text-[10px] text-slate-400">search_enabled</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchEnabled(!searchEnabled)}
                    className={`p-1 rounded-lg ${searchEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {searchEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Compartilhamento</span>
                      <span className="text-[10px] text-slate-400">sharing_enabled</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSharingEnabled(!sharingEnabled)}
                    className={`p-1 rounded-lg ${sharingEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {sharingEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Download Offline</span>
                      <span className="text-[10px] text-slate-400">offline_download_enabled</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOfflineDownloadEnabled(!offlineDownloadEnabled)}
                    className={`p-1 rounded-lg ${offlineDownloadEnabled ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {offlineDownloadEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Versioning & Store */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-1">
                <Smartphone className="w-3.5 h-3.5 text-brand-400" />
                <span>Versões & Google Play Store</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Versão Mínima Suportada
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={minVersion}
                    onChange={(e) => setMinVersion(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Versão Mais Recente (Store)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={latestVersion}
                    onChange={(e) => setLatestVersion(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Forçar Atualização</span>
                  <span className="text-[10px] text-slate-400">
                    Exige que versões inferiores à mínima atualizem na loja para continuar
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={forceUpdate}
                  onChange={(e) => setForceUpdate(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 bg-slate-950 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  URL da Loja Google Play
                </label>
                <input
                  type="url"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {hasPermission('apps.write') && (
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingConfig ? 'Salvando Configurações...' : 'Salvar Todas as Configurações Remotas'}</span>
              </button>
            )}
          </form>
        </div>

        {/* Feature Flags Panel */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 space-y-5 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-brand-400" />
              <span>Feature Flags Dinâmicas ({featureFlags.length})</span>
            </h3>

            {hasPermission('feature_flags.write') && (
              <button
                onClick={() => setFlagModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300 bg-brand-950/60 px-3 py-1.5 rounded-lg border border-brand-800/50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Flag</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Chaves booleanas específicas consumidas no app via <code className="text-slate-300 font-mono">/api/v1/app/config</code>
          </p>

          <div className="space-y-3">
            {featureFlags.map((flag) => (
              <div
                key={flag.id}
                className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white font-mono truncate">{flag.key}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {flag.description || 'Sem descrição.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleFlag(flag)}
                  className={`p-1 rounded-lg transition-colors shrink-0 ${
                    flag.enabled ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                  title={flag.enabled ? 'Clique para desativar' : 'Clique para ativar'}
                >
                  {flag.enabled ? (
                    <ToggleRight className="w-7 h-7" />
                  ) : (
                    <ToggleLeft className="w-7 h-7" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Flag Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Criar Nova Feature Flag</h3>
              <button
                onClick={() => setFlagModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFlag} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Chave da Flag (Key)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: feature_ai_chat_support"
                  value={newFlagKey}
                  onChange={(e) => setNewFlagKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Descrição da funcionalidade no app..."
                  value={newFlagDesc}
                  onChange={(e) => setNewFlagDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={newFlagEnabled}
                  onChange={(e) => setNewFlagEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs text-slate-300">Iniciar com flag ativada</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFlagModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold rounded-xl"
                >
                  Criar Flag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
