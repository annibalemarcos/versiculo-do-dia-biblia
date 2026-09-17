import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export type ToastType = 'critical' | 'error' | 'warning' | 'info' | 'success';

export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  source?: string;
  component?: string;
  timestamp?: string;
  recommendation?: string;
  duration?: number; // 0 for persistent until dismissed
  actions?: ToastAction[];
  meta?: Record<string, any>;
}

interface ToastContextType {
  toasts: ToastItem[];
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  showToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string;
  showCriticalHealthToast: (alert: {
    id?: string;
    title?: string;
    message: string;
    component?: string;
    source?: string;
    recommendation?: string;
    meta?: Record<string, any>;
  }) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  playAlertChime: (type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Web Audio API chime synthesizer (self-contained, no external mp3 assets required)
const playSynthesizedChime = (type: ToastType = 'critical') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'critical' || type === 'error') {
      // 3-tone urgent alarm beep: 880Hz -> 660Hz -> 880Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(660, now + 0.12);
      osc1.frequency.setValueAtTime(920, now + 0.24);

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
    } else if (type === 'warning') {
      // Dual warm chime: 580Hz -> 440Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.setValueAtTime(440, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Subtle gentle chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(720, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (_) {
    // Ignore audio failures if browser blocks autoplay before user gesture
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('admin_toast_sound') !== 'false';
  });
  const navigate = useNavigate();

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('admin_toast_sound', enabled ? 'true' : 'false');
  };

  const playAlertChime = useCallback(
    (type: ToastType = 'critical') => {
      if (soundEnabled) {
        playSynthesizedChime(type);
      }
    },
    [soundEnabled]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'> & { id?: string }): string => {
      const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        ...toast,
        id,
        timestamp: toast.timestamp || new Date().toISOString(),
        duration: toast.duration !== undefined ? toast.duration : (toast.type === 'critical' ? 14000 : 7000),
      };

      setToasts((prev) => {
        // Prevent exact duplicate ID
        const exists = prev.some((t) => t.id === id);
        if (exists) {
          return prev.map((t) => (t.id === id ? newToast : t));
        }
        // Limit active toasts to max 5 to prevent screen clutter
        return [newToast, ...prev.slice(0, 4)];
      });

      if (newToast.type === 'critical' || newToast.type === 'error') {
        playAlertChime(newToast.type);
      }

      return id;
    },
    [playAlertChime]
  );

  const showCriticalHealthToast = useCallback(
    (alert: {
      id?: string;
      title?: string;
      message: string;
      component?: string;
      source?: string;
      recommendation?: string;
      meta?: Record<string, any>;
    }): string => {
      const componentName = alert.component || alert.source || 'Infraestrutura';
      return showToast({
        id: alert.id,
        type: 'critical',
        title: alert.title || `Falha Crítica de Saúde: ${componentName}`,
        message: alert.message,
        component: componentName,
        source: alert.source,
        recommendation: alert.recommendation,
        meta: alert.meta,
        duration: 16000, // Stays 16s or until dismissed
        actions: [
          {
            label: 'Investigar no Diagnóstico',
            primary: true,
            onClick: () => {
              navigate('/system-health');
            },
          },
        ],
      });
    },
    [showToast, navigate]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        soundEnabled,
        setSoundEnabled,
        showToast,
        showCriticalHealthToast,
        dismissToast,
        clearAllToasts,
        playAlertChime,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
