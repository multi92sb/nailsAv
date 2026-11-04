import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { MyBooking } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';
import SiteHeader from '../components/SiteHeader';

function formatDate(dateStr: string, language: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function isPastBooking(date: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return date < today;
}

export default function MyBookingsPage() {
  const { t, language } = useTranslation();

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const statusLabels: Record<string, string> = {
    CONFIRMED: t('statusConfirmed'),
    CANCELLED: t('statusCancelled'),
    COMPLETED: t('statusCompleted'),
    NO_SHOW: t('statusNoShow'),
  };

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.getMyBookings();
      setBookings(res.bookings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await api.cancelBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.bookingId === bookingId ? { ...b, status: 'CANCELLED' } : b)),
      );
      setConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const upcoming = bookings.filter((b) => !isPastBooking(b.date) && b.status !== 'CANCELLED');
  const past = bookings.filter((b) => isPastBooking(b.date) || b.status === 'CANCELLED');

  return (
    <div className="min-h-screen bg-ivory">
      <SiteHeader current="bookings" />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{t('navMyBookings')}</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] text-espresso sm:text-5xl">
              {t('myAppointmentsTitle')}
            </h1>
          </div>
          <button type="button" onClick={load} className="btn-outline self-start px-5 py-2.5 text-xs">
            {t('refresh')}
          </button>
        </div>

        {loading && (
          <div className="mt-8 flex items-center gap-3 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-400" />
            {t('loadingBookings')}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <div className="card mt-8 px-6 py-14 text-center">
            <span className="font-serif text-4xl text-brand-300">01</span>
            <p className="mt-4 text-sm text-muted">{t('noBookingsFound')}</p>
            <Link to="/book" className="btn-primary mt-6">
              {t('bookAppointment')} <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="mt-9">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl font-medium tracking-[-0.025em]">
                {t('upcomingBookings')}
              </h2>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted/50">
                {upcoming.length.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div
                  key={b.bookingId}
                  className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="flex items-center gap-5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-center">
                      <span className="font-serif text-lg font-medium text-brand-700">
                        {new Date(`${b.date}T00:00:00`).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted/60">
                        {formatDate(b.date, language)}
                      </p>
                      <p className="mt-1 font-serif text-2xl font-medium text-espresso">{b.time}</p>
                      <span className="mt-1.5 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">
                        {statusLabels[b.status] || b.status}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmId(b.bookingId)}
                    disabled={cancellingId === b.bookingId}
                    className="self-start rounded-full border border-brand-200 px-4 py-2 text-[11px] font-bold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50 sm:self-auto"
                  >
                    {cancellingId === b.bookingId ? t('cancelling') : t('cancelButton')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-[-0.025em]">
              {t('pastBookings')}
            </h2>
            <div className="space-y-2">
              {past.map((b) => (
                <div
                  key={b.bookingId}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-line/70 bg-paper/60 px-4 py-3.5 opacity-75"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted/60">
                      {formatDate(b.date, language)}
                    </span>
                    <span className="text-sm font-bold text-espresso">{b.time}</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] ${
                      b.status === 'CANCELLED'
                        ? 'bg-zinc-100 text-zinc-500'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {statusLabels[b.status] || b.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] bg-paper p-7 shadow-lift">
            <p className="eyebrow">{t('cancelModalTitle')}</p>
            <h3 className="mt-3 font-serif text-2xl font-medium text-espresso">{t('cancelModalTitle')}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{t('cancelModalBody')}</p>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="btn-outline flex-1 px-4 py-2.5 text-xs"
              >
                {t('btnKeep')}
              </button>
              <button
                type="button"
                onClick={() => handleCancel(confirmId)}
                disabled={cancellingId === confirmId}
                className="flex-1 rounded-full bg-brand-400 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
              >
                {cancellingId === confirmId ? t('cancelling') : t('cancelButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
