const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('unguealhealth_token');
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    let data: any = null;
    const ct = response.headers.get('content-type') || '';
    if (response.status !== 204 && ct.includes('application/json')) {
      try { data = await response.json(); } catch { data = null; }
    }

    if (!response.ok) {
      const msg = data?.message || data?.error || response.statusText || 'Une erreur est survenue';
      const err: any = new Error(msg);
      err.status = response.status;
      err.details = data?.errors;
      throw err;
    }
    return data;
  }

  // Auth
  register(userData: { nom: string; prenom?: string; email: string; password: string; password_confirmation: string }) {
    return this.request('/register', { method: 'POST', body: JSON.stringify(userData) });
  }
  login(credentials: { email: string; password: string }) {
    return this.request('/login', { method: 'POST', body: JSON.stringify(credentials) });
  }
  logout() {
    return this.request('/logout', { method: 'POST' });
  }
  me() {
    return this.request('/me', { method: 'GET' });
  }
  forgotPassword(email: string) {
    return this.request('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  }

  // Profile
  getProfile() { return this.request('/profile', { method: 'GET' }); }
  updateProfile(data: any) { return this.request('/profile', { method: 'PUT', body: JSON.stringify(data) }); }
  changePassword(data: { current_password: string; new_password: string; new_password_confirmation: string }) {
    return this.request('/change-password', { method: 'PUT', body: JSON.stringify(data) });
  }
  deleteAccount() { return this.request('/profile', { method: 'DELETE' }); }

  // Analysis
  uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.request('/upload-image', { method: 'POST', body: formData });
  }
  analyzeImage(analysisId: string) {
    return this.request('/analyze-image', { method: 'POST', body: JSON.stringify({ analysis_id: analysisId }) });
  }

  // History
  getHistory(page = 1, limit = 10) {
    return this.request(`/history?page=${page}&limit=${limit}`, { method: 'GET' });
  }
  getAnalysisDetail(id: string) { return this.request(`/history/${id}`, { method: 'GET' }); }
  deleteAnalysis(id: string) { return this.request(`/history/${id}`, { method: 'DELETE' }); }
  getStatistics() { return this.request('/history/stats', { method: 'GET' }); }
  exportHistory(format = 'json') { return this.request(`/history/export?format=${format}`, { method: 'GET' }); }
}

export const api = new ApiClient(API_BASE_URL);
