import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/apiClient';

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
  authenticated: boolean;
  adminVerified: boolean;
  loading: boolean;
  login: (user: User) => void;
  loginAdmin: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminVerified, setAdminVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .getMe()
      .then((res) => {
        if (mounted) setUser(normalizeUser(res.user));
      })
      .catch(() =>
        api
          .refresh()
          .then((res) => {
            if (mounted) setUser(normalizeUser(res.user));
          })
          .catch(() => undefined),
      )
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const login = (newUser: User) => {
    const normalizedUser = normalizeUser(newUser);
    setUser(normalizedUser);
    setAdminVerified(false);
  };

  const loginAdmin = (newUser: User) => {
    setUser(normalizeUser(newUser));
    setAdminVerified(true);
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    setAdminVerified(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: Boolean(user),
        adminVerified,
        loading,
        login,
        loginAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
