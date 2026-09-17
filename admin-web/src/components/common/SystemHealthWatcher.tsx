import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { HealthAlert, SystemErrorLog } from '../../types';

interface CriticalCheckResponse {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  critical_alerts: HealthAlert[];
  warning_alerts?: HealthAlert[];
  critical_errors: SystemErrorLog[];
  checked_at: string;
}

export const SystemHealthWatcher: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { showCriticalHealthToast, showToast } = useToast();

  const isFirstRun = useRef(true);
  const seenAlertIds = useRef<Set<string>>(new Set());
  const seenErrorIds = useRef<Set<string>>(new Set());
  const lastOverallStatus = useRef<string>('healthy');

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    const performHealthCheck = async () => {
      try {
        const res = await api.get<CriticalCheckResponse>('/admin/health/critical-check');
        if (!isMounted || !res.success || !res.data) return;

        const { overall_status, critical_alerts = [], critical_errors = [] } = res.data;

        if (isFirstRun.current) {
          isFirstRun.current = false;
          // Seed seen IDs with existing ones
          critical_alerts.forEach((a) => seenAlertIds.current.add(a.id));
          critical_errors.forEach((e) => seenErrorIds.current.add(e.id));
          lastOverallStatus.current = overall_status;

          // If system was already unhealthy on initial login, trigger an initial critical alert
          if (overall_status === 'unhealthy' && critical_alerts.length > 0) {
            const first = critical_alerts[0];
            showCriticalHealthToast({
              id: `init-${first.id}`,
              title: `Falha Crítica Ativa: ${first.component}`,
              message: first.message,
              component: first.component,
              recommendation: first.recommendation,
              meta: { total_critical_alerts: critical_alerts.length, status: overall_status },
            });
          }
          return;
        }

        // Detect new critical health alerts
        for (const alert of critical_alerts) {
          if (!seenAlertIds.current.has(alert.id)) {
            seenAlertIds.current.add(alert.id);
            showCriticalHealthToast({
              id: alert.id,
              title: alert.title || `Falha Crítica no Provedor: ${alert.component}`,
              message: alert.message,
              component: alert.component,
              recommendation: alert.recommendation,
              meta: { alert_id: alert.id, severity: alert.severity },
            });
          }
        }

        // Detect new critical system errors in backend logs
        for (const err of critical_errors) {
          if (!seenErrorIds.current.has(err.id)) {
            seenErrorIds.current.add(err.id);
            showCriticalHealthToast({
              id: err.id,
              title: `Erro Fatal no Subsistema [${err.source}]`,
              message: err.message,
              component: err.source,
              source: err.source,
              recommendation: 'Acesse a Central de Saúde para visualizar a pilha de erros e isolar o incidente.',
              meta: err.details,
            });
          }
        }

        // Detect critical degradation from healthy to unhealthy
        if (
          lastOverallStatus.current === 'healthy' &&
          overall_status === 'unhealthy' &&
          critical_alerts.length === 0 &&
          critical_errors.length === 0
        ) {
          showCriticalHealthToast({
            id: `status-unhealthy-${Date.now()}`,
            title: 'Queda de Integridade do Sistema',
            message: 'O status global do sistema mudou de Saudável para Instável/Não Saudável.',
            component: 'Monitoramento Geral',
            recommendation: 'Verifique os logs de conexão do banco de dados e APIs externas.',
          });
        }

        lastOverallStatus.current = overall_status;
      } catch (err) {
        // Silently tolerate transient network poll failure
      }
    };

    // Initial check
    performHealthCheck();

    // Poll every 12 seconds
    pollTimer = setInterval(performHealthCheck, 12000);

    // Also listen for custom manual triggers (e.g. from simulation buttons)
    const handleCheckNow = () => {
      performHealthCheck();
    };
    window.addEventListener('system-health:check-now', handleCheckNow);

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener('system-health:check-now', handleCheckNow);
    };
  }, [isAuthenticated, showCriticalHealthToast, showToast]);

  return null;
};
