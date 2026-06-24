import { Navigate } from 'react-router-dom';
import { Droplets } from 'lucide-react';
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
          <div className="w-16 h-16 bg-dark-card rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(26,115,232,0.2)] animate-pulse">
            <Droplets size={32} className="text-primary" />
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
