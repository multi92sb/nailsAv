import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { Slot } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';
import Brand from '../components/Brand';
import LanguageSelector from '../components/LanguageSelector';

const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAYS_SR = ['Ne', 'Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su'];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SR = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isPastOrToday(year: number, month: number, day: number): boolean {
  const d = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d <= today;
}

export default function BookingPage() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const today = new Date();

  const DAYS = language === 'sr' ? DAYS_SR : DAYS_EN;
  const MONTHS = language === 'sr' ? MONTHS_SR : MONTHS_EN;

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    setError('');
    api
      .getSlots(selectedDate)
      .then((data) => setSlots(data.slots))
      .catch(() => setError(t('failedToLoadSlots')))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, t]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    setError('');
    try {
      const result = await api.createBooking({
        date: selectedSlot.date,
        time: selectedSlot.time,
        slotId: selectedSlot.slotId,
      });
      navigate('/confirmation', { state: result });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const availableSlots = slots.filter((s) => s.isAvailable);
  const activeStep = selectedSlot ? 3 : selectedDate ? 2 : 1;
  const dateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
        language === 'sr' ? 'sr-RS' : 'en-US',
        { weekday: 'long', month: 'long', day: 'numeric' },
      )
    : null;

  return (
    <div className={`min-h-screen bg-ivory ${selectedSlot ? 'pb-28 lg:pb-0' : ''}`}>
      <header className="border-b border-line/80 bg-ivory/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-5 sm:gap-8">
            <Link to="/home" className="text-lg text-muted transition hover:text-espresso" aria-label={t('navHome')}>
              ←
            </Link>
            <Brand />
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:py-14">
        <div className="max-w-2xl">
          <p className="eyebrow">{t('bookAppointmentTitle')}</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.04em] text-espresso sm:text-5xl">
            {t('bookingHeroTitle')}
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">{t('bookingHeroSubtitle')}</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted/60">
          {[t('stepDate'), t('stepTime'), t('stepConfirm')].map((step, index) => {
            const number = index + 1;
            return (
              <div key={step} className="flex items-center gap-3">
                <span className={number === activeStep ? 'text-brand-700' : ''}>
                  0{number} {step}
                </span>
                {index < 2 && <span className="h-px w-7 bg-line" />}
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_.8fr] lg:items-start">
          <div className="space-y-5">
            <div className="card p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-brand-300 hover:text-espresso"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <h2 className="text-center font-serif text-xl font-medium tracking-[-0.02em] text-espresso sm:text-2xl">
                  {MONTHS[viewMonth]} {viewYear}
                </h2>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-brand-300 hover:text-espresso"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="mt-6 grid grid-cols-7">
                {DAYS.map((day) => (
                  <div key={day} className="py-1 text-center text-[9px] font-extrabold uppercase tracking-[0.08em] text-muted/55">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = toDateStr(new Date(viewYear, viewMonth, day));
                  const past = isPastOrToday(viewYear, viewMonth, day);
                  const selected = selectedDate === dateStr;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => !past && setSelectedDate(dateStr)}
                      disabled={past}
                      className={[
                        'relative aspect-square rounded-xl text-xs font-semibold transition sm:rounded-2xl sm:text-sm',
                        past
                          ? 'cursor-not-allowed text-muted/25'
                          : 'text-espresso hover:bg-brand-50',
                        selected
                          ? 'bg-brand-400 text-white shadow-[0_10px_20px_rgba(201,142,134,.22)] hover:bg-brand-400'
                          : '',
                      ].join(' ')}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="card p-5 sm:p-7">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h2 className="font-serif text-xl font-medium text-espresso">
                    {t('availableTimesFor').replace('{date}', dateLabel ?? selectedDate)}
                  </h2>
                </div>

                {slotsLoading && (
                  <div className="flex items-center gap-3 py-5 text-sm text-muted">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-400" />
                    {t('loading')}
                  </div>
                )}

                {!slotsLoading && availableSlots.length === 0 && (
                  <p className="rounded-2xl border border-line bg-brand-50/60 px-4 py-5 text-sm text-muted">
                    {t('noAvailableSlots')}
                  </p>
                )}

                {!slotsLoading && availableSlots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.slotId}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-full border py-2.5 text-xs font-bold transition ${
                          selectedSlot?.slotId === slot.slotId
                            ? 'border-brand-400 bg-brand-100 text-brand-700'
                            : 'border-line bg-paper text-espresso hover:border-brand-300'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="sticky top-24 hidden rounded-[2rem] bg-espresso p-7 text-ivory shadow-lift lg:block">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-ivory/45">
              {t('appointmentSummary')}
            </p>
            <h2 className="mt-4 font-serif text-3xl font-medium leading-tight tracking-[-0.025em]">
              {dateLabel ?? t('appointmentSummary')}
            </h2>

            <div className="mt-7 space-y-0 border-t border-ivory/15">
              <div className="flex items-center justify-between border-b border-ivory/15 py-4 text-xs">
                <span className="text-ivory/45">{t('detailsDate')}</span>
                <span className="font-semibold">{selectedDate ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ivory/15 py-4 text-xs">
                <span className="text-ivory/45">{t('detailsTime')}</span>
                <span className="font-semibold">{selectedSlot?.time ?? '—'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBook}
              disabled={!selectedSlot || booking}
              className="mt-7 flex w-full items-center justify-between rounded-full bg-brand-400 px-5 py-3.5 text-xs font-bold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>{booking ? t('confirming') : t('confirmBooking').replace('{date}', selectedDate ?? '').replace('{time}', selectedSlot?.time ?? '')}</span>
              {!booking && <span aria-hidden="true">→</span>}
            </button>
            <p className="mt-4 text-center text-[9px] leading-5 text-ivory/40">{t('selectTimePrompt')}</p>
          </aside>
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </main>

      {selectedSlot && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 p-4 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted/60">
                {t('appointmentSummary')}
              </p>
              <p className="truncate text-xs font-bold text-espresso">
                {dateLabel} · {selectedSlot.time}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBook}
              disabled={booking}
              className="btn-primary shrink-0 px-5 py-2.5 text-xs"
            >
              {booking ? t('confirming') : t('stepConfirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
