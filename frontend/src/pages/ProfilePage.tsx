import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

export default function ProfilePage() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getMe();
        const u = res.user;
        setForm({
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    const body: { firstName?: string; lastName?: string; phone?: string } = {};
    if (form.firstName.trim()) body.firstName = form.firstName.trim();
    if (form.lastName.trim()) body.lastName = form.lastName.trim();
    if (form.phone.trim()) body.phone = form.phone.trim();

    if (Object.keys(body).length === 0) {
      setError(t('noChangesToSave'));
      setSaving(false);
      return;
    }

    try {
      const res = await api.updateMe(body);
      login(localStorage.getItem('token')!, res.user);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-rose-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-rose-700">{t('appLogo')}</span>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/home" className="text-gray-600 hover:text-rose-600 transition">
              {t('navHome')}
            </Link>
            {user?.role !== 'ADMIN' && (
              <Link to="/my-bookings" className="text-gray-600 hover:text-rose-600 transition">
                {t('navMyBookings')}
              </Link>
            )}
            <LanguageSelector />
            <button onClick={handleLogout} className="text-gray-500 hover:text-rose-600 transition">
              {t('navLogout')}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('profileTitle')}</h1>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
            <p className="mt-3 text-sm text-gray-500">{t('loading')}</p>
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-md">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm mb-4">
                {t('successUpdate')}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('firstNamePlaceholder')}
                  </label>
                  <input
                    className="input"
                    value={form.firstName}
                    onChange={set('firstName')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('lastNamePlaceholder')}
                  </label>
                  <input
                    className="input"
                    value={form.lastName}
                    onChange={set('lastName')}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('emailLabel')}
                </label>
                <input
                  className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                  value={user?.email ?? ''}
                  disabled
                  readOnly
                />
                <p className="text-xs text-gray-400 mt-1">{t('emailImmutableTip')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('phonePlaceholder')}
                </label>
                <input
                  className="input"
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {saving ? t('savingChanges') : t('saveChangesButton')}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
