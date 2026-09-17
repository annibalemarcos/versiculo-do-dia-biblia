import React, { useState, useEffect, useRef } from 'react';
import { useToast, ToastItem, ToastType } from '../../context/ToastContext';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
} from 'lucide-react';

interface ToastItemProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const SingleToastCard: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(toast.duration || 10000);
  const totalDuration = toast.duration || 10000;

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const intervalTime = 100;
    const timer = setInterval(() => {
      if (!isHovered) {
        setRemainingTime((prev) => {
          if (prev <= intervalTime) {
            clearInterval(timer);
            onDismiss(toast.id);
            return 0;
          }
          return prev - intervalTime;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [toast.id, toast.duration, isHovered, onDismiss]);

  const progressPercent = totalDuration > 0 ? (remainingTime / totalDuration) * 100 : 100;

  const isCritical = toast.type === 'critical';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isSuccess = toast.type === 'success';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      aria-live="assertive"
      className={`group relative w-full sm:w-[420px] rounded-2xl p-4 shadow-2xl border transition-all duration-300 pointer-events-auto backdrop-blur-xl ${
        isCritical
          ? 'bg-rose-950/95 border-rose-500/80 text-rose-100 shadow-[0_12px_45px_rgba(244,63,94,0.35)] ring-2 ring-rose-500/30 animate-in fade-in slide-in-from-top-4'
          : isError
          ? 'bg-red-950/95 border-red-500/70 text-red-100 shadow-xl ring-1 ring-red-500/20'
          : isWarning
          ? 'bg-amber-950/95 border-amber-500/70 text-amber-100 shadow-xl ring-1 ring-amber-500/20'
          : isSuccess
          ? 'bg-emerald-950/95 border-emerald-500/70 text-emerald-100 shadow-xl ring-1 ring-emerald-500/20'
          : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-xl ring-1 ring-slate-700/50'
      }`}
    >
      {/* Top Banner / Badges */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              isCritical
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : isError
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : isWarning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : isSuccess
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
            }`}
          >
            {isCritical ? (
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            ) : isError ? (
              <ShieldAlert className="w-4 h-4" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono ${
              isCritical
                ? 'bg-rose-500 text-white animate-pulse'
                : isError
                ? 'bg-red-500 text-white'
                : isWarning
                ? 'bg-amber-500 text-slate-950'
                : isSuccess
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-700 text-slate-200'
            }`}
          >
            {isCritical
              ? 'ERRO CRÍTICO'
              : isError
              ? 'ERRO'
              : isWarning
              ? 'ALERTA'
              : isSuccess
              ? 'SUCESSO'
              : 'INFO'}
          </span>

          {toast.component && (
            <span className="text-xs font-semibold text-slate-300 bg-black/40 px-2 py-0.5 rounded-md border border-white/10 truncate max-w-[150px]">
              {toast.component}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-mono text-slate-400">
            {toast.timestamp
              ? new Date(toast.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : 'Agora'}
          </span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Dispensar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-1.5 pl-0.5">
        <h4 className="text-sm font-bold leading-tight tracking-tight text-white">
          {toast.title}
        </h4>
        <p className="text-xs text-slate-200 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      {/* Recommendation Box if provided */}
      {toast.recommendation && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-200 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Ação recomendada:</strong> {toast.recommendation}
          </div>
        </div>
      )}

      {/* Collapsible Technical Details */}
      {toast.meta && Object.keys(toast.meta).length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
          >
            <span>Metadados Técnicos</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showDetails && (
            <pre className="mt-1.5 p-2 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-28">
              {JSON.stringify(toast.meta, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {toast.actions && toast.actions.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-end gap-2 flex-wrap">
          {toast.actions.map((act, idx) => (
            <button
              key={idx}
              onClick={() => {
                act.onClick();
                onDismiss(toast.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                act.primary
                  ? isCritical
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-md'
                    : 'bg-brand-500 hover:bg-brand-400 text-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <span>{act.label}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Countdown Progress Bar */}
      {totalDuration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 rounded-b-2xl overflow-hidden">
          <div
            className={`h-full transition-all linear ${
              isCritical
                ? 'bg-rose-400'
                : isError
                ? 'bg-red-400'
                : isWarning
                ? 'bg-amber-400'
                : isSuccess
                ? 'bg-emerald-400'
                : 'bg-brand-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, clearAllToasts, soundEnabled, setSoundEnabled } = useToast();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Alertas do sistema"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-[calc(100vw-2.5rem)] pointer-events-none"
    >
      {/* Mini Controls Bar when toasts are present */}
      {toasts.length > 1 && (
        <div className="self-end flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-xs font-mono shadow-lg pointer-events-auto backdrop-blur-md">
          <span>{toasts.length} alertas ativos</span>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
            title={soundEnabled ? 'Silenciar alertas sonoros' : 'Ativar alertas sonoros'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px]">Som ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px]">Som OFF</span>
              </>
            )}
          </button>
          <span className="text-slate-600">|</span>
          <button
            onClick={clearAllToasts}
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors text-[10px] font-semibold"
            title="Limpar todos os alertas"
          >
            <Trash2 className="w-3 h-3" />
            Limpar
          </button>
        </div>
      )}

      {/* Toast Cards Stack */}
      <div className="flex flex-col gap-3 items-end">
        {toasts.map((toast) => (
          <SingleToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </aside>
  );
};
