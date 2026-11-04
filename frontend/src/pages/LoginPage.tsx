import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import AuthShell from '../components/AuthShell';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await api.login(form);
      login(user);
      navigate(user.role === 'ADMIN' ? '/admin' : '/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-9">
        <p className="eyebrow mb-3">{t('brandEyebrow')}</p>
        <h1 className="font-serif text-4xl font-medium tracking-[-0.04em] text-espresso">
          {t('welcomeBack')}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">{t('signInSubtitle')}</p>
      </div>

      {error && (
        <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="field-label">{t('emailLabel')}</span>
          <input
            className="input"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={form.email}
            onChange={set('email')}
            required
            autoFocus
          />
        </label>
        <label className="block">
          <span className="field-label">{t('passwordLabel')}</span>
          <input
            className="input"
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={form.password}
            onChange={set('password')}
            required
          />
        </label>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('signingInButton') : t('signInButton')}
          {!loading && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        {t('dontHaveAccount')}{' '}
        <Link to="/register" className="font-bold text-brand-700 hover:text-brand-800">
          {t('signUpLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
