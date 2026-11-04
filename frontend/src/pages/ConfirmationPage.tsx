import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import type { BookingResult } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';
import Brand from '../components/Brand';
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
    <div className="min-h-screen bg-ivory">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6 sm:px-8">
        <Brand />
        <LanguageSelector />
      </header>

      <main className="mx-auto max-w-lg px-5 py-8 sm:py-12">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-paper px-6 py-9 text-center shadow-lift sm:px-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-100 blur-3xl" />
          <div className="relative">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 font-serif text-2xl text-brand-700">
              ✓
            </span>
            <p className="eyebrow mt-6">{t('bookingConfirmedTitle')}</p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] text-espresso">
              {t('bookingConfirmedTitle')}
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted">
              {t('bookingConfirmedSubtitle')}
            </p>

            <div className="mt-8 rounded-2xl border border-line bg-ivory/60 p-5 text-left">
              <div className="flex items-center justify-between border-b border-line py-3 first:pt-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted/60">
                  {t('detailsDate')}
                </span>
                <span className="font-serif text-lg text-espresso">{booking.date}</span>
              </div>
              <div className="flex items-center justify-between border-b border-line py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted/60">
                  {t('detailsTime')}
                </span>
                <span className="font-serif text-lg text-espresso">{booking.time}</span>
              </div>
              <div className="flex items-center justify-between border-b border-line py-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted/60">
                  {t('tableStatus')}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">
                  {statusLabels[booking.status] || booking.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 pb-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted/60">
                  {t('detailsId')}
                </span>
                <span className="truncate font-mono text-[10px] text-muted">{booking.bookingId}</span>
              </div>
            </div>

            <a
              href={buildGoogleCalendarUrl(booking)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline mt-6 w-full"
            >
              {t('addToCalendar')}
            </a>

            <Link to="/home" className="btn-primary mt-3 w-full">
              {t('goToHomeButton')} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
