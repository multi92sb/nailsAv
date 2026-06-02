import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';
import type { Slot, AdminBooking, AdminUser } from '../api/apiClient';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

interface DashboardData {
  slots: Slot[];
  bookings: AdminBooking[];
  users: AdminUser[];
}

function AdminDashboard() {
  const navigate = useNavigate();
  const today = todayStr();

  const [data, setData] = useState<DashboardData>({ slots: [], bookings: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
  }, [today]);

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
        <p className="mt-3 text-sm text-gray-500">Loading dashboard...</p>
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

  return (
    <div className="space-y-6">
      {/* Date heading */}
      <div className="text-center">
        <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Today</p>
        <p className="text-lg font-semibold text-gray-800">{formatDate(today)}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Bookings"
          value={data.bookings.length}
          accent="text-rose-700"
          bg="bg-rose-100"
          icon="📋"
        />
        <StatCard
          label="Slots Available"
          value={freeSlots}
          accent="text-emerald-700"
          bg="bg-emerald-100"
          icon="✅"
        />
        <StatCard
          label="Occupancy"
          value={`${occupancyPct}%`}
          accent="text-amber-700"
          bg="bg-amber-100"
          icon="📊"
        />
        <StatCard
          label="Registered Users"
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
            <span className="text-sm font-medium text-gray-700">Slot usage today</span>
            <span className="text-sm text-gray-500">
              {bookedSlots} / {totalSlots} booked
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
            Next appointment
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-800">{nextBooking.time}</p>
              <p className="text-sm text-gray-600">{nextBooking.email}</p>
              {nextBooking.phone && (
                <p className="text-sm text-gray-500">{nextBooking.phone}</p>
              )}
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {nextBooking.status}
            </span>
          </div>
        </div>
      )}

      {/* Today's schedule */}
      {data.bookings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">Today's schedule</p>
            <span className="text-xs text-gray-500">{data.bookings.length} appointment{data.bookings.length !== 1 ? 's' : ''}</span>
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
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  b.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.bookings.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-500 text-sm">No bookings yet today.</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/admin/bookings')}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition shadow-sm"
        >
          View All Bookings
        </button>
        <button
          onClick={() => navigate('/admin/users')}
          className="flex-1 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 rounded-xl border border-gray-200 transition"
        >
          Manage Users
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

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-rose-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-rose-700">💅 NailsAv</span>
          <nav className="flex items-center gap-5 text-sm">
            {user?.role === 'ADMIN' && (
              <Link to="/admin/users" className="text-gray-600 hover:text-rose-600 transition">
                Admin Users
              </Link>
            )}
            <Link to="/gallery" className="text-gray-600 hover:text-rose-600 transition">
              Gallery
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-rose-600 transition"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <p className="text-rose-500 font-medium mb-2 text-lg">Welcome back,</p>
          <h2 className="text-4xl font-bold text-gray-800">
            {user?.firstName} {user?.lastName}
          </h2>
        </div>

        {user?.role === 'ADMIN' ? (
          <AdminDashboard />
        ) : (
          <div className="text-center pt-8">
            <p className="text-gray-500 mb-10 max-w-sm mx-auto leading-relaxed">
              Ready for your next nail appointment? Browse available slots and book in seconds.
            </p>
            <button
              onClick={() => navigate('/book')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-10 py-3.5 rounded-xl text-lg transition shadow-sm"
            >
              Book Appointment
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
