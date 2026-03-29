import { UserRole } from '@/contexts/AuthContext';

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

  // ============================================
  // Auth
  // ============================================
  register(userData: { nom: string; prenom?: string; email: string; password: string; password_confirmation: string; role?: UserRole }) {
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

  // ============================================
  // Profile
  // ============================================
  getProfile() { return this.request('/profile', { method: 'GET' }); }
  updateProfile(data: any) { return this.request('/profile', { method: 'PUT', body: JSON.stringify(data) }); }
  changePassword(data: { current_password: string; new_password: string; new_password_confirmation: string }) {
    return this.request('/change-password', { method: 'PUT', body: JSON.stringify(data) });
  }
  deleteAccount() { return this.request('/profile', { method: 'DELETE' }); }

  // ============================================
  // Analysis
  // ============================================
  uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.request('/upload-image', { method: 'POST', body: formData });
  }
  analyzeImage(analysisId: string) {
    return this.request('/analyze-image', { method: 'POST', body: JSON.stringify({ analysis_id: analysisId }) });
  }

  // ============================================
  // History
  // ============================================
  getHistory(page = 1, limit = 10) {
    return this.request(`/history?page=${page}&limit=${limit}`, { method: 'GET' });
  }
  getAnalysisDetail(id: string) { return this.request(`/history/${id}`, { method: 'GET' }); }
  deleteAnalysis(id: string) { return this.request(`/history/${id}`, { method: 'DELETE' }); }
  getStatistics() { return this.request('/history/stats', { method: 'GET' }); }
  exportHistory(format = 'json') { return this.request(`/history/export?format=${format}`, { method: 'GET' }); }

  // ============================================
  // Admin
  // ============================================
  getAdminDashboard() {
    return this.request('/admin/dashboard', { method: 'GET' });
  }
  getAdminUsers(params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return this.request(`/admin/users?${query.toString()}`, { method: 'GET' });
  }
  getAdminUser(userId: number) {
    return this.request(`/admin/users/${userId}`, { method: 'GET' });
  }
  updateUserRole(userId: number, role: UserRole) {
    return this.request(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
  }
  updateUserStatus(userId: number, status: string) {
    return this.request(`/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  }
  verifyProfessional(userId: number, verified: boolean) {
    return this.request(`/admin/users/${userId}/verify`, { method: 'POST', body: JSON.stringify({ verified }) });
  }
  getAdminAnalyses(params?: { page?: number; limit?: number; risk?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.risk) query.set('risk', params.risk);
    if (params?.status) query.set('status', params.status);
    return this.request(`/admin/analyses?${query.toString()}`, { method: 'GET' });
  }
  getAdminFeedback(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    return this.request(`/admin/feedback?${query.toString()}`, { method: 'GET' });
  }
  updateFeedback(feedbackId: number, data: { status?: string; admin_notes?: string }) {
    return this.request(`/admin/feedback/${feedbackId}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  getAdminLogs(params?: { page?: number; limit?: number; severity?: string; action?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.severity) query.set('severity', params.severity);
    if (params?.action) query.set('action', params.action);
    return this.request(`/admin/logs?${query.toString()}`, { method: 'GET' });
  }

  // ============================================
  // Professional
  // ============================================
  getProfessionalDashboard() {
    return this.request('/professional/dashboard', { method: 'GET' });
  }
  getProfessionalPatients(status = 'active') {
    return this.request(`/professional/patients?status=${status}`, { method: 'GET' });
  }
  getPendingRequests() {
    return this.request('/professional/requests', { method: 'GET' });
  }
  handleLinkRequest(linkId: number, action: 'accept' | 'reject') {
    return this.request(`/professional/requests/${linkId}`, { method: 'PUT', body: JSON.stringify({ action }) });
  }
  invitePatient(email: string) {
    return this.request('/professional/invite', { method: 'POST', body: JSON.stringify({ email }) });
  }
  getPatientDossier(patientId: number) {
    return this.request(`/professional/patients/${patientId}`, { method: 'GET' });
  }
  addProfessionalNote(data: {
    patient_id: number;
    contenu: string;
    type?: string;
    titre?: string;
    importance?: string;
    visibilite?: string;
    analysis_id?: number;
    treatment_plan_id?: number;
  }) {
    return this.request('/professional/notes', { method: 'POST', body: JSON.stringify(data) });
  }
  updateProfessionalNote(noteId: number, data: { titre?: string; contenu?: string; type?: string; importance?: string; visibilite?: string }) {
    return this.request(`/professional/notes/${noteId}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  deleteProfessionalNote(noteId: number) {
    return this.request(`/professional/notes/${noteId}`, { method: 'DELETE' });
  }
  superviseTreatment(treatmentId: number) {
    return this.request(`/professional/treatments/${treatmentId}/supervise`, { method: 'POST' });
  }
  addTreatmentNote(treatmentId: number, note: string) {
    return this.request(`/professional/treatments/${treatmentId}/notes`, { method: 'POST', body: JSON.stringify({ note }) });
  }

  // ============================================
  // Treatments
  // ============================================
  getTreatments(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/treatments${query}`, { method: 'GET' });
  }
  createTreatment(data: {
    titre: string;
    description?: string;
    analysis_uuid?: string;
    pathologie_id?: number;
    doigt_concerne?: string;
    main_pied?: string;
    date_debut?: string;
    date_fin_prevue?: string;
    objectif?: string;
    traitement_prescrit?: string;
    frequence_suivi?: string;
    rappel_actif?: boolean;
  }) {
    return this.request('/treatments', { method: 'POST', body: JSON.stringify(data) });
  }
  getTreatment(uuid: string) {
    return this.request(`/treatments/${uuid}`, { method: 'GET' });
  }
  updateTreatment(uuid: string, data: Partial<{
    titre: string;
    description: string;
    objectif: string;
    traitement_prescrit: string;
    date_fin_prevue: string;
    frequence_suivi: string;
    rappel_actif: boolean;
  }>) {
    return this.request(`/treatments/${uuid}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  deleteTreatment(uuid: string) {
    return this.request(`/treatments/${uuid}`, { method: 'DELETE' });
  }
  updateTreatmentStatus(uuid: string, status: 'active' | 'paused' | 'completed' | 'abandoned') {
    return this.request(`/treatments/${uuid}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  }
  addTreatmentEntry(uuid: string, data: {
    type?: string;
    date_entry?: string;
    note?: string;
    symptomes_observes?: string[];
    douleur_niveau?: number;
    amelioration_percue?: string;
    medicaments_pris?: string[];
    effets_secondaires?: string;
    humeur?: string;
  }) {
    return this.request(`/treatments/${uuid}/entries`, { method: 'POST', body: JSON.stringify(data) });
  }
  uploadTreatmentPhoto(uuid: string, file: File, data?: { date_entry?: string; note?: string; amelioration_percue?: string }) {
    const formData = new FormData();
    formData.append('image', file);
    if (data?.date_entry) formData.append('date_entry', data.date_entry);
    if (data?.note) formData.append('note', data.note);
    if (data?.amelioration_percue) formData.append('amelioration_percue', data.amelioration_percue);
    return this.request(`/treatments/${uuid}/photos`, { method: 'POST', body: formData });
  }
  getTreatmentPhotoUrl(treatmentUuid: string, entryUuid: string, size: 'full' | 'thumb' = 'full') {
    return `${this.baseUrl}/treatments/${treatmentUuid}/photos/${entryUuid}?size=${size}`;
  }
  getTreatmentTimeline(uuid: string) {
    return this.request(`/treatments/${uuid}/timeline`, { method: 'GET' });
  }
  getTreatmentStats(uuid: string) {
    return this.request(`/treatments/${uuid}/stats`, { method: 'GET' });
  }
  updateTreatmentEntry(treatmentUuid: string, entryUuid: string, data: Partial<{
    note: string;
    symptomes_observes: string[];
    douleur_niveau: number;
    amelioration_percue: string;
    medicaments_pris: string[];
    effets_secondaires: string;
    humeur: string;
  }>) {
    return this.request(`/treatments/${treatmentUuid}/entries/${entryUuid}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  deleteTreatmentEntry(treatmentUuid: string, entryUuid: string) {
    return this.request(`/treatments/${treatmentUuid}/entries/${entryUuid}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_BASE_URL);
