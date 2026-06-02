import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

interface AdminUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  role: 'USER' | 'ADMIN';
}

export default function AdminUsersPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.getUsers();
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-rose-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-rose-700">{t('adminPanel')}</span>
            <span className="text-sm text-gray-500">{t('navUsers')}</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/admin/bookings" className="text-gray-600 hover:text-rose-600 transition">
              {t('navBookings')}
            </Link>
            <Link to="/admin/users" className="text-rose-700 font-semibold">
              {t('navUsers')}
            </Link>
            <Link to="/home" className="text-gray-600 hover:text-rose-600 transition">
              {t('navHome')}
            </Link>
            <LanguageSelector />
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-rose-600 transition"
            >
              {t('navLogout')}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('registeredUsersTitle')}</h1>
          <button
            onClick={loadUsers}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {t('refresh')}
          </button>
        </div>

        {loading && <p className="text-gray-600">{t('loadingUsers')}</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">
            {t('noUsersFound')}
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t('tableUser')}</th>
                    <th className="px-4 py-3 font-semibold">{t('emailLabel')}</th>
                    <th className="px-4 py-3 font-semibold">{t('tablePhone')}</th>
                    <th className="px-4 py-3 font-semibold">{t('tableRole')}</th>
                    <th className="px-4 py-3 font-semibold">{t('tableCreated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.userId} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-800">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{user.email}</td>
                      <td className="px-4 py-3 text-gray-700">{user.phone}</td>
                      <td className="px-4 py-3 text-gray-700">{user.role}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(user.createdAt).toLocaleString(language === 'sr' ? 'sr-RS' : 'en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
