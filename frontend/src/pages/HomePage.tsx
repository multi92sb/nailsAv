import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-rose-500 font-medium mb-2 text-lg">Welcome back,</p>
        <h2 className="text-4xl font-bold text-gray-800 mb-4">
          {user?.firstName} {user?.lastName}
        </h2>
        <p className="text-gray-500 mb-10 max-w-sm mx-auto leading-relaxed">
          Ready for your next nail appointment? Browse available slots and book in seconds.
        </p>
        <button
          onClick={() => navigate('/book')}
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-10 py-3.5 rounded-xl text-lg transition shadow-sm"
        >
          Book Appointment
        </button>
      </main>
    </div>
  );
}
