import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { AdminBooking, Slot } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WEEKDAY_LABELS: Record<string, Record<string, string>> = {
  en: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
  sr: { Mon: 'Pon', Tue: 'Uto', Wed: 'Sre', Thu: 'Čet', Fri: 'Pet', Sat: 'Sub', Sun: 'Ned' },
};

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthLabel(monthCursor: Date, language: string): string {
  return monthCursor.toLocaleString(language === 'sr' ? 'sr-RS' : 'en-US', { month: 'long', year: 'numeric' });
}

function buildCalendarCells(monthCursor: Date): Array<{ date: string | null; day: number | null }> {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekdayMondayBased = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < firstWeekdayMondayBased; i += 1) {
    cells.push({ date: null, day: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: toDateStr(year, month, day), day });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null });
  }

  return cells;
}

export default function AdminBookingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  const [date, setDate] = useState(todayStr());
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [slotCache, setSlotCache] = useState<Record<string, Slot[]>>({});
  const [bookingCache, setBookingCache] = useState<Record<string, AdminBooking[]>>({});
  const [hoverLoadingDate, setHoverLoadingDate] = useState<string | null>(null);
  const [hoverErrorDate, setHoverErrorDate] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule state
  const [reschedulingBooking, setReschedulingBooking] = useState<AdminBooking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(todayStr());
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const statusLabels: Record<string, string> = {
    CONFIRMED: t('statusConfirmed'),
    CANCELLED: t('statusCancelled'),
    COMPLETED: t('statusCompleted'),
    NO_SHOW: t('statusNoShow'),
  };

  const calendarCells = useMemo(() => buildCalendarCells(monthCursor), [monthCursor]);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.getBookingsByDate(date);
      setBookings(res.bookings);
      setBookingCache((prev) => ({ ...prev, [date]: res.bookings }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Load slots for rescheduling
  useEffect(() => {
    if (!reschedulingBooking) return;
    setLoadingSlots(true);
    setRescheduleError(null);
    setSelectedSlot(null);
    api
      .getSlots(rescheduleDate)
      .then((res) => {
        setAvailableSlots(res.slots.filter((s) => s.isAvailable));
      })
      .catch(() => setRescheduleError('Failed to load slots.'))
      .finally(() => setLoadingSlots(false));
  }, [rescheduleDate, reschedulingBooking]);

  const handleStatusChange = async (booking: AdminBooking, newStatus: string) => {
    const statusLabel = statusLabels[newStatus] || newStatus;
    if (!window.confirm(t('confirmStatusChange', { status: statusLabel }))) {
      return;
    }
    try {
      await api.adminModifyBooking(booking.bookingId, {
        userId: booking.userId,
        status: newStatus,
      });
      // Invalidate cache and reload
      setSlotCache({});
      setBookingCache({});
      load();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!reschedulingBooking || !selectedSlot) return;
    setRescheduling(true);
    setRescheduleError(null);
    try {
      await api.adminModifyBooking(reschedulingBooking.bookingId, {
        userId: reschedulingBooking.userId,
        newSlot: {
          date: selectedSlot.date,
          time: selectedSlot.time,
          slotId: selectedSlot.slotId,
        },
      });
      setReschedulingBooking(null);
      setSlotCache({});
      setBookingCache({});
      load();
    } catch (err: any) {
      setRescheduleError(err instanceof Error ? err.message : 'Reschedule failed');
    } finally {
      setRescheduling(false);
    }
  };

  const sorted = useMemo(() => {
    return [...bookings].sort((a, b) => a.time.localeCompare(b.time));
  }, [bookings]);

  const selectedDateBookingsCount = sorted.length;

  const prefetchDateDetails = async (targetDate: string) => {
    if (slotCache[targetDate] && bookingCache[targetDate]) return;

    try {
      setHoverErrorDate(null);
      setHoverLoadingDate(targetDate);

      const [slotsRes, bookingsRes] = await Promise.all([
        slotCache[targetDate]
          ? Promise.resolve({ slots: slotCache[targetDate] })
          : api.getSlots(targetDate),
        bookingCache[targetDate]
          ? Promise.resolve({ bookings: bookingCache[targetDate] })
          : api.getBookingsByDate(targetDate),
      ]);

      setSlotCache((prev) => {
        if (prev[targetDate]) return prev;
        return {
          ...prev,
          [targetDate]: [...slotsRes.slots].sort((a, b) => a.time.localeCompare(b.time)),
        };
      });

      setBookingCache((prev) => {
        if (prev[targetDate]) return prev;
        return {
          ...prev,
          [targetDate]: bookingsRes.bookings,
        };
      });
    } catch {
      setHoverErrorDate(targetDate);
    } finally {
      setHoverLoadingDate((current) => (current === targetDate ? null : current));
    }
  };

  useEffect(() => {
    void prefetchDateDetails(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const selectedDateSlots = useMemo(() => {
    return [...(slotCache[date] ?? [])].sort((a, b) => a.time.localeCompare(b.time));
  }, [date, slotCache]);

  const selectedDateBookings = bookingCache[date] ?? bookings;
  const selectedDateBookingBySlotId = useMemo(() => {
    return new Map(selectedDateBookings.map((booking) => [booking.slotId, booking]));
  }, [selectedDateBookings]);

  const selectedDateWeekday = new Date(`${date}T00:00:00`).getDay();
  const selectedDateIsClosed = selectedDateWeekday === 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-rose-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-rose-700">{t('adminPanel')}</span>
            <span className="text-sm text-gray-500">{t('navBookings')}</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/admin/users" className="text-gray-600 hover:text-rose-600 transition">
              {t('navUsers')}
            </Link>
            <Link to="/admin/bookings" className="text-rose-700 font-semibold">
              {t('navBookings')}
            </Link>
            <Link to="/admin/slots" className="text-gray-600 hover:text-rose-600 transition">
              {t('navSlots')}
            </Link>
            <Link to="/home" className="text-gray-600 hover:text-rose-600 transition">
              {t('navHome')}
            </Link>
            <LanguageSelector />
            <button onClick={handleLogout} className="text-gray-500 hover:text-rose-600 transition">
              {t('navLogout')}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('bookingsByDate')}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('bookingsHoverTip')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 bg-white"
            />
            <button
              onClick={load}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
            >
              {t('refresh')}
            </button>
          </div>
        </div>

        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('prev')}
            </button>
            <h2 className="text-lg font-semibold text-gray-800 capitalize">{monthLabel(monthCursor, language)}</h2>
            <button
              type="button"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t('next')}
            </button>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEK_DAYS.map((dayName) => (
                  <div key={dayName} className="text-xs font-semibold text-gray-500 text-center py-1">
                    {WEEKDAY_LABELS[language]?.[dayName] || WEEKDAY_LABELS.en[dayName] || dayName}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell, idx) => {
              if (!cell.date || !cell.day) {
                return <div key={`empty-${idx}`} className="h-20 rounded-lg bg-gray-50" />;
              }

              const cellDate = cell.date;
              const weekday = new Date(`${cellDate}T00:00:00`).getDay();
              const isClosedDay = weekday === 0;

              const isSelected = cellDate === date;
              const isToday = cellDate === todayStr();
              const slots = slotCache[cellDate] ?? [];
              const dayBookings = bookingCache[cellDate] ?? [];
              const bookingBySlotId = new Map(dayBookings.map((b) => [b.slotId, b]));
              const freeCount = slots.filter((s) => s.isAvailable).length;
              const usedCount = slots.filter((s) => !s.isAvailable).length;
              const showTooltip = hoveredDate === cellDate;

              return (
                <button
                  key={cellDate}
                  type="button"
                  onClick={() => setDate(cellDate)}
                  onMouseEnter={() => {
                    setHoveredDate(cellDate);
                    void prefetchDateDetails(cellDate);
                  }}
                  onMouseLeave={() => {
                    setHoveredDate((current) => (current === cellDate ? null : current));
                  }}
                  className={`relative h-20 rounded-lg border p-2 text-left transition ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 bg-white hover:border-rose-300 hover:bg-rose-50/40'
                  } ${isClosedDay ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-800">{cell.day}</span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 whitespace-nowrap">
                        {t('todayLabel')}
                      </span>
                    )}
                  </div>
                  {isClosedDay && (
                    <div className="mt-2 text-[11px] font-medium text-gray-500">{t('closedLabel')}</div>
                  )}
                  {slots.length > 0 && (
                    <div className="mt-2 text-[11px] leading-4 text-gray-600">
                      <div className="text-emerald-700">{t('slotsFree', { count: freeCount })}</div>
                      <div className="text-rose-700">{t('slotsUsed', { count: usedCount })}</div>
                    </div>
                  )}

                  {showTooltip && (
                    <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-3 hidden md:block">
                      <p className="text-xs font-semibold text-gray-800 mb-2">{cellDate}</p>

                      {hoverLoadingDate === cellDate && (
                        <p className="text-xs text-gray-500">{t('loading')}</p>
                      )}

                      {hoverErrorDate === cellDate && (
                        <p className="text-xs text-red-600">{t('failedToLoadSlots')}</p>
                      )}

                      {hoverLoadingDate !== cellDate &&
                        hoverErrorDate !== cellDate &&
                        slots.length === 0 && (
                          <p className="text-xs text-gray-500">
                            {isClosedDay ? t('closedLabel') : t('noSlotsFound')}
                          </p>
                        )}

                      {hoverLoadingDate !== cellDate &&
                        hoverErrorDate !== cellDate &&
                        slots.length > 0 && (
                          <div className="max-h-44 overflow-y-auto space-y-1.5">
                            {slots.map((slot) => (
                              (() => {
                                const booking =
                                  bookingBySlotId.get(slot.slotId) ??
                                  dayBookings.find((b) => b.time === slot.time);

                                return (
                                  <div
                                    key={slot.slotId}
                                    className="text-xs border border-gray-100 rounded px-2 py-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-700">{slot.time}</span>
                                      <span
                                        className={`font-medium ${
                                          slot.isAvailable ? 'text-emerald-700' : 'text-rose-700'
                                        }`}
                                      >
                                        {slot.isAvailable ? t('freeBadge') : t('bookedBadge')}
                                      </span>
                                    </div>

                                    {!slot.isAvailable && (
                                      <div className="mt-1 text-[11px] text-gray-600">
                                        <div>
                                          {booking?.email ? `${t('detailsUser')} ${booking.email}` : `${t('detailsUser')} unavailable`}
                                        </div>
                                        {booking?.phone && <div>{t('detailsPhone')} {booking.phone}</div>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </button>
              );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{t('selectedDayDetails')}</h2>
              <p className="text-sm text-gray-500">{t('tapToInspect')}</p>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-800">{date}</span>
            </div>
          </div>

          {hoverLoadingDate === date && selectedDateSlots.length === 0 && (
            <p className="text-sm text-gray-500">{t('loading')}</p>
          )}

          {selectedDateIsClosed && selectedDateSlots.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {t('closedDayText')}
            </div>
          )}

          {!selectedDateIsClosed && selectedDateSlots.length === 0 && hoverLoadingDate !== date && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {t('noSlotsFound')}
            </div>
          )}

          {selectedDateSlots.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {selectedDateSlots.map((slot) => {
                const booking =
                  selectedDateBookingBySlotId.get(slot.slotId) ??
                  selectedDateBookings.find((item) => item.time === slot.time);

                return (
                  <div key={slot.slotId} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-800">{slot.time}</span>
                      <span
                        className={`text-sm font-medium ${
                          slot.isAvailable ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {slot.isAvailable ? t('freeBadge') : t('bookedBadge')}
                      </span>
                    </div>

                    {!slot.isAvailable && (
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium text-gray-700">{t('detailsUser')}</span>{' '}
                          {booking?.email ?? 'unavailable'}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">{t('detailsPhone')}</span>{' '}
                          {booking?.phone || '—'}
                        </div>
                        {booking?.status && (
                          <div>
                            <span className="font-medium text-gray-700">{t('detailsStatus')}</span>{' '}
                            {statusLabels[booking.status] || booking.status}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="mb-4 text-sm text-gray-600">
          {language === 'sr' ? 'Izabrani datum:' : 'Selected date:'} <span className="font-semibold text-gray-800">{date}</span>
          <span className="mx-2">•</span>
          {language === 'sr' ? 'Rezervacije:' : 'Bookings:'} <span className="font-semibold text-gray-800">{selectedDateBookingsCount}</span>
        </div>

        {loading && <p className="text-gray-600">{t('loadingBookings')}</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">
            {t('noBookingsForDate')}
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t('tableTime')}</th>
                    <th className="px-4 py-3 font-semibold">{t('tableEmail')}</th>
                    <th className="px-4 py-3 font-semibold">{t('tablePhone')}</th>
                    <th className="px-4 py-3 font-semibold">{t('tableStatus')}</th>
                    <th className="px-4 py-3 font-semibold">{t('tableCreated')}</th>
                    <th className="px-4 py-3 font-semibold text-right">{t('tableActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => (
                    <tr key={b.bookingId} className="border-t border-gray-100 hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 text-gray-800 font-medium">{b.time}</td>
                      <td className="px-4 py-3 text-gray-700">{b.email}</td>
                      <td className="px-4 py-3 text-gray-700">{b.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                          b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          b.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {statusLabels[b.status] || b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(b.createdAt).toLocaleString(language === 'sr' ? 'sr-RS' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {b.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => {
                                setReschedulingBooking(b);
                                setRescheduleDate(b.date);
                              }}
                              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                            >
                              {t('btnReschedule')}
                            </button>
                            <button
                              onClick={() => handleStatusChange(b, 'COMPLETED')}
                              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-transparent transition"
                            >
                              {t('btnComplete')}
                            </button>
                            <button
                              onClick={() => handleStatusChange(b, 'NO_SHOW')}
                              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-transparent transition"
                            >
                              {t('btnNoShow')}
                            </button>
                            <button
                              onClick={() => handleStatusChange(b, 'CANCELLED')}
                              className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-transparent transition"
                            >
                              {t('btnCancel')}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Reschedule Modal */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-200 p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setReschedulingBooking(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{t('rescheduleTitle')}</h3>
            <p className="text-xs text-gray-500 mb-5">
              {t('clientLabel')} <span className="font-semibold text-gray-700">{reschedulingBooking.email}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  {t('selectNewDate')}
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {t('selectNewSlot')}
                </label>
                {loadingSlots && (
                  <p className="text-xs text-gray-400">{t('loadingAvailableSlots')}</p>
                )}
                {!loadingSlots && rescheduleError && (
                  <p className="text-xs text-red-600">{rescheduleError}</p>
                )}
                {!loadingSlots && !rescheduleError && availableSlots.length === 0 && (
                  <p className="text-xs text-gray-500 bg-gray-50 border rounded-lg p-3 text-center">
                    {t('noFreeSlots')}
                  </p>
                )}
                {!loadingSlots && !rescheduleError && availableSlots.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.slotId}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 rounded-xl text-xs font-medium border text-center transition ${
                          selectedSlot?.slotId === slot.slotId
                            ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-rose-300'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setReschedulingBooking(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                {t('btnCancelReschedule')}
              </button>
              <button
                type="button"
                disabled={rescheduling || !selectedSlot}
                onClick={handleRescheduleSubmit}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rescheduling ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('savingReschedule')}
                  </>
                ) : (
                  t('btnConfirmReschedule')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

