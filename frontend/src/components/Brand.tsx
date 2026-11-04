import { Link } from 'react-router-dom';

export default function Brand({ to = '/home', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link
      to={to}
      className={`font-serif font-semibold tracking-[-0.045em] text-espresso ${
        compact ? 'text-xl' : 'text-2xl'
      }`}
    >
      Nails<span className="text-brand-600">Av</span>
    </Link>
  );
}
