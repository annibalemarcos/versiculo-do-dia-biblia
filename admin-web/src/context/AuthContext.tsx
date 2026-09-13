import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, AuthState } from '../types';
import { api } from '../services/api';
import { pushNotificationService } from '../services/pushNotification';

interface AuthContextType extends AuthState {
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
  currentAppId: string;
  setCurrentAppId: (appId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentAppId, setCurrentAppId] = useState<string>('verse_daily');

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');
    const savedApp = localStorage.getItem('admin_current_app_id');

    if (savedApp) {
      setCurrentAppId(savedApp);
    }

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with server profile
        api.get<AdminUser>('/admin/auth/me').then((res) => {
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('admin_user', JSON.stringify(res.data));
            // Sync push device if permission was already granted
            if (pushNotificationService.getPermissionStatus() === 'granted') {
              pushNotificationService.syncDeviceRegistration().catch(() => {});
            }
          }
        });
      } catch (e) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleSetCurrentApp = (appId: string) => {
    setCurrentAppId(appId);
    localStorage.setItem('admin_current_app_id', appId);
  };

  const login = async (email: string, pass: string) => {
    const res = await api.post<{
      access_token: string;
      token_type: string;
      user: AdminUser;
    }>('/admin/auth/login', { email, password: pass });

    if (res.success && res.data) {
      const accessToken = res.data.access_token;
      const userData = res.data.user;
      setToken(accessToken);
      setUser(userData);
      localStorage.setItem('admin_token', accessToken);
      localStorage.setItem('admin_user', JSON.stringify(userData));

      // Sync push registration if permission already granted
      if (pushNotificationService.getPermissionStatus() === 'granted') {
        pushNotificationService.syncDeviceRegistration().catch(() => {});
      }

      return { success: true };
    }

    return {
      success: false,
      message: res.error?.message || 'Falha ao autenticar. Verifique seus dados.',
    };
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return user.permissions?.includes(perm) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return user.roles?.includes(role) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole,
        currentAppId,
        setCurrentAppId: handleSetCurrentApp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
