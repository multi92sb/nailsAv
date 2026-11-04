import { useEffect, useState } from 'react';
import { api, type LoyaltyStatus } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import SiteHeader from '../components/SiteHeader';
import LoyaltyProgress from '../components/LoyaltyProgress';

export default function ProfilePage() {
  const { user, login } = useAuth();
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
  const [loyalty, setLoyalty] = useState<LoyaltyStatus | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [res, loyaltyRes] = await Promise.all([api.getMe(), api.getLoyalty()]);
        const u = res.user;
        setForm({
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
        });
        setLoyalty(loyaltyRes.loyalty);
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
      login(res.user);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory">
      <SiteHeader current="profile" />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 lg:py-14">
        <div>
          <p className="eyebrow">{t('navProfile')}</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] text-espresso sm:text-5xl">
            {t('profileTitle')}
          </h1>
          <p className="mt-3 text-sm text-muted">{t('profileSubtitle')}</p>
        </div>

        {loading && (
          <div className="mt-8 flex items-center gap-3 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-400" />
            {t('loading')}
          </div>
        )}

        {!loading && (
          <div className="mt-8 grid gap-5 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
            <aside className="rounded-[2rem] bg-espresso p-7 text-ivory shadow-lift">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-ivory/10 font-serif text-2xl text-brand-200">
                {form.firstName?.[0]?.toUpperCase()}
                {form.lastName?.[0]?.toUpperCase()}
              </span>
              <h2 className="mt-6 font-serif text-2xl font-medium">
                {form.firstName} {form.lastName}
              </h2>
              <p className="mt-2 break-all text-xs text-ivory/50">{user?.email}</p>
              <div className="mt-7 border-t border-ivory/15 pt-5">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-ivory/40">
                  {t('phonePlaceholder')}
                </p>
                <p className="mt-2 text-sm text-ivory/80">{form.phone || '—'}</p>
              </div>
            </aside>

            <div className="card p-6 sm:p-8">
              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {t('successUpdate')}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="field-label">{t('firstNamePlaceholder')}</span>
                    <input className="input" value={form.firstName} onChange={set('firstName')} required />
                  </label>
                  <label className="block">
                    <span className="field-label">{t('lastNamePlaceholder')}</span>
                    <input className="input" value={form.lastName} onChange={set('lastName')} required />
                  </label>
                </div>

                <label className="block">
                  <span className="field-label">{t('emailLabel')}</span>
                  <input
                    className="input cursor-not-allowed bg-cream/40 text-muted"
                    value={user?.email ?? ''}
                    disabled
                    readOnly
                  />
                  <span className="mt-1.5 block text-[10px] text-muted/60">{t('emailImmutableTip')}</span>
                </label>

                <label className="block">
                  <span className="field-label">{t('phonePlaceholder')}</span>
                  <input className="input" type="tel" value={form.phone} onChange={set('phone')} required />
                </label>

                <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
                  {saving ? t('savingChanges') : t('saveChangesButton')}
                </button>
              </form>
            </div>
          </div>
        )}

        {!loading && loyalty && (
          <div className="mt-5">
            <LoyaltyProgress loyalty={loyalty} compact />
          </div>
        )}
      </main>
    </div>
  );
}
