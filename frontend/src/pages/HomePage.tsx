import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';
import type { Slot, AdminBooking, AdminUser, MyBooking, GalleryItem } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';
import SiteHeader from '../components/SiteHeader';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string, language: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

interface DashboardData {
  slots: Slot[];
  bookings: AdminBooking[];
  users: AdminUser[];
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { adminVerified } = useAuth();
  const today = todayStr();
  const { t, language } = useTranslation();

  const [data, setData] = useState<DashboardData>({ slots: [], bookings: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // /admin/* routes require the step-up adminAccessToken from /admin/login.
      if (!adminVerified) {
        setLoading(false);
        return;
      }

      try {
        const [slotsRes, bookingsRes, usersRes] = await Promise.all([
          api.getSlots(today),
          api.getBookingsByDate(today),
          api.getUsers(),
        ]);
        setData({
          slots: slotsRes.slots,
          bookings: bookingsRes.bookings,
          users: usersRes.users,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [today, adminVerified]);

  const freeSlots = useMemo(() => data.slots.filter((s) => s.isAvailable).length, [data.slots]);
  const bookedSlots = useMemo(() => data.slots.filter((s) => !s.isAvailable).length, [data.slots]);
  const totalSlots = data.slots.length;
  const occupancyPct = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return [...data.bookings]
      .filter((b) => b.time >= currentTime)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [data.bookings]);

  const nextBooking = upcomingBookings[0] ?? null;

  if (!adminVerified) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600 mb-6">
          Confirm your admin session to load bookings and manage the salon.
        </p>
        <button
          onClick={() => navigate('/admin/login')}
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-3 rounded-xl transition shadow-sm"
        >
          Continue to admin login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
        <p className="mt-3 text-sm text-gray-500">{t('loadingDashboard')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    NO_SHOW: 'bg-purple-100 text-purple-700',
  };

  const statusLabels: Record<string, string> = {
    CONFIRMED: t('statusConfirmed'),
    CANCELLED: t('statusCancelled'),
    COMPLETED: t('statusCompleted'),
    NO_SHOW: t('statusNoShow'),
  };

  return (
    <div className="space-y-6">
      {/* Date heading */}
      <div className="text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">{t('todayLabel')}</p>
        <p className="text-lg font-semibold text-gray-800">{formatDate(today, language)}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('todayBookings')}
          value={data.bookings.length}
          accent="text-rose-700"
          bg="bg-rose-100"
          icon="📋"
        />
        <StatCard
          label={t('slotsAvailable')}
          value={freeSlots}
          accent="text-emerald-700"
          bg="bg-emerald-100"
          icon="✅"
        />
        <StatCard
          label={t('occupancy')}
          value={`${occupancyPct}%`}
          accent="text-amber-700"
          bg="bg-amber-100"
          icon="📊"
        />
        <StatCard
          label={t('registeredUsers')}
          value={data.users.length}
          accent="text-blue-700"
          bg="bg-blue-100"
          icon="👥"
        />
      </div>

      {/* Slot usage bar */}
      {totalSlots > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t('slotUsage')}</span>
            <span className="text-sm text-gray-500">
              {t('bookedCount', { booked: bookedSlots, total: totalSlots })}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${occupancyPct}%`,
                backgroundColor: occupancyPct > 80 ? '#e11d48' : occupancyPct > 50 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
        </div>
      )}

      {/* Next appointment highlight */}
      {nextBooking && (
        <div className="bg-white rounded-xl border border-rose-200 p-4">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-2">
            {t('nextAppointment')}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-800">{nextBooking.time}</p>
              <p className="text-sm text-gray-600">{nextBooking.email}</p>
              {nextBooking.phone && (
                <p className="text-sm text-gray-500">{nextBooking.phone}</p>
              )}
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[nextBooking.status] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[nextBooking.status] || nextBooking.status}
            </span>
          </div>
        </div>
      )}

      {/* Today's schedule */}
      {data.bookings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">{t('todaySchedule')}</p>
            <span className="text-xs text-gray-500">{data.bookings.length}</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...data.bookings].sort((a, b) => a.time.localeCompare(b.time)).map((b) => (
              <div
                key={b.bookingId}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-800 w-12">{b.time}</span>
                  <div>
                    <p className="text-sm text-gray-700">{b.email}</p>
                    {b.phone && <p className="text-xs text-gray-500">{b.phone}</p>}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[b.status] || 'bg-gray-200 text-gray-600'}`}>
                  {statusLabels[b.status] || b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.bookings.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-500 text-sm">{t('noBookingsToday')}</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/admin/bookings')}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition shadow-sm"
        >
          {t('viewAllBookings')}
        </button>
        <button
          onClick={() => navigate('/admin/users')}
          className="flex-1 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 rounded-xl border border-gray-200 transition"
        >
          {t('manageUsers')}
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  bg,
  icon,
}: {
  label: string;
  value: string | number;
  accent: string;
  bg: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${bg}`}>
          {icon}
        </span>
        <span className="text-xs font-medium text-gray-500 leading-tight">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function formatBookingDate(dateStr: string, language: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(language === 'sr' ? 'sr-RS' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [nextBooking, setNextBooking] = useState<MyBooking | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    let active = true;
    const today = new Date().toISOString().slice(0, 10);

    Promise.allSettled([api.getMyBookings(), api.getMedia()]).then(([bookings, media]) => {
      if (!active) return;
      if (bookings.status === 'fulfilled') {
        const upcoming = bookings.value.bookings
          .filter((booking) => booking.date >= today && booking.status !== 'CANCELLED')
          .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
        setNextBooking(upcoming[0] ?? null);
      }
      if (media.status === 'fulfilled') {
        setGallery(media.value.media.slice(0, 3));
      }
    });

    return () => {
      active = false;
    };
  }, [user]);

  if (user?.role === 'ADMIN') {
    return (
      <div className="min-h-screen bg-ivory">
        <SiteHeader current="home" />
        <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
          <div className="mb-7">
            <p className="eyebrow">{t('adminPanel')}</p>
            <h1 className="mt-2 font-serif text-4xl font-medium tracking-[-0.04em] text-espresso">
              {t('welcomeTitle')} {user.firstName}
            </h1>
          </div>
          <AdminDashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <SiteHeader current="home" />

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_.92fr] lg:gap-8">
          <div className="card flex flex-col justify-between p-7 sm:p-10 lg:p-12">
            <div>
              <p className="eyebrow flex items-center gap-3">
                <span className="h-px w-7 bg-gold" />
                {t('brandEyebrow')}
              </p>
              <h1 className="mt-6 font-serif text-[2.75rem] font-medium leading-[.98] tracking-[-0.045em] text-espresso sm:text-6xl">
                {t('brandTitle')}
                <br />
                <em className="font-normal text-brand-600">{t('brandTitleAccent')}</em>
              </h1>
              <p className="mt-6 max-w-md text-sm leading-7 text-muted">{t('readyToBook')}</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => navigate('/book')} className="btn-primary">
                  {t('bookAppointment')}
                  <span aria-hidden="true">→</span>
                </button>
                <Link
                  to="/gallery"
                  className="border-b border-line pb-1 text-xs font-bold text-espresso transition hover:border-brand-300"
                >
                  {t('navGallery')}
                </Link>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-start gap-2 border-t border-line pt-5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted/70 sm:flex-row sm:items-center sm:gap-x-5">
              <span>
                {t('welcomeTitle')} {user?.firstName}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-brand-300 sm:block" />
              <span>By appointment only</span>
            </div>
          </div>

          <div className="relative min-h-[380px] overflow-hidden rounded-[2rem] bg-espresso p-7 text-ivory shadow-lift sm:p-9">
            {gallery[0]?.url ? (
              <img
                src={gallery[0].url}
                alt={gallery[0].caption || 'NailsAv'}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
            ) : (
              <>
                <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-brand-400/35 blur-3xl" />
                <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
                <span className="absolute right-9 top-8 font-serif text-[9rem] leading-none text-ivory/[0.06]">
                  Av
                </span>
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/20 to-transparent" />

            <div className="relative z-10 flex h-full min-h-[326px] flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ivory/65">
                  {t('myUpcomingBookings')}
                </span>
                <span className="h-px w-12 bg-ivory/30" />
              </div>

              {nextBooking ? (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-300">
                    {t('nextAppointment')}
                  </p>
                  <p className="mt-3 font-serif text-4xl font-medium leading-none tracking-[-0.03em] sm:text-5xl">
                    {formatBookingDate(nextBooking.date, language)}
                  </p>
                  <div className="mt-5 flex items-center gap-3 text-sm text-ivory/75">
                    <span className="rounded-full bg-ivory/10 px-3 py-1.5 text-xs font-bold text-ivory">
                      {nextBooking.time}
                    </span>
                    <span>{t('statusConfirmed')}</span>
                  </div>
                  <Link
                    to="/my-bookings"
                    className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-ivory/80 transition hover:text-white"
                  >
                    {t('navMyBookings')} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="max-w-xs text-sm leading-6 text-ivory/70">{t('noUpcomingBookings')}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/book')}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-xs font-bold text-espresso transition hover:bg-white"
                  >
                    {t('bookAppointment')} <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-ivory/15 pt-4 text-[9px] font-bold uppercase tracking-[0.15em] text-ivory/45">
                <span>NailsAv</span>
                <span>{t('brandEyebrow')}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { to: '/book', number: '01', title: t('bookAppointment') },
            { to: '/my-bookings', number: '02', title: t('navMyBookings') },
            { to: '/gallery', number: '03', title: t('navGallery') },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center justify-between rounded-3xl border border-line bg-paper px-6 py-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
            >
              <div className="flex items-center gap-4">
                <span className="font-serif text-sm text-brand-400">{item.number}</span>
                <span className="text-sm font-bold text-espresso">{item.title}</span>
              </div>
              <span className="text-brand-500 transition group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </section>

        {gallery.length > 1 && (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="eyebrow">{t('navGallery')}</p>
                <h2 className="mt-2 font-serif text-3xl font-medium tracking-[-0.03em]">
                  {t('ourWorkTitle')}
                </h2>
              </div>
              <Link to="/gallery" className="text-xs font-bold text-brand-700">
                {t('navGallery')} →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.slice(1, 4).map((item, index) => (
                <Link
                  key={item.id}
                  to="/gallery"
                  className={`overflow-hidden rounded-3xl bg-cream ${
                    index === 0 ? 'col-span-2 sm:col-span-1' : ''
                  }`}
                >
                  <img
                    src={item.url}
                    alt={item.caption || 'NailsAv'}
                    className="h-48 w-full object-cover transition duration-500 hover:scale-105 sm:h-56"
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
