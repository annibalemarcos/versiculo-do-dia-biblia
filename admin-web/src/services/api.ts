export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export function joinApiUrl(baseUrl: string, endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanBase = (baseUrl || '/api/v1').replace(/\/+$/, '');
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If cleanBase already ends with /api/v1, strip duplicate /api/v1 from start of cleanEndpoint
  if (cleanBase.endsWith('/api/v1')) {
    if (cleanEndpoint.startsWith('/api/v1/')) {
      cleanEndpoint = cleanEndpoint.substring('/api/v1'.length);
    } else if (cleanEndpoint === '/api/v1') {
      cleanEndpoint = '';
    }
  }

  return `${cleanBase}${cleanEndpoint}`;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data: T; error?: any; message?: string }> {
    const url = joinApiUrl(API_BASE_URL, endpoint);
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          window.location.href = '/login';
        }
        throw new Error(data?.error?.message || data?.detail || 'Erro na requisição');
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        data: null as any,
        error: { message: err.message || 'Erro de conexão com o servidor' },
      };
    }
  }

  get<T>(endpoint: string, params?: Record<string, any>) {
    let url = endpoint;
    if (params) {
      const filteredParams = Object.entries(params).filter(
        ([_, v]) => v !== undefined && v !== null && v !== ''
      );
      if (filteredParams.length > 0) {
        const query = new URLSearchParams(
          filteredParams.map(([k, v]) => [k, String(v)])
        ).toString();
        url += `?${query}`;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
