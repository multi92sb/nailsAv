import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
  const { token, user, adminToken } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/home" replace />;
  if (!adminToken) return <Navigate to="/admin/login" replace />;

  return <Outlet />;
}
