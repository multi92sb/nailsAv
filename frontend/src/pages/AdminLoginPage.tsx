import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import Brand from '../components/Brand';
import LanguageSelector from '../components/LanguageSelector';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loginAdmin, logout } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.adminLogin({ email, password });
      loginAdmin(res.user);
      navigate('/admin/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-studio">
      <header className="flex items-center justify-between border-b border-studio-line bg-white px-5 py-4 sm:px-8">
        <Brand to="/home" compact />
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link to="/home" className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900">
            {t('navHome')}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#FFF1F3] text-lg text-coral">
              ◇
            </span>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
              {t('adminPanel')}
            </p>
            <h1 className="mt-2 font-sans text-3xl font-extrabold tracking-[-0.045em] text-studio-ink">
              {t('adminVerificationTitle')}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{t('adminVerificationSubtitle')}</p>
          </div>

          <div className="admin-card p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="field-label">{t('emailLabel')}</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="input border-studio-line focus:border-rose-200 focus:ring-rose-50"
                />
              </label>

              <label className="block">
                <span className="field-label">{t('passwordLabel')}</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  className="input border-studio-line focus:border-rose-200 focus:ring-rose-50"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-coral py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(225,29,72,.2)] transition hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? t('verifying') : t('continueToAdmin')}
              </button>
            </form>
          </div>

          <div className="mt-5 flex items-center justify-between text-[11px]">
            <Link to="/home" className="font-semibold text-zinc-500 hover:text-zinc-900">
              ← {t('navHome')}
            </Link>
            <button type="button" onClick={handleLogout} className="font-semibold text-zinc-400 hover:text-coral">
              {t('navLogout')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
