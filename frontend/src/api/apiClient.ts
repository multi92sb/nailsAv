const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  tokenOverride?: string | null;
}

async function request<T>(
  path: string,
  { method = 'GET', body, auth = false, tokenOverride = null }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = tokenOverride ?? localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) ?? 'Request failed');
  return data as T;
}

export interface Slot {
  slotId: string;
  date: string;
  time: string;
  isAvailable: boolean;
}

export interface BookingResult {
  bookingId: string;
  date: string;
  time: string;
  status: string;
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'USER' | 'ADMIN';
}

export interface AdminUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  role: 'USER' | 'ADMIN';
}

export interface AdminBooking {
  bookingId: string;
  userId: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  slotId: string;
  status: string;
  createdAt: string;
}

export const api = {
  register: (body: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => request<{ token: string; user: User }>('/users', { method: 'POST', body }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/login', { method: 'POST', body }),

  getSlots: (date: string) =>
    request<{ slots: Slot[] }>(`/available-slots?date=${date}`, { auth: true }),

  createBooking: (body: { date: string; time: string; slotId: string }) =>
    request<BookingResult>('/booking', { method: 'POST', body, auth: true }),

  getUsers: () => request<{ users: AdminUser[] }>('/users', { auth: true }),

  setUserRole: (userId: string, role: 'USER' | 'ADMIN') =>
    request<{ userId: string; role: 'USER' | 'ADMIN' }>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: { role },
      auth: true,
    }),

  adminLogin: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/admin/login', { method: 'POST', body }),

  getBookingsByDate: (date: string, adminToken?: string | null) =>
    request<{ bookings: AdminBooking[] }>(`/admin/bookings?date=${date}`, {
      auth: true,
      tokenOverride: adminToken ?? null,
    }),

  getMedia: () => request<{ media: { key: string; url: string }[] }>('/media'),
};
