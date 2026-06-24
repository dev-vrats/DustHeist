import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('customer' | 'washer' | 'admin')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
            <span className="text-3xl">💧</span>
          </div>
          <p className="text-muted text-sm animate-pulse">Loading DustHeist...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard
    if (profile.role === 'customer') return <Navigate to="/customer" replace />;
    if (profile.role === 'washer') return <Navigate to="/washer" replace />;
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
