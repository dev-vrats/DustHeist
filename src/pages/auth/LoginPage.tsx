import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2, Mail, Lock, LogIn, ChevronRight, Droplets, Car, Zap, MapPin, CreditCard, Star, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/* ─── Firebase error map ─────────────────────────────────────────────────── */
const FIREBASE_ERRORS: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/network-request-failed': 'Network error. Check your connection.',
};

function parseError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  return FIREBASE_ERRORS[code] ?? (err as Error)?.message ?? 'Something went wrong.';
}

/* ─── Google SVG icon ────────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
      </g>
    </svg>
  );
}

/* ─── ForgotPasswordModal ────────────────────────────────────────────────── */
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      toast.success('Password reset link sent!');
    } catch (err) {
      toast.error(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Card */}
      <motion.div
        className="relative glass-card p-8 w-full max-w-sm shadow-glass"
        initial={{ scale: 0.9, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-text-light transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Mail size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-text-light">Reset Password</h3>
            <p className="text-xs text-muted">We'll email you a reset link</p>
          </div>
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
          >
            <div className="text-5xl mb-3 leading-none">📬</div>
            <p className="text-text-light font-semibold mb-1">Check your inbox!</p>
            <p className="text-muted text-sm">
              A reset link was sent to{' '}
              <span className="text-primary">{email}</span>
            </p>
            <button onClick={onClose} className="btn-primary w-full mt-6">
              Done
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">
                Email Address
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={17} className="animate-spin" />}
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── LoginPage ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login, loginWithGoogle, profile } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgot, setShowForgot]     = useState(false);

  /* Already logged-in guard */
  useEffect(() => {
    if (profile) {
      const dest =
        profile.role === 'customer' ? '/customer'
        : profile.role === 'washer' ? '/washer'
        : '/admin';
      navigate(dest, { replace: true });
    }
  }, [profile, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(parseError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ── render ── */
  return (
    <>
      <div className="min-h-screen bg-dark-bg flex">

        {/* ── Left hero — desktop only ──────────────────────────────────── */}
        <motion.div
          className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12"
          style={{
            background:
              'linear-gradient(135deg, #09111f 0%, #0F172A 45%, #0c1c38 75%, #060f1c 100%)',
          }}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          {/* grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'linear-gradient(#1A73E8 1px, transparent 1px), linear-gradient(90deg, #1A73E8 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          {/* glow blobs */}
          <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-accent/7 rounded-full blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-blue">
              <Droplets size={22} className="text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-text-light tracking-tight">
              DustHeist
            </span>
          </div>

          {/* Centre hero */}
          <div className="relative z-10 flex flex-col items-center text-center gap-8">
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Car size={96} className="text-primary drop-shadow-[0_0_30px_rgba(26,115,232,0.4)]" />
            </motion.div>

            <div>
              <h1 className="font-display text-5xl font-bold text-text-light leading-tight mb-4">
                Your car,{' '}
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  spotless
                </span>
                <br />at your doorstep.
              </h1>
              <p className="text-muted text-lg max-w-sm mx-auto leading-relaxed">
                Professional car washing delivered wherever you park.
                No queues, no hassle — just shine.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { label: 'Instant Booking', icon: <Zap size={14} className="text-primary" /> },
                { label: 'GPS Tracked', icon: <MapPin size={14} className="text-primary" /> },
                { label: 'Pay Online', icon: <CreditCard size={14} className="text-primary" /> },
                { label: 'Rated Washers', icon: <Star size={14} className="text-primary" /> },
              ].map((feat) => (
                <span
                  key={feat.label}
                  className="flex items-center gap-1.5 text-xs font-medium text-text-light bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5"
                >
                  {feat.icon}
                  {feat.label}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="relative z-10 flex items-center gap-10">
            {[
              { num: '10K+', label: 'Happy Cars' },
              { num: '500+', label: 'Expert Washers' },
              { num: '4.9★', label: 'Avg Rating' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-xl font-bold text-text-light">{s.num}</div>
                <div className="text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Right form panel ──────────────────────────────────────────── */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:px-16 relative overflow-y-auto"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 self-start">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-glow-blue">
              <Droplets size={18} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold text-text-light">DustHeist</span>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold text-text-light mb-2">
                Welcome back
              </h2>
              <p className="text-muted text-sm">Sign in to your DustHeist account</p>
            </div>

            <div className="glass-card p-7 shadow-glass space-y-5">

              {/* ── Google ── */}
              <motion.button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-800
                           font-semibold py-3 px-4 rounded-xl transition-all duration-200
                           hover:bg-gray-100 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                whileTap={{ scale: 0.97 }}
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin text-gray-500" />
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-dark-border" />
                <span className="text-xs text-muted font-medium whitespace-nowrap">
                  or continue with email
                </span>
                <div className="flex-1 h-px bg-dark-border" />
              </div>

              {/* ── Email / password form ── */}
              <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                    />
                    <input
                      type="email"
                      className="input-field pl-10"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs text-primary hover:text-blue-400 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-10 pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-text-light transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                  {loading ? 'Signing in…' : 'Sign In'}
                </motion.button>
              </form>
            </div>

            {/* Sign-up CTA */}
            <p className="text-center text-sm text-muted mt-6">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-primary hover:text-blue-400 font-semibold transition-colors"
              >
                Create one — it's free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Forgot password modal ── */}
      <AnimatePresence>
        {showForgot && (
          <ForgotPasswordModal onClose={() => setShowForgot(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
