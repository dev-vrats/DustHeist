import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Loader2, Mail, Lock, User, Phone, Droplets, Car, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUpPage() {
  const { register, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'washer' ? 'washer' : 'customer';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'washer' | 'admin'>(defaultRole as any);
  const [loading, setLoading] = useState(false);

  // Already logged-in guard
  if (profile) {
    const dest =
      profile.role === 'customer' ? '/customer'
      : profile.role === 'washer' ? '/washer'
      : '/admin';
    navigate(dest, { replace: true });
    return null;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      toast.error('Please fill in all fields.');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      });
      toast.success('Account created successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex">

      {/* Left hero — desktop only */}
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
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#1A73E8 1px, transparent 1px), linear-gradient(90deg, #1A73E8 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-accent/7 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-blue">
            <Droplets size={22} className="text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-text-light tracking-tight">
            DustHeist
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center gap-8">
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Car size={96} className="text-primary drop-shadow-[0_0_30px_rgba(26,115,232,0.4)]" />
          </motion.div>

          <div>
            <h1 className="font-display text-5xl font-bold text-text-light leading-tight mb-4">
              Join the future of <br/>
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                car washing
              </span>
            </h1>
            <p className="text-muted text-lg max-w-sm mx-auto leading-relaxed">
              Create an account today to get your car cleaned anywhere, anytime.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
              {[
                { label: 'Fast Setup', icon: <CheckCircle2 size={14} className="text-primary" /> },
                { label: 'Secure Data', icon: <Shield size={14} className="text-primary" /> },
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

        {/* Footer spacing */}
        <div className="h-10"></div>
      </motion.div>

      {/* Right form panel */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:px-16 relative overflow-y-auto"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
      >
        <div className="w-full max-w-md mt-10">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-text-light mb-2">
              Create an account
            </h2>
            <p className="text-muted text-sm">Join DustHeist today</p>
          </div>

          <div className="glass-card p-7 shadow-glass space-y-5">

            <div className="flex bg-dark-bg/50 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all ${
                  role === 'customer'
                    ? 'bg-primary text-white shadow-glow-blue'
                    : 'text-muted hover:text-text-light'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setRole('washer')}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all ${
                  role === 'washer'
                    ? 'bg-primary text-white shadow-glow-blue'
                    : 'text-muted hover:text-text-light'
                }`}
              >
                Washer
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4" noValidate>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    className="input-field pl-10"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="email"
                    className="input-field pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="tel"
                    className="input-field pl-10"
                    placeholder="+1 234 567 890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="password"
                    className="input-field pl-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2 flex justify-center items-center gap-2"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:text-blue-400 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}