import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loginAdmin, logout } = useAuth();

  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.adminLogin({ email, password });
      loginAdmin(res.token);
      navigate('/admin/users');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-rose-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/home" className="text-gray-400 hover:text-rose-600 transition text-lg">←</Link>
          <h1 className="text-2xl font-bold text-gray-800">Admin verification</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-5">
            For security, please re-enter your password to access the admin panel.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Continue to admin'}
            </button>
          </form>

          <div className="mt-4 flex justify-between items-center text-sm">
            <Link to="/home" className="text-gray-500 hover:text-rose-600 transition">
              Back to Home
            </Link>
            <button onClick={handleLogout} className="text-gray-500 hover:text-rose-600 transition">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

