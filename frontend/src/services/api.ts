import axios from 'axios';
import { User, Ticket, Customer, Vendor, CustomerLedgerEntry, VendorLedgerEntry, LedgerSummary, VendorLedgerSummary, PaginatedResponse, DashboardSummary, BankSummary } from '../types';

const env: any = (import.meta as any).env;
const baseURL = env.VITE_API_URL || (env.DEV ? '/api' : 'https://fazimentor.pythonanywhere.com/api');

const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username: string, password: string) =>
    api.post<{ access: string; refresh: string; user: User }>('/auth/login/', { username, password }),
  me: () => api.get<User>('/auth/me/'),
  dashboard: () => api.get<DashboardSummary>('/auth/dashboard/'),
};

export const customerAPI = {
  list: (params?: Record<string, any>) => api.get<PaginatedResponse<Customer>>('/accounts/customers/', { params }),
  get: (id: string) => api.get<Customer>(`/accounts/customers/${id}/`),
  create: (data: Partial<Customer>) => api.post<Customer>('/accounts/customers/', data),
  update: (id: string, data: Partial<Customer>) => api.patch<Customer>(`/accounts/customers/${id}/`, data),
  delete: (id: string) => api.delete(`/accounts/customers/${id}/`),
};

export const vendorAPI = {
  list: (params?: Record<string, any>) => api.get<PaginatedResponse<Vendor>>('/accounts/vendors/', { params }),
  get: (id: string) => api.get<Vendor>(`/accounts/vendors/${id}/`),
  create: (data: Partial<Vendor>) => api.post<Vendor>('/accounts/vendors/', data),
  update: (id: string, data: Partial<Vendor>) => api.patch<Vendor>(`/accounts/vendors/${id}/`, data),
  delete: (id: string) => api.delete(`/accounts/vendors/${id}/`),
};

export const ticketAPI = {
  list: (params?: Record<string, any>) => api.get<PaginatedResponse<Ticket>>('/tickets/', { params }),
  get: (id: string) => api.get<Ticket>(`/tickets/${id}/`),
  create: (data: Partial<Ticket>) => api.post<Ticket>('/tickets/', data),
  update: (id: string, data: Partial<Ticket>) => api.patch<Ticket>(`/tickets/${id}/`, data),
  delete: (id: string) => api.delete(`/tickets/${id}/`),
};

export const customerLedgerAPI = {
  list: (params?: Record<string, any>) => api.get<PaginatedResponse<CustomerLedgerEntry>>('/ledger/customer/', { params }),
  summary: (params?: Record<string, any>) => api.get<LedgerSummary>('/ledger/customer/summary/', { params }),
  addPayment: (data: { amount: number; passenger_name: string; description?: string; ticket_id?: string; customer_id?: string; payment_method?: 'bank' | 'cash' }) =>
    api.post<CustomerLedgerEntry>('/ledger/customer/add-payment/', data),
  delete: (entryId: string) => api.delete(`/ledger/customer/${entryId}/delete/`),
  export: (params?: Record<string, any>) => api.get('/ledger/customer/export/', { params, responseType: 'blob' }),
  exportPdf: (params?: Record<string, any>) => api.get('/ledger/customer/export/pdf/', { params, responseType: 'blob' }),
  slip: (entryId: string) => api.get(`/ledger/customer/${entryId}/slip/`, { responseType: 'blob' }),
};

export const vendorLedgerAPI = {
  list: (params?: Record<string, any>) => api.get<PaginatedResponse<VendorLedgerEntry>>('/ledger/vendor/', { params }),
  summary: (params?: Record<string, any>) => api.get<VendorLedgerSummary>('/ledger/vendor/summary/', { params }),
  addPayment: (data: { amount: number; passenger_name: string; description?: string; ticket_id?: string; vendor_id?: string; payment_method?: 'bank' | 'cash' }) =>
    api.post<VendorLedgerEntry>('/ledger/vendor/add-payment/', data),
  delete: (entryId: string) => api.delete(`/ledger/vendor/${entryId}/delete/`),
  export: (params?: Record<string, any>) => api.get('/ledger/vendor/export/', { params, responseType: 'blob' }),
  exportPdf: (params?: Record<string, any>) => api.get('/ledger/vendor/export/pdf/', { params, responseType: 'blob' }),
  slip: (entryId: string) => api.get(`/ledger/vendor/${entryId}/slip/`, { responseType: 'blob' }),
};

export const bankAPI = {
  summary: () => api.get<BankSummary>('/bank/'),
  transactions: (params?: Record<string, any>) => api.get('/bank/transactions/', { params }),
  export: () => api.get('/bank/export/', { responseType: 'blob' }),
};

export default api;
