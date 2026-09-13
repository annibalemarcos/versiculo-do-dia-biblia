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
} from 'lucide-react';

export const MultiAppConfig: React.FC = () => {
  const { currentAppId, hasPermission } = useAuth();

  const [apps, setApps] = useState<AppItem[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfigData | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Config Form
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
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
      setMaintenanceMessage(cfgRes.data.maintenance_message);
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
      maintenance_message: maintenanceMessage,
      minimum_supported_version: minVersion,
      latest_version: latestVersion,
      force_update: forceUpdate,
      store_url: storeUrl,
    };

    const res = await api.put(`/admin/apps/${currentAppId}/config`, payload);
    setSavingConfig(false);

    if (res.success) {
      setToastMessage('Configurações do aplicativo salvas com sucesso!');
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
        <div className="fixed top-20 right-8 z-50 bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Controle de Aplicativos & Feature Flags
          </h2>
          <p className="text-xs text-slate-400">
            Gerenciamento de versões mínimas, modo de manutenção e alternância dinâmica de recursos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Config Form */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-400" />
            <span>Configuração Operacional do App ({currentAppId})</span>
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            {/* Maintenance Mode */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Modo de Manutenção</span>
                  <span className="text-[11px] text-slate-400">
                    Bloqueia temporariamente o acesso do app mobile exibindo mensagem explicativa
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`p-1 rounded-lg transition-colors ${
                    maintenanceMode ? 'text-amber-400' : 'text-slate-600'
                  }`}
                >
                  {maintenanceMode ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>

              {maintenanceMode && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Mensagem de Manutenção para o Usuário
                  </label>
                  <input
                    type="text"
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}
            </div>

            {/* Versions */}
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
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
                className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            {hasPermission('apps.write') && (
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingConfig ? 'Salvando...' : 'Salvar Configurações do App'}</span>
              </button>
            )}
          </form>
        </div>

        {/* Feature Flags Panel */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-brand-400" />
              <span>Feature Flags ({featureFlags.length})</span>
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

          <div className="space-y-3">
            {featureFlags.map((flag) => (
              <div
                key={flag.id}
                className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs font-bold text-white font-mono">{flag.key}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
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
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
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
