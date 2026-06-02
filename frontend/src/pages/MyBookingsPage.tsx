import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { MyBooking } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

function formatDate(dateStr: string, language: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isPastBooking(date: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return date < today;
}

export default function MyBookingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
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
            <Link to="/profile" className="text-gray-600 hover:text-rose-600 transition">
              {t('navProfile')}
            </Link>
            <LanguageSelector />
            <button onClick={handleLogout} className="text-gray-500 hover:text-rose-600 transition">
              {t('navLogout')}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('myAppointmentsTitle')}</h1>
          <button
            onClick={load}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {t('refresh')}
          </button>
        </div>

        {loading && <p className="text-gray-600">{t('loadingBookings')}</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-gray-500 mb-4">{t('noBookingsFound')}</p>
            <Link
              to="/book"
              className="inline-block bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-2 rounded-lg transition"
            >
              {t('bookAppointment')}
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('upcomingBookings')}</h2>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div
                  key={b.bookingId}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm text-gray-500">{formatDate(b.date, language)}</div>
                    <div className="text-lg font-bold text-gray-800">{b.time}</div>
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {statusLabels[b.status] || b.status}
                    </span>
                  </div>
                  <button
                    onClick={() => setConfirmId(b.bookingId)}
                    disabled={cancellingId === b.bookingId}
                    className="text-sm text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition disabled:opacity-50"
                  >
                    {cancellingId === b.bookingId ? t('cancelling') : t('cancelButton')}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{t('pastBookings')}</h2>
            <div className="space-y-3">
              {past.map((b) => (
                <div
                  key={b.bookingId}
                  className="bg-white rounded-xl border border-gray-200 p-4 opacity-70"
                >
                  <div className="text-sm text-gray-500">{formatDate(b.date, language)}</div>
                  <div className="text-lg font-bold text-gray-800">{b.time}</div>
                  <span
                    className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      b.status === 'CANCELLED'
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-emerald-100 text-emerald-700'
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t('cancelModalTitle')}</h3>
            <p className="text-sm text-gray-500 mb-6">
              {t('cancelModalBody')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                {t('btnKeep')}
              </button>
              <button
                onClick={() => handleCancel(confirmId)}
                disabled={cancellingId === confirmId}
                className="flex-1 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition disabled:opacity-50"
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
