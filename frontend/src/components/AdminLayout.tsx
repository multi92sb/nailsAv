import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Brand from './Brand';
import LanguageSelector from './LanguageSelector';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';

function Icon({ name }: { name: 'bookings' | 'slots' | 'users' | 'home' }) {
  if (name === 'bookings') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" />
      </svg>
    );
  }
  if (name === 'slots') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (name === 'users') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0111 0M16 5.5a3 3 0 010 5.8M16.5 14.5A4.5 4.5 0 0121 19" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5" />
    </svg>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
    isActive ? 'bg-[#FFF1F3] text-coral' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
  }`;

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] ?? 'A'}${user?.lastName?.[0] ?? 'M'}`;

  return (
    <div className="min-h-screen bg-studio text-studio-ink lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="hidden border-r border-studio-line bg-white px-4 py-7 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-2">
          <Brand to="/admin/bookings" compact />
          <p className="mt-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
            {t('adminPanel')}
          </p>
        </div>

        <nav className="mt-8 grid gap-1">
          <NavLink to="/admin/bookings" className={navClass}>
            <Icon name="bookings" />
            {t('navBookings')}
          </NavLink>
          <NavLink to="/admin/slots" className={navClass}>
            <Icon name="slots" />
            {t('navSlots')}
          </NavLink>
          <NavLink to="/admin/users" className={navClass}>
            <Icon name="users" />
            {t('navUsers')}
          </NavLink>
          <NavLink to="/home" className={navClass}>
            <Icon name="home" />
            {t('navHome')}
          </NavLink>
        </nav>

        <div className="mt-auto border-t border-studio-line pt-5">
          <div className="flex items-center gap-2.5 rounded-xl bg-zinc-50 px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FCE7EB] text-[10px] font-extrabold text-[#9F1239]">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-zinc-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-[9px] text-zinc-400">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between px-1">
            <LanguageSelector />
            <button
              type="button"
              onClick={handleLogout}
              className="text-[10px] font-bold text-zinc-400 transition hover:text-coral"
            >
              {t('navLogout')}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-studio-line bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <Brand to="/admin/bookings" compact />
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-studio-line px-3 py-2 text-[10px] font-bold text-zinc-500"
            >
              {t('navLogout')}
            </button>
          </div>
        </header>

        <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-studio-line bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden">
        {[
          { to: '/admin/bookings', label: t('navBookings'), icon: 'bookings' as const },
          { to: '/admin/slots', label: t('navSlots'), icon: 'slots' as const },
          { to: '/admin/users', label: t('navUsers'), icon: 'users' as const },
          { to: '/home', label: t('navHome'), icon: 'home' as const },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg py-1.5 text-[9px] font-bold transition ${
                isActive ? 'text-coral' : 'text-zinc-400'
              }`
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
