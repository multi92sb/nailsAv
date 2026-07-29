import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { authenticated, loading } = useAuth();
  if (loading) return null;
  return authenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
