import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { AppConfigData } from '../../types';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Lock,
  UserX
} from 'lucide-react';

export const MaintenanceAlertBanner: React.FC = () => {
  const { currentAppId } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfigData | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [minimized, setMinimized] = useState<boolean>(false);

  const fetchConfig = async () => {
    try {
      const res = await api.get<any>(`/admin/apps/${currentAppId || 'verse_daily'}/config`);
      if (res.success && res.data) {
        const raw = res.data.config || res.data;
        setConfig(raw);
      }
    } catch (_) {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, 30000);
    return () => clearInterval(interval);
  }, [currentAppId]);

  if (!config) return null;

  const isMaintenanceActive = config.maintenance_mode;
  const isAuthRestricted =
    config.authentication_system_enabled === false ||
    config.registration_enabled === false ||
    config.login_enabled === false ||
    config.local_auth_enabled === false;

  const level = config.maintenance_level || 'informational';
  const isFull = level === 'full';
  const isPartial = level === 'partial';
  const isMandatoryMaintenance = isMaintenanceActive && (isFull || isPartial);

  if (!isMaintenanceActive && !isAuthRestricted) return null;
  // If in active maintenance (Standard or Shade), the banner is strictly mandatory and cannot be dismissed
  if (dismissed && !isMandatoryMaintenance) return null;

  // Choose styling according to severity
  const bannerBg = isFull
    ? 'bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-rose-600/60 text-rose-100'
    : isPartial
    ? 'bg-gradient-to-r from-amber-950 via-orange-950 to-amber-950 border-amber-600/60 text-amber-100'
    : 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-indigo-600/60 text-indigo-100';

  return (
    <aside
      aria-label="Alerta de Manutenção e Governança"
      className={`border-b transition-all duration-300 shadow-xl ${bannerBg}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4">
          {/* Main Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isFull
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                  : isPartial
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
              }`}
            >
              {isFull ? <Lock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                  {isFull
                    ? 'Manutenção Geral Ativa (Full)'
                    : isPartial
                    ? 'Modo Shade / Manutenção Parcial'
                    : isMaintenanceActive
                    ? 'Aviso Informativo de Manutenção'
                    : 'Governança de Autenticação Restrita'}
                </span>

                <span className="text-xs font-semibold truncate">
                  {config.maintenance_title ||
                    (isMaintenanceActive
                      ? 'O aplicativo está com restrições ativas para os usuários finais.'
                      : 'Certas rotas de autenticação ou cadastro estão desativadas')}
                </span>
              </div>

              {!minimized && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-90 mt-1">
                  <span>{config.maintenance_message}</span>

                  {config.maintenance_estimated_end && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-amber-200">
                      <Clock className="w-3 h-3" />
                      Previsão: {new Date(config.maintenance_estimated_end).toLocaleString('pt-BR')}
                    </span>
                  )}

                  {config.registration_enabled === false && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-300">
                      <UserX className="w-3 h-3" /> Novos cadastros bloqueados
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/multi-app')}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/20"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ajustar no</span> Apps & Flags
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title={minimized ? 'Expandir detalhes' : 'Minimizar'}
            >
              {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {!isMandatoryMaintenance && (
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Dispensar alerta nesta sessão"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default MaintenanceAlertBanner;
