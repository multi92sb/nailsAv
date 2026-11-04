import { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';
import type { MyBooking, GalleryItem } from '../api/apiClient';
import { useTranslation } from '../context/LanguageContext';
import SiteHeader from '../components/SiteHeader';

function formatBookingDate(dateStr: string, language: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(language === 'sr' ? 'sr-Latn-RS' : 'en-US', {
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
    return <Navigate to="/admin" replace />;
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
