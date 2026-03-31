import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.register(form);
      login(token, user);
      navigate('/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-rose-700 mb-1 text-center">Create Account</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Book your first nail appointment</p>

        {error && (
          <p className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2 mb-4 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="First name"
              value={form.firstName}
              onChange={set('firstName')}
              required
              autoFocus
            />
            <input
              className="input"
              placeholder="Last name"
              value={form.lastName}
              onChange={set('lastName')}
              required
            />
          </div>
          <input
            className="input"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={set('email')}
            required
          />
          <input
            className="input"
            type="tel"
            placeholder="Phone number"
            value={form.phone}
            onChange={set('phone')}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password (min. 8 characters)"
            value={form.password}
            onChange={set('password')}
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-rose-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
