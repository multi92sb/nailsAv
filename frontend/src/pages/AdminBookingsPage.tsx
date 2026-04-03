import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { AdminBooking, Slot } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

function monthLabel(monthCursor: Date): string {
  return monthCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
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
            <span className="text-xl font-bold text-rose-700">Admin Panel</span>
            <span className="text-sm text-gray-500">Bookings</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/admin/users" className="text-gray-600 hover:text-rose-600 transition">
              Users
            </Link>
            <Link to="/admin/bookings" className="text-rose-700 font-semibold">
              Bookings
            </Link>
            <Link to="/home" className="text-gray-600 hover:text-rose-600 transition">
              Home
            </Link>
            <button onClick={handleLogout} className="text-gray-500 hover:text-rose-600 transition">
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Bookings by date</h1>
            <p className="text-sm text-gray-500 mt-1">
              On desktop, hover a day to preview slots. On mobile, tap a day to see full slot details below.
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
              Refresh
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
              Prev
            </button>
            <h2 className="text-lg font-semibold text-gray-800 capitalize">{monthLabel(monthCursor)}</h2>
            <button
              type="button"
              onClick={() =>
                setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              Next
            </button>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {WEEK_DAYS.map((dayName) => (
                  <div key={dayName} className="text-xs font-semibold text-gray-500 text-center py-1">
                    {dayName}
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
                        Today
                      </span>
                    )}
                  </div>
                  {isClosedDay && (
                    <div className="mt-2 text-[11px] font-medium text-gray-500">Closed</div>
                  )}
                  {slots.length > 0 && (
                    <div className="mt-2 text-[11px] leading-4 text-gray-600">
                      <div className="text-emerald-700">Free {freeCount}</div>
                      <div className="text-rose-700">Used {usedCount}</div>
                    </div>
                  )}

                  {showTooltip && (
                    <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-3 hidden md:block">
                      <p className="text-xs font-semibold text-gray-800 mb-2">{cellDate}</p>

                      {hoverLoadingDate === cellDate && (
                        <p className="text-xs text-gray-500">Loading slots...</p>
                      )}

                      {hoverErrorDate === cellDate && (
                        <p className="text-xs text-red-600">Could not load slots for this date.</p>
                      )}

                      {hoverLoadingDate !== cellDate &&
                        hoverErrorDate !== cellDate &&
                        slots.length === 0 && (
                          <p className="text-xs text-gray-500">
                            {isClosedDay ? 'Closed' : 'No slots found for this date.'}
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
                                        {slot.isAvailable ? 'Free' : 'Used'}
                                      </span>
                                    </div>

                                    {!slot.isAvailable && (
                                      <div className="mt-1 text-[11px] text-gray-600">
                                        <div>
                                          {booking?.email ? `User: ${booking.email}` : 'User: unavailable'}
                                        </div>
                                        {booking?.phone && <div>Phone: {booking.phone}</div>}
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
              <h2 className="text-lg font-semibold text-gray-800">Selected day details</h2>
              <p className="text-sm text-gray-500">Tap a date in the calendar to inspect slot availability.</p>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-800">{date}</span>
            </div>
          </div>

          {hoverLoadingDate === date && selectedDateSlots.length === 0 && (
            <p className="text-sm text-gray-500">Loading slots...</p>
          )}

          {selectedDateIsClosed && selectedDateSlots.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Closed. No working slots are configured for this day.
            </div>
          )}

          {!selectedDateIsClosed && selectedDateSlots.length === 0 && hoverLoadingDate !== date && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              No slots found for this date.
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
                        {slot.isAvailable ? 'Free' : 'Used'}
                      </span>
                    </div>

                    {!slot.isAvailable && (
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <div>
                          <span className="font-medium text-gray-700">User:</span>{' '}
                          {booking?.email ?? 'unavailable'}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Phone:</span>{' '}
                          {booking?.phone || '—'}
                        </div>
                        {booking?.status && (
                          <div>
                            <span className="font-medium text-gray-700">Status:</span>{' '}
                            {booking.status}
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
          Selected date: <span className="font-semibold text-gray-800">{date}</span>
          <span className="mx-2">•</span>
          Bookings: <span className="font-semibold text-gray-800">{selectedDateBookingsCount}</span>
        </div>

        {loading && <p className="text-gray-600">Loading bookings...</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-gray-600">
            No bookings for this date.
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => (
                    <tr key={b.bookingId} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-800 font-medium">{b.time}</td>
                      <td className="px-4 py-3 text-gray-700">{b.email}</td>
                      <td className="px-4 py-3 text-gray-700">{b.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{b.status}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

