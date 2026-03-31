import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { Slot } from '../api/apiClient';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
  const today = new Date();

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
      .catch(() => setError('Failed to load slots for this date'))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate]);

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

  return (
    <div className="min-h-screen bg-rose-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/home" className="text-gray-400 hover:text-rose-600 transition text-lg">←</Link>
          <h1 className="text-2xl font-bold text-gray-800">Book an Appointment</h1>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition"
            >
              ‹
            </button>
            <span className="font-semibold text-gray-800">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition"
            >
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
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
                  onClick={() => !past && setSelectedDate(dateStr)}
                  disabled={past}
                  className={[
                    'aspect-square rounded-lg text-sm font-medium transition',
                    past
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'hover:bg-rose-100 cursor-pointer text-gray-700',
                    selected ? 'bg-rose-600 text-white hover:bg-rose-600' : '',
                  ].join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
            <h2 className="font-semibold text-gray-800 mb-3">
              Available times for <span className="text-rose-600">{selectedDate}</span>
            </h2>
            {slotsLoading && <p className="text-gray-400 text-sm">Loading…</p>}
            {!slotsLoading && availableSlots.length === 0 && (
              <p className="text-gray-400 text-sm">No available slots for this date.</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.slotId}
                  onClick={() => setSelectedSlot(slot)}
                  className={[
                    'py-2 rounded-lg text-sm font-medium border transition',
                    selectedSlot?.slotId === slot.slotId
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-gray-200 hover:border-rose-400 text-gray-700',
                  ].join(' ')}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {selectedSlot && (
          <button
            onClick={handleBook}
            disabled={booking}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 shadow-sm"
          >
            {booking
              ? 'Confirming…'
              : `Confirm – ${selectedSlot.date} at ${selectedSlot.time}`}
          </button>
        )}
      </div>
    </div>
  );
}
