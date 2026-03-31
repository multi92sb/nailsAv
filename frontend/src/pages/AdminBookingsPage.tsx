import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import type { AdminBooking } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AdminBookingsPage() {
  const { adminToken, logout } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState(todayStr());
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const safeAdminToken = adminToken ?? '';

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.getBookingsByDate(date, safeAdminToken);
      setBookings(res.bookings);
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
            <p className="text-sm text-gray-500 mt-1">See who reserved which time slot.</p>
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

