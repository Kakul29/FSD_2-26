import {
  IUser,
  IUserProfile,
  IFormattedProduct,
  IAlternativesResponse,
} from '../types';

const TOKEN_KEY = 'labellens_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {}
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Health
  checkHealth: () => apiFetch<any>('/api/health'),

  // Auth
  register: (payload: { email: string; password: string; name: string; profile?: Partial<IUserProfile> }) =>
    apiFetch<{ message: string; token: string; user: IUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    apiFetch<{ message: string; token: string; user: IUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => apiFetch<{ user: IUser }>('/api/auth/me'),

  // User Profile
  updateProfile: (profile: Partial<IUserProfile>) =>
    apiFetch<{ message: string; user: IUser }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),

  getHistory: () => apiFetch<{ history: any[] }>('/api/user/history'),
  recordHistory: (product: { barcode: string; name: string; brand: string; image?: string; healthScore?: number }) =>
    apiFetch<{ message: string }>('/api/user/history', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  getFavorites: () => apiFetch<{ favorites: any[] }>('/api/user/favorites'),
  addFavorite: (favorite: { barcode: string; name: string; brand: string; image?: string; healthScore?: number; notes?: string }) =>
    apiFetch<{ message: string; user: IUser }>('/api/user/favorites', {
      method: 'POST',
      body: JSON.stringify(favorite),
    }),
  removeFavorite: (barcode: string) =>
    apiFetch<{ message: string; user: IUser }>(`/api/user/favorites/${barcode}`, {
      method: 'DELETE',
    }),

  // Products
  getProductByBarcode: (barcode: string) =>
    apiFetch<{ product: IFormattedProduct }>(`/api/products/barcode/${barcode}`),

  searchProducts: (query: string, filter: string = 'all') =>
    apiFetch<{ query: string; total: number; bestMatch: IFormattedProduct | null; results: IFormattedProduct[] }>(
      `/api/products/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`
    ),

  getAlternatives: (barcode: string) =>
    apiFetch<IAlternativesResponse>(`/api/products/${barcode}/alternatives`),

  getAiInsights: (payload: {
    productName: string;
    brand: string;
    ingredientsText: string;
    healthScore: number;
    allergens: string[];
  }) =>
    apiFetch<{ available: boolean; insights?: string; message?: string }>('/api/ai/deep-insights', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
