import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Users,
  Car,
  ClipboardList,
  DollarSign,
  Package,
  Tag,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Droplets,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { label: 'Overview',      path: '/admin',              icon: BarChart2,     end: true },
  { label: 'Customers',     path: '/admin/customers',    icon: Users },
  { label: 'Washers',       path: '/admin/washers',      icon: Car },
  { label: 'Bookings',      path: '/admin/bookings',     icon: ClipboardList },
  { label: 'Revenue',       path: '/admin/revenue',      icon: DollarSign },
  { label: 'Subscriptions', path: '/admin/subscriptions',icon: Package },
  { label: 'Promotions',    path: '/admin/promotions',   icon: Tag },
  { label: 'Notifications', path: '/admin/notifications',icon: Bell },
  { label: 'Settings',      path: '/admin/settings',     icon: Settings },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out');
      navigate('/');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="font-display font-bold text-text-light text-sm">DustHeist</span>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-accent" />
              <span className="text-[10px] text-accent font-semibold uppercase tracking-wider">Admin</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-text-light transition-colors lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
              ${isActive
                ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]'
                : 'text-muted hover:text-text-light hover:bg-dark-hover'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: admin user */}
      <div className="border-t border-dark-border px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-text-light text-sm font-semibold truncate">{profile?.name || 'Admin'}</p>
            <p className="text-muted text-xs truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-dark-card border-r border-dark-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-dark-card border-r border-dark-border z-50 lg:hidden flex flex-col"
            >
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-dark-card border-b border-dark-border sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-dark-hover transition-colors"
          >
            <Menu className="w-5 h-5 text-text-light" />
          </button>
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-text-light text-sm">DustHeist Admin</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
