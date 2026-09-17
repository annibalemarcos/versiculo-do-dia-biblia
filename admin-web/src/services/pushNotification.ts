import { api } from './api';
import { PushDiagnosticsData, StaffPushDeviceItem } from '../types';

const TOKEN_STORAGE_KEY = 'staff_push_device_token_v1';

export const pushNotificationService = {
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window
    );
  },

  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  getBrowserInfo(): string {
    if (typeof navigator === 'undefined') return 'Web Browser';
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'Microsoft Edge';
    if (ua.includes('Chrome/')) return 'Google Chrome';
    if (ua.includes('Firefox/')) return 'Mozilla Firefox';
    if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Apple Safari';
    return 'Navegador Web';
  },

  getDeviceName(): string {
    if (typeof navigator === 'undefined') return 'Computador';
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'Windows Desktop';
    if (/Macintosh|Mac OS/i.test(ua)) return 'macOS Workstation';
    if (/Linux/i.test(ua)) return 'Linux Workstation';
    if (/Android/i.test(ua)) return 'Android Device';
    if (/iPhone|iPad/i.test(ua)) return 'iOS Device';
    return 'Painel Administrativo Web';
  },

  getOrCreateDeviceToken(): string {
    try {
      let token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        token = 'staff_web_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
      return token;
    } catch (_) {
      return 'staff_web_fallback_' + Date.now();
    }
  },

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.warn('[StaffPush] Erro ao registrar Service Worker:', err);
      return null;
    }
  },

  async syncDeviceRegistration(): Promise<{ success: boolean; device?: StaffPushDeviceItem; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Notificações push não suportadas neste navegador' };
    }

    if (Notification.permission !== 'granted') {
      return { success: false, error: 'Permissão de notificação não concedida' };
    }

    try {
      await this.registerServiceWorker();
      const token = this.getOrCreateDeviceToken();
      const browser = this.getBrowserInfo();
      const deviceName = this.getDeviceName();

      const res = await api.post<{
        id: string;
        token_masked: string;
        provider: string;
        platform: string;
        browser: string;
        active: boolean;
        last_seen_at: string;
      }>('/admin/notifications/devices', {
        token,
        provider: 'webpush',
        platform: 'web_desktop',
        browser,
        device_name: deviceName,
      });

      if (res.success && res.data) {
        return { success: true, device: res.data as any };
      }
      return { success: false, error: res.error?.message || 'Falha ao sincronizar dispositivo no servidor' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro inesperado na sincronização' };
    }
  },

  async requestPermissionAndEnable(): Promise<{ success: boolean; status: NotificationPermission | 'unsupported'; message?: string }> {
    if (!this.isSupported()) {
      return { success: false, status: 'unsupported', message: 'Seu navegador não suporta notificações Push.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const syncRes = await this.syncDeviceRegistration();
        if (syncRes.success) {
          // Trigger a lightweight confirmation through SW
          try {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
              reg.showNotification('Notificações Staff Ativadas! 🔔', {
                body: 'Você receberá alertas em tempo real de chamados atribuídos e solicitações da equipe.',
                icon: '/favicon.svg',
                tag: 'staff-activated',
              });
            }
          } catch (_) {}

          return { success: true, status: 'granted', message: 'Notificações push ativadas com sucesso!' };
        }
        return { success: false, status: 'granted', message: syncRes.error || 'Permissão concedida, mas erro ao registrar no servidor.' };
      }

      if (permission === 'denied') {
        return {
          success: false,
          status: 'denied',
          message: 'As notificações foram bloqueadas no navegador. Para ativar, clique no ícone de cadeado na barra de endereço do navegador.',
        };
      }

      return { success: false, status: permission, message: 'Permissão pendente.' };
    } catch (err: any) {
      return { success: false, status: 'default', message: err.message || 'Erro ao solicitar permissão.' };
    }
  },

  async sendTestPush(title?: string, message?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post<any>('/admin/notifications/test-push', {
        title: title || '🔔 Teste de Notificação Staff',
        message: message || 'As notificações push estão ativas e funcionando perfeitamente no seu navegador!',
        action_url: '/notifications',
      });

      if (res.success) {
        // Also trigger native foreground notification via ServiceWorker if permission granted
        if (this.isSupported() && Notification.permission === 'granted') {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (reg) {
              reg.showNotification(title || '🔔 Teste de Notificação Staff', {
                body: message || 'As notificações push estão ativas e funcionando perfeitamente no seu navegador!',
                icon: '/favicon.svg',
                tag: 'test-push-native',
                data: { url: '/notifications' },
              });
            }
          } catch (_) {}
        }
        return { success: true, message: res.message || 'Notificação de teste enviada!' };
      }
      return { success: false, message: res.error?.message || 'Falha ao enviar notificação de teste.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao disparar notificação de teste.' };
    }
  },

  async getDiagnostics(): Promise<PushDiagnosticsData | null> {
    try {
      const res = await api.get<PushDiagnosticsData>('/admin/notifications/push-diagnostics');
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    } catch (_) {
      return null;
    }
  },

  async unregisterDevice(deviceId: string): Promise<boolean> {
    try {
      const res = await api.delete(`/admin/notifications/devices/${deviceId}`);
      return res.success;
    } catch (_) {
      return false;
    }
  },
};
