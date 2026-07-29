import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
  const { authenticated, adminVerified, loading, user } = useAuth();

  if (loading) return null;
  if (!authenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/home" replace />;
  if (!adminVerified) return <Navigate to="/admin/login" replace />;

  return <Outlet />;
}
