import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'USER' | 'ADMIN';
}

function normalizeUser(user: Omit<User, 'role'> & { role?: 'USER' | 'ADMIN' }): User {
  return {
    ...user,
    role: user.role ?? 'USER',
  };
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  adminToken: string | null;
  login: (token: string, user: User) => void;
  loginAdmin: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [adminToken, setAdminToken] = useState<string | null>(() => sessionStorage.getItem('adminToken'));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? normalizeUser(JSON.parse(stored) as Omit<User, 'role'> & { role?: 'USER' | 'ADMIN' }) : null;
  });

  const login = (newToken: string, newUser: User) => {
    const normalizedUser = normalizeUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
  };

  const loginAdmin = (newAdminToken: string) => {
    sessionStorage.setItem('adminToken', newAdminToken);
    setAdminToken(newAdminToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('adminToken');
    setToken(null);
    setAdminToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, adminToken, login, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
