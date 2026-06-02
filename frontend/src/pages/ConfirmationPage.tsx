import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import type { BookingResult } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

function buildGoogleCalendarUrl(booking: BookingResult): string {
  const [h, m] = booking.time.split(':').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = booking.date.replace(/-/g, '');
  const start = `${dateStr}T${pad(h)}${pad(m)}00`;
  const end = `${dateStr}T${pad(h + 1)}${pad(m)}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Nail Appointment – NailsAv',
    dates: `${start}/${end}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function ConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state as BookingResult | null;
  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    CONFIRMED: t('statusConfirmed'),
    CANCELLED: t('statusCancelled'),
    COMPLETED: t('statusCompleted'),
    NO_SHOW: t('statusNoShow'),
  };

  useEffect(() => {
    if (!booking) navigate('/home', { replace: true });
  }, [booking, navigate]);

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
      <LanguageSelector floating />
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('bookingConfirmedTitle')}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('bookingConfirmedSubtitle')}</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
          <Row label={t('detailsDate')} value={booking.date} />
          <Row label={t('detailsTime')} value={booking.time} />
          <Row label={t('tableStatus')} value={statusLabels[booking.status] || booking.status} valueClass="text-green-600 font-semibold" />
          <Row label={t('detailsId')} value={booking.bookingId} valueClass="font-mono text-xs text-gray-500" />
        </div>

        <a
          href={buildGoogleCalendarUrl(booking)}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full border border-rose-300 text-rose-600 font-medium py-2.5 rounded-lg hover:bg-rose-50 transition mb-3"
        >
          {t('addToCalendar')}
        </a>

        <Link
          to="/home"
          className="block w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-lg transition"
        >
          {t('goToHomeButton')}
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = 'font-medium text-gray-800',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
