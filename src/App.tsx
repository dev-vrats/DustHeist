import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AIChatbot } from '@/components/AIChatbot';
import { useAuth } from '@/contexts/AuthContext';

// Public pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import SignUpPage from '@/pages/auth/SignUpPage';

// Customer pages
import CustomerHome from '@/pages/customer/CustomerHome';
import BookingFlow from '@/pages/customer/BookingFlow';
import LiveTracking from '@/pages/customer/LiveTracking';
import BookingHistory from '@/pages/customer/BookingHistory';
import CustomerProfile from '@/pages/customer/CustomerProfile';

// Washer pages
import WasherHome from '@/pages/washer/WasherHome';
import ActiveJob from '@/pages/washer/ActiveJob';
import WasherEarnings from '@/pages/washer/WasherEarnings';
import WasherProfile from '@/pages/washer/WasherProfile';

// Admin pages
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminOverview from '@/pages/admin/AdminOverview';
import ManageCustomers from '@/pages/admin/ManageCustomers';
import ManageWashers from '@/pages/admin/ManageWashers';
import AllBookings from '@/pages/admin/AllBookings';
import RevenueManagement from '@/pages/admin/RevenueManagement';
import PromotionsCoupons from '@/pages/admin/PromotionsCoupons';
import NotificationsCenter from '@/pages/admin/NotificationsCenter';
import AdminSettings from '@/pages/admin/AdminSettings';

function RoleRedirect() {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'customer') return <Navigate to="/customer" replace />;
  if (profile.role === 'washer') return <Navigate to="/washer" replace />;
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { profile } = useAuth();

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        {/* Role-based redirect after login */}
        <Route path="/dashboard" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />

        {/* Customer routes */}
        <Route path="/customer" element={<ProtectedRoute allowedRoles={['customer']}><CustomerHome /></ProtectedRoute>} />
        <Route path="/customer/book" element={<ProtectedRoute allowedRoles={['customer']}><BookingFlow /></ProtectedRoute>} />
        <Route path="/customer/track/:bookingId" element={<ProtectedRoute allowedRoles={['customer']}><LiveTracking /></ProtectedRoute>} />
        <Route path="/customer/history" element={<ProtectedRoute allowedRoles={['customer']}><BookingHistory /></ProtectedRoute>} />
        <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />

        {/* Washer routes */}
        <Route path="/washer" element={<ProtectedRoute allowedRoles={['washer']}><WasherHome /></ProtectedRoute>} />
        <Route path="/washer/job/:bookingId" element={<ProtectedRoute allowedRoles={['washer']}><ActiveJob /></ProtectedRoute>} />
        <Route path="/washer/earnings" element={<ProtectedRoute allowedRoles={['washer']}><WasherEarnings /></ProtectedRoute>} />
        <Route path="/washer/profile" element={<ProtectedRoute allowedRoles={['washer']}><WasherProfile /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminOverview />} />
          <Route path="customers" element={<ManageCustomers />} />
          <Route path="washers" element={<ManageWashers />} />
          <Route path="bookings" element={<AllBookings />} />
          <Route path="revenue" element={<RevenueManagement />} />
          <Route path="promotions" element={<PromotionsCoupons />} />
          <Route path="notifications" element={<NotificationsCenter />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating AI Chatbot — only for customers */}
      {profile?.role === 'customer' && <AIChatbot />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#00C853', secondary: '#0F172A' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0F172A' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
