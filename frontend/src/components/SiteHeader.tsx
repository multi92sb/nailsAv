import { Link, useNavigate } from 'react-router-dom';
import Brand from './Brand';
import LanguageSelector from './LanguageSelector';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

type CurrentPage = 'home' | 'gallery' | 'bookings' | 'profile';

const linkClass = (active: boolean) =>
  `transition ${active ? 'font-bold text-espresso' : 'text-muted hover:text-espresso'}`;

export default function SiteHeader({ current }: { current?: CurrentPage }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Brand />
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] sm:justify-end">
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="font-bold text-coral transition hover:text-red-700">
              {t('adminPanel')}
            </Link>
          )}
          <Link to="/home" className={linkClass(current === 'home')}>
            {t('navHome')}
          </Link>
          {user?.role !== 'ADMIN' && (
            <Link to="/book" className={linkClass(false)}>
              {t('bookAppointment')}
            </Link>
          )}
          <Link to="/gallery" className={linkClass(current === 'gallery')}>
            {t('navGallery')}
          </Link>
          {user?.role !== 'ADMIN' && (
            <Link to="/my-bookings" className={linkClass(current === 'bookings')}>
              {t('navMyBookings')}
            </Link>
          )}
          <Link to="/profile" className={linkClass(current === 'profile')}>
            {t('navProfile')}
          </Link>
          <LanguageSelector />
          <button
            type="button"
            onClick={handleLogout}
            className="text-muted transition hover:text-espresso"
          >
            {t('navLogout')}
          </button>
        </nav>
      </div>
    </header>
  );
}
