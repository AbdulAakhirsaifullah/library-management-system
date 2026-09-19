import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { LoadingScreen } from './AppShell';

export function ProtectedRoute({ staffOnly = false }: { staffOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  if (staffOnly && user.role !== 'ADMIN') return <Navigate to="/catalogue" replace />;

  return <Outlet />;
}
