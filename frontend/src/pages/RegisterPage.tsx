import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import AuthShell from '../components/AuthShell';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await api.register(form);
      login(user);
      navigate('/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-8">
        <p className="eyebrow mb-3">{t('brandEyebrow')}</p>
        <h1 className="font-serif text-4xl font-medium tracking-[-0.04em] text-espresso">
          {t('signUpTitle')}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">{t('signUpSubtitle')}</p>
      </div>

      {error && (
        <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="field-label">{t('firstNamePlaceholder')}</span>
            <input
              className="input"
              placeholder={t('firstNamePlaceholder')}
              value={form.firstName}
              onChange={set('firstName')}
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="field-label">{t('lastNamePlaceholder')}</span>
            <input
              className="input"
              placeholder={t('lastNamePlaceholder')}
              value={form.lastName}
              onChange={set('lastName')}
              required
            />
          </label>
        </div>
        <label className="block">
          <span className="field-label">{t('emailLabel')}</span>
          <input
            className="input"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={form.email}
            onChange={set('email')}
            required
          />
        </label>
        <label className="block">
          <span className="field-label">{t('phonePlaceholder')}</span>
          <input
            className="input"
            type="tel"
            placeholder={t('phonePlaceholder')}
            value={form.phone}
            onChange={set('phone')}
            required
          />
        </label>
        <label className="block">
          <span className="field-label">{t('passwordLabel')}</span>
          <input
            className="input"
            type="password"
            placeholder={`${t('passwordPlaceholder')} (min. 8)`}
            value={form.password}
            onChange={set('password')}
            required
            minLength={8}
          />
        </label>
        <button type="submit" disabled={loading} className="btn-primary mt-1 w-full">
          {loading ? t('signingUpButton') : t('signUpButton')}
          {!loading && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-muted">
        {t('alreadyHaveAccount')}{' '}
        <Link to="/login" className="font-bold text-brand-700 hover:text-brand-800">
          {t('loginLink')}
        </Link>
      </p>
    </AuthShell>
  );
}
