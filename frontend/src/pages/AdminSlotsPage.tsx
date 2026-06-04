import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { Slot } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const DEFAULT_TIMES = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
];

const WEEKDAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const WEEKDAY_LABELS: Record<string, Record<number, string>> = {
  en: { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' },
  sr: { 1: 'Pon', 2: 'Uto', 3: 'Sre', 4: 'Čet', 5: 'Pet', 6: 'Sub', 0: 'Ned' },
};

function todayStr(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function dateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function AdminSlotsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  // Generate Slots Form state
  const [startDate, setStartDate] = useState(dateInDays(1));
  const [endDate, setEndDate] = useState(dateInDays(7));
  const [selectedTimes, setSelectedTimes] = useState<string[]>(DEFAULT_TIMES);
  const [availableTimes, setAvailableTimes] = useState<string[]>(DEFAULT_TIMES);
  const [activeWeekdays, setActiveWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Mon-Sat active
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Inspect Slots state
  const [inspectDate, setInspectDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit Slot state
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState<string>('');
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Load slots for inspection
  const loadSlots = async () => {
    if (!inspectDate) return;
    setLoadingSlots(true);
    setSlotsError(null);
    try {
      const data = await api.getSlots(inspectDate);
      // Sort slots by time
      const sortedSlots = [...data.slots].sort((a, b) => a.time.localeCompare(b.time));
      setSlots(sortedSlots);

      if (sortedSlots.length > 0) {
        const times = sortedSlots.map((s) => s.time);
        setAvailableTimes(times);
        setSelectedTimes(times);
      } else {
        setAvailableTimes(DEFAULT_TIMES);
        setSelectedTimes(DEFAULT_TIMES);
      }
    } catch {
      setSlotsError(t('failedToLoadSlots'));
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [inspectDate]);

  // Handle generating slots
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTimes.length === 0) {
      setGenMessage({ text: t('errorNoTimesSelected'), isError: true });
      return;
    }
    if (activeWeekdays.length === 0) {
      setGenMessage({ text: t('errorNoDaysSelected'), isError: true });
      return;
    }

    setGenerating(true);
    setGenMessage(null);

    // closedDays = all days NOT in activeWeekdays
    const closedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !activeWeekdays.includes(d));

    try {
      const res = await api.adminGenerateSlots({
        startDate,
        endDate,
        times: selectedTimes,
        closedDays,
      });
      setGenMessage({
        text: t('successGenerateSlots', { count: res.count }),
        isError: false,
      });
      // Refresh inspector if inspectDate is within generated range
      if (inspectDate >= startDate && inspectDate <= endDate) {
        loadSlots();
      }
    } catch (err: any) {
      setGenMessage({
        text: err instanceof Error ? err.message : 'Failed to generate slots.',
        isError: true,
      });
    } finally {
      setGenerating(false);
    }
  };

  // Handle deleting a slot
  const handleDeleteSlot = async (slot: Slot) => {
    if (!window.confirm(t('confirmDeleteSlot', { time: slot.time, date: slot.date }))) {
      return;
    }
    setDeletingId(slot.slotId);
    try {
      await api.adminDeleteSlot({
        date: slot.date,
        time: slot.time,
        slotId: slot.slotId,
      });
      // Filter out deleted slot locally
      setSlots((prev) => prev.filter((s) => s.slotId !== slot.slotId));
      // Also update availableTimes and selectedTimes
      setAvailableTimes((prev) => prev.filter((t) => t !== slot.time));
      setSelectedTimes((prev) => prev.filter((t) => t !== slot.time));
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Failed to delete slot.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateSlotTime = async (slot: Slot) => {
    if (!editTimeValue || editTimeValue === slot.time) {
      setEditingSlotId(null);
      return;
    }
    setUpdatingSlotId(slot.slotId);
    try {
      await api.adminUpdateSlot({
        date: slot.date,
        oldTime: slot.time,
        newTime: editTimeValue,
        slotId: slot.slotId,
      });
      // Update slots state and re-sort by time
      setSlots((prev) =>
        prev
          .map((s) => (s.slotId === slot.slotId ? { ...s, time: editTimeValue } : s))
          .sort((a, b) => a.time.localeCompare(b.time)),
      );
      // Also update availableTimes and selectedTimes lists
      setAvailableTimes((prev) =>
        prev.map((t) => (t === slot.time ? editTimeValue : t)).sort(),
      );
      setSelectedTimes((prev) =>
        prev.map((t) => (t === slot.time ? editTimeValue : t)),
      );
      setEditingSlotId(null);
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Failed to update slot time.');
    } finally {
      setUpdatingSlotId(null);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setInspectDate(val);
    if (endDate < val) {
      setEndDate(val);
    }
  };

  const handleInspectDateChange = (val: string) => {
    setInspectDate(val);
    setStartDate(val);
    if (endDate < val) {
      setEndDate(val);
    }
  };

  const toggleTime = (t: string) => {
    setSelectedTimes((prev) =>
      prev.includes(t) ? prev.filter((time) => time !== t) : [...prev, t]
    );
  };

  const toggleWeekday = (d: number) => {
    setActiveWeekdays((prev) =>
      prev.includes(d) ? prev.filter((day) => day !== d) : [...prev, d]
    );
  };

  return (
    <div className="min-h-screen bg-rose-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-rose-700">{t('adminPanel')}</span>
            <span className="text-sm text-gray-500">{t('navSlots')}</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/admin/users" className="text-gray-600 hover:text-rose-600 transition">
              {t('navUsers')}
            </Link>
            <Link to="/admin/bookings" className="text-gray-600 hover:text-rose-600 transition">
              {t('navBookings')}
            </Link>
            <Link to="/admin/slots" className="text-rose-700 font-semibold">
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('manageSlotsTitle')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Generate Slots Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>📅</span> {t('bulkGenerateSlots')}
              </h2>

              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Date range inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                      {t('startDateLabel')}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                      {t('endDateLabel')}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Weekday check grid */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    {t('activeWorkDays')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const isActive = activeWeekdays.includes(day.value);
                      const displayLabel = WEEKDAY_LABELS[language]?.[day.value] || WEEKDAY_LABELS.en[day.value] || day.label;
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWeekday(day.value)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                            isActive
                              ? 'bg-rose-600 border-rose-600 text-white shadow-sm hover:bg-rose-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-rose-300'
                          }`}
                        >
                          {displayLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slot check grid */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    {t('selectHours')}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {availableTimes.map((time) => {
                      const isSelected = selectedTimes.includes(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => toggleTime(time)}
                          className={`py-2 px-3 text-center rounded-xl text-sm border font-medium transition ${
                            isSelected
                              ? 'bg-rose-50 border-rose-500 text-rose-700 hover:bg-rose-100/50'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-rose-300'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {genMessage && (
                  <div
                    className={`p-4 rounded-xl border text-sm ${
                      genMessage.isError
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {genMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] duration-200"
                >
                  {generating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t('generatingSlots')}
                    </>
                  ) : (
                    t('generateWorkingSlots')
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right / Inspect & Delete Slots */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm min-h-[400px]">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>🔍</span> {t('inspectDailySlots')}
              </h2>

              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  {t('selectInspectDate')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={inspectDate}
                    onChange={(e) => handleInspectDateChange(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <button
                    onClick={loadSlots}
                    className="bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl px-4 text-sm font-semibold text-gray-700 transition"
                  >
                    🔄
                  </button>
                </div>
              </div>

              {loadingSlots && (
                <div className="text-center py-10">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600" />
                  <p className="mt-2 text-xs text-gray-400">{t('loadingDailySlots')}</p>
                </div>
              )}

              {!loadingSlots && slotsError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 text-center">
                  {slotsError}
                </div>
              )}

              {!loadingSlots && !slotsError && slots.length === 0 && (
                <div className="bg-gray-50 border border-gray-150 rounded-xl p-8 text-center">
                  <p className="text-gray-400 text-sm">{t('noSlotsForInspectDate')}</p>
                </div>
              )}

              {!loadingSlots && !slotsError && slots.length > 0 && (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {slots.map((slot) => (
                    <div
                      key={slot.slotId}
                      className="flex items-center justify-between border border-gray-150 rounded-xl p-3 hover:bg-gray-50 transition"
                    >
                      {editingSlotId === slot.slotId ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={editTimeValue}
                            onChange={(e) => setEditTimeValue(e.target.value)}
                            disabled={updatingSlotId === slot.slotId}
                            className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-gray-700"
                            required
                          />
                          <button
                            onClick={() => handleUpdateSlotTime(slot)}
                            disabled={updatingSlotId === slot.slotId}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8 rounded-lg flex items-center justify-center transition border border-transparent hover:border-emerald-100 text-sm font-semibold"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingSlotId(null)}
                            disabled={updatingSlotId === slot.slotId}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 h-8 w-8 rounded-lg flex items-center justify-center transition border border-transparent hover:border-gray-150 text-sm font-semibold"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-800 text-sm">{slot.time}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              slot.isAvailable
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {slot.isAvailable ? t('freeBadge') : t('bookedBadge')}
                          </span>
                        </div>
                      )}

                      {slot.isAvailable ? (
                        <div className="flex items-center gap-1">
                          {editingSlotId !== slot.slotId && (
                            <button
                              onClick={() => {
                                setEditingSlotId(slot.slotId);
                                setEditTimeValue(slot.time);
                              }}
                              disabled={deletingId === slot.slotId || updatingSlotId !== null}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 rounded-lg flex items-center justify-center transition border border-transparent hover:border-blue-100 text-sm font-semibold disabled:opacity-50"
                              title="Edit slot time"
                            >
                              ✏️
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSlot(slot)}
                            disabled={deletingId === slot.slotId || updatingSlotId === slot.slotId}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 rounded-lg flex items-center justify-center transition border border-transparent hover:border-red-100 text-sm font-semibold disabled:opacity-50"
                            title="Delete slot"
                          >
                            🗑️
                          </button>
                        </div>
                      ) : (
                        <span
                          className="text-[11px] text-gray-400 font-medium px-2"
                          title={t('lockedSlotTip')}
                        >
                          {t('lockedLabel')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
