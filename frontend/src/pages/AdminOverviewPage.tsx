import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { Slot, AdminBooking, AdminUser } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

interface DashboardData {
  slots: Slot[];
  bookings: AdminBooking[];
  users: AdminUser[];
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const statusClass: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
  COMPLETED: 'bg-blue-50 text-blue-700',
  NO_SHOW: 'bg-purple-50 text-purple-700',
};

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const today = todayStr();
  const [data, setData] = useState<DashboardData>({ slots: [], bookings: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getSlots(today), api.getBookingsByDate(today), api.getUsers()])
      .then(([slots, bookings, users]) => {
        if (active) {
          setData({ slots: slots.slots, bookings: bookings.bookings, users: users.users });
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [today]);

  const freeSlots = useMemo(() => data.slots.filter((slot) => slot.isAvailable).length, [data.slots]);
  const bookedSlots = data.slots.length - freeSlots;
  const occupancy = data.slots.length > 0 ? Math.round((bookedSlots / data.slots.length) * 100) : 0;
  const upcoming = useMemo(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return [...data.bookings]
      .filter((booking) => booking.time >= currentTime)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [data.bookings]);
  const nextBooking = upcoming[0] ?? null;
  const formattedDate = new Date(`${today}T00:00:00`).toLocaleDateString(
    language === 'sr' ? 'sr-Latn-RS' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' },
  );

  const statusLabels: Record<string, string> = {
    CONFIRMED: t('statusConfirmed'),
    CANCELLED: t('statusCancelled'),
    COMPLETED: t('statusCompleted'),
    NO_SHOW: t('statusNoShow'),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
            {t('adminOverview')}
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-[-0.045em] text-studio-ink sm:text-3xl">
            {t('welcomeTitle')} {user?.firstName}
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500">{formattedDate}</p>
        </div>
        <Link
          to="/admin/bookings"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-coral px-4 py-2.5 text-[10px] font-extrabold text-white shadow-[0_8px_18px_rgba(225,29,72,.2)] transition hover:bg-red-700"
        >
          {t('viewAllBookings')} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="admin-card h-28 animate-pulse bg-zinc-50" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: t('todayBookings'), value: data.bookings.length, note: t('todayLabel') },
              { label: t('slotsAvailable'), value: freeSlots, note: t('freeBadge') },
              { label: t('occupancy'), value: `${occupancy}%`, note: `${bookedSlots} / ${data.slots.length}` },
              { label: t('registeredUsers'), value: data.users.length, note: t('navUsers') },
            ].map((stat) => (
              <div key={stat.label} className="admin-card p-5">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-zinc-400">
                  {stat.label}
                </p>
                <p className="mt-4 text-3xl font-extrabold tracking-[-0.05em] text-studio-ink">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[9px] font-semibold text-zinc-400">{stat.note}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
            <section className="admin-card p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold tracking-[-0.02em] text-studio-ink">
                    {t('todaySchedule')}
                  </h2>
                  <p className="mt-1 text-[10px] text-zinc-400">{formattedDate}</p>
                </div>
                <Link to="/admin/bookings" className="text-[9px] font-extrabold text-coral">
                  {t('viewAllBookings')} →
                </Link>
              </div>

              {data.bookings.length === 0 ? (
                <div className="rounded-xl bg-zinc-50 px-4 py-10 text-center text-xs text-zinc-400">
                  {t('noBookingsToday')}
                </div>
              ) : (
                <div>
                  {[...data.bookings]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((booking) => (
                      <div
                        key={booking.bookingId}
                        className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-t border-studio-line/80 py-3 first:border-t-0"
                      >
                        <span className="text-[10px] font-extrabold text-zinc-700">{booking.time}</span>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-zinc-800">{booking.email}</p>
                          {booking.phone && <p className="mt-0.5 text-[9px] text-zinc-400">{booking.phone}</p>}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.06em] ${
                            statusClass[booking.status] || 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {statusLabels[booking.status] || booking.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl bg-espresso p-5 text-ivory shadow-soft">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-ivory/40">
                  {t('nextAppointment')}
                </p>
                {nextBooking ? (
                  <>
                    <p className="mt-3 font-serif text-3xl font-medium tracking-[-0.03em]">
                      {nextBooking.time}
                    </p>
                    <p className="mt-1 truncate text-xs text-ivory/60">{nextBooking.email}</p>
                    <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.1em] text-brand-200">
                      {t('todayLabel')}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-ivory/55">{t('noBookingsToday')}</p>
                )}
              </div>

              <div className="admin-card p-5">
                <div className="mb-3 flex items-center justify-between text-[10px] font-bold text-zinc-500">
                  <span>{t('slotUsage')}</span>
                  <span>{occupancy}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-coral transition-all duration-500"
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
                <p className="mt-3 text-[10px] text-zinc-400">
                  {t('bookedCount', { booked: bookedSlots, total: data.slots.length })}
                </p>
              </div>

              <Link
                to="/admin/users"
                className="flex items-center justify-between rounded-2xl border border-studio-line bg-white px-5 py-4 text-xs font-bold text-zinc-700 shadow-[0_2px_3px_rgba(0,0,0,0.018)] transition hover:border-rose-200 hover:text-coral"
              >
                {t('manageUsers')} <span aria-hidden="true">→</span>
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
