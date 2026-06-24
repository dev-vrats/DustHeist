import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Star,
  MapPin,
  Shield,
  Zap,
  Car,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Users,
  Droplets,
} from 'lucide-react';

// ─── Animation Variants ────────────────────────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as any } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7, ease: 'easeOut' as any } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

// ─── Reusable Scroll-reveal wrapper ──────────────────────────────────────────
function RevealSection({
  children,
  className = '',
  variants = fadeInUp,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: typeof fadeInUp;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const services = [
  {
    name: 'Basic Exterior',
    price: '₹99',
    duration: '~30 min',
    icon: '🚿',
    popular: false,
    features: ['Exterior rinse & scrub', 'Wheel cleaning', 'Window wipe-down', 'Mirror polish'],
    gradient: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    glow: 'hover:shadow-[0_0_30px_rgba(26,115,232,0.25)]',
  },
  {
    name: 'Premium Clean',
    price: '₹249',
    duration: '~45 min',
    icon: '✨',
    popular: true,
    features: ['Everything in Basic', 'Interior wipe-down', 'Air freshener', 'Tyre shine included'],
    gradient: 'from-primary/15 to-accent/10',
    border: 'border-primary/40',
    glow: 'hover:shadow-[0_0_40px_rgba(26,115,232,0.4)]',
  },
  {
    name: 'Deep Clean',
    price: '₹499',
    duration: '~90 min',
    icon: '💎',
    popular: false,
    features: ['Full interior vacuuming', 'Seat shampoo', 'Dashboard polish', 'Engine bay clean'],
    gradient: 'from-purple-500/10 to-pink-500/5',
    border: 'border-purple-500/20',
    glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]',
  },
];

const steps = [
  { num: '01', icon: '📱', title: 'Book Service', desc: 'Pick your package & preferred slot in under 60 seconds.' },
  { num: '02', icon: '🎯', title: 'Washer Assigned', desc: 'A verified washer near you is instantly matched.' },
  { num: '03', icon: '🚗', title: 'Washer Arrives', desc: 'Track your washer live on the map. No waiting.' },
  { num: '04', icon: '✨', title: 'Car Sparkling', desc: 'Rate & pay digitally. Spotless, every time.' },
];

const addons = [
  { icon: '🧹', name: 'Interior Vacuum', price: '₹99', desc: 'Deep suction for seats, mats & floor' },
  { icon: '🔵', name: 'Tyre Shine', price: '₹49', desc: 'Glossy tyre dressing that lasts days' },
  { icon: '🧽', name: 'Dashboard Polish', price: '₹79', desc: 'UV protectant for a showroom finish' },
  { icon: '🪑', name: 'Seat Cleaning', price: '₹199', desc: 'Foam shampoo & stain removal' },
];

const trustBadges = [
  { icon: '✅', label: 'Verified Washers', color: 'from-accent/20 to-accent/5', border: 'border-accent/30', glow: 'shadow-[0_0_20px_rgba(0,200,83,0.15)]' },
  { icon: '📍', label: 'Live Tracking', color: 'from-primary/20 to-primary/5', border: 'border-primary/30', glow: 'shadow-[0_0_20px_rgba(26,115,232,0.2)]' },
  { icon: '🛡️', label: 'Insured Service', color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-bg text-text-light overflow-x-hidden">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />
      </div>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50">
        <nav className="bg-dark-bg/60 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 lg:px-12">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center shadow-glow-blue group-hover:scale-105 transition-transform">
                <span className="text-lg leading-none">💧</span>
              </div>
              <span className="text-xl font-bold text-text-light tracking-tight">
                Dust<span className="text-gradient-blue">Heist</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              <a href="#services" className="nav-link">Services</a>
              <a href="#how-it-works" className="nav-link">How It Works</a>
              <Link to="/login" className="nav-link">Login</Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <Link to="/login" className="hidden md:block text-muted hover:text-text-light text-sm font-medium transition-colors">
                Sign in
              </Link>
              <Link
                to="/book"
                className="btn-primary flex items-center gap-2 !py-2 !px-5 text-sm"
              >
                Book Now <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-12 min-h-[90vh] flex flex-col items-center justify-center text-center">
        {/* Animated grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(26,115,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(26,115,232,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
          aria-hidden="true"
        />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-1.5 text-sm text-accent font-medium mb-6 shadow-[0_0_20px_rgba(0,200,83,0.1)]"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
          500+ Happy Customers & Counting
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight tracking-tight max-w-4xl"
        >
          Car wash at your{' '}
          <span className="relative inline-block">
            <span className="text-gradient-blue">doorstep</span>
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 300 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 8 Q75 0 150 6 Q225 12 300 4"
                stroke="#1A73E8"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.5"
              />
            </svg>
          </span>
          ,{' '}
          <br className="hidden sm:block" />
          booked in{' '}
          <span className="text-gradient-blue">60 seconds</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 text-muted text-base sm:text-lg max-w-xl leading-relaxed"
        >
          Professional washers come to you — at home, office, or anywhere.
          Real-time tracking, verified pros, and a spotless car guaranteed.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-sm sm:max-w-none"
        >
          <Link
            to="/book"
            className="btn-primary flex items-center justify-center gap-2 !text-base !px-8 !py-4"
          >
            <Zap size={18} />
            Book Now — It's Free
          </Link>
          <Link
            to="/washer/register"
            className="flex items-center justify-center gap-2 border border-white/20 bg-white/5 backdrop-blur-sm text-text-light font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:bg-white/10 hover:border-white/30 text-base"
          >
            <Car size={18} />
            Become a Washer
          </Link>
        </motion.div>

        {/* Social proof row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-10 flex items-center gap-4 justify-center flex-wrap"
        >
          <div className="flex -space-x-3">
            {['🧑', '👩', '👨', '🧑‍💼', '👩‍💼'].map((emoji, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-dark-bg bg-dark-card flex items-center justify-center text-base shadow"
              >
                {emoji}
              </div>
            ))}
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-xs text-muted">Loved by 500+ customers</p>
          </div>
        </motion.div>

        {/* Floating car animation */}
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as any }}
          className="mt-16 relative"
        >
          <div className="relative w-72 sm:w-96 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent rounded-full blur-2xl scale-75 translate-y-8" />
            <div className="text-[9rem] sm:text-[12rem] text-center select-none filter drop-shadow-[0_0_40px_rgba(26,115,232,0.4)]">
              🚗
            </div>
          </div>
          <div className="w-48 h-6 bg-primary/20 rounded-full blur-xl mx-auto -mt-4" />
        </motion.div>
      </section>

      {/* ── SERVICES ───────────────────────────────────────────────────────── */}
      <section id="services" className="py-20 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <RevealSection className="text-center mb-14">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Our Services</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-light">
              Pick your perfect <span className="text-gradient-blue">wash</span>
            </h2>
            <p className="text-muted mt-3 max-w-md mx-auto">
              From a quick exterior rinse to a full deep-clean — we've got you covered.
            </p>
          </RevealSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {services.map((s) => (
              <motion.div
                key={s.name}
                variants={fadeInUp}
                className={`relative group rounded-2xl border p-6 bg-gradient-to-br ${s.gradient} ${s.border} transition-all duration-300 cursor-pointer ${s.glow} hover:-translate-y-1`}
              >
                {s.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-primary to-blue-400 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-glow-blue whitespace-nowrap">
                      ⭐ MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-5">
                  <div className="text-4xl">{s.icon}</div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-text-light">{s.price}</p>
                    <div className="flex items-center gap-1 justify-end mt-1 text-muted text-xs">
                      <Clock size={11} />
                      {s.duration}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-text-light mb-4">{s.name}</h3>

                <ul className="space-y-2.5">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted">
                      <CheckCircle size={14} className="text-accent shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/book"
                  className={`mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    s.popular
                      ? 'bg-primary text-white shadow-glow-blue hover:bg-primary/90'
                      : 'bg-white/5 border border-white/10 text-text-light hover:bg-white/10'
                  }`}
                >
                  Book This Plan <ArrowRight size={14} />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <RevealSection className="text-center mb-14">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-light">
              Spotless in <span className="text-gradient-blue">4 easy steps</span>
            </h2>
            <p className="text-muted mt-3 max-w-md mx-auto">
              No hassle. No driving to the car wash. Just book and relax.
            </p>
          </RevealSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="relative"
          >
            {/* Desktop connecting line */}
            <div className="hidden lg:block absolute top-16 left-[12%] right-[12%] h-px border-t-2 border-dashed border-white/10 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  variants={fadeInUp}
                  className="relative flex flex-col items-center text-center group"
                >
                  {i < steps.length - 1 && (
                    <div className="lg:hidden absolute top-16 left-1/2 h-8 w-px border-l-2 border-dashed border-white/10 translate-x-px" />
                  )}

                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_24px_rgba(26,115,232,0.35)] transition-all duration-300">
                    <span className="text-3xl">{step.icon}</span>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{i + 1}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-text-light mb-2">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── ADD-ONS ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <RevealSection className="text-center mb-12">
            <p className="text-warning-500 text-sm font-semibold uppercase tracking-widest mb-3">Extras</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-light">
              Supercharge your <span className="text-gradient-blue">wash</span>
            </h2>
            <p className="text-muted mt-3 max-w-md mx-auto">
              Add premium services to any booking — à la carte.
            </p>
          </RevealSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {addons.map((a) => (
              <motion.div
                key={a.name}
                variants={fadeInUp}
                className="glass-card p-5 flex items-center gap-4 group hover:border-primary/30 hover:shadow-[0_0_20px_rgba(26,115,232,0.12)] transition-all duration-300 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-xl bg-dark-bg flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform">
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-light">{a.name}</h3>
                  <p className="text-sm text-muted mt-0.5 truncate">{a.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-primary">{a.price}</p>
                  <p className="text-xs text-muted">add-on</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── TRUST BADGES ───────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <RevealSection className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-light">
              Why customers <span className="text-gradient-blue">trust us</span>
            </h2>
          </RevealSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="flex flex-wrap justify-center gap-4"
          >
            {trustBadges.map((b) => (
              <motion.div
                key={b.label}
                variants={fadeIn}
                className={`flex items-center gap-3 bg-gradient-to-br ${b.color} border ${b.border} ${b.glow} rounded-2xl px-6 py-4 backdrop-blur-sm hover:scale-105 transition-transform duration-300`}
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="font-semibold text-text-light text-sm sm:text-base">{b.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── STATS BANNER ───────────────────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-dark-card shadow-[0_0_40px_rgba(26,115,232,0.15)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="relative grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                {[
                  { val: '500+', label: 'Washes Done', icon: <Droplets size={20} className="text-primary" /> },
                  { val: '50+', label: 'Verified Washers', icon: <Users size={20} className="text-accent" /> },
                  { val: '4.8★', label: 'Average Rating', icon: <Star size={20} className="fill-yellow-400 text-yellow-400" /> },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center justify-center py-10 px-8 gap-2 text-center">
                    <div className="flex items-center gap-2 mb-1">{stat.icon}</div>
                    <p className="text-4xl font-bold text-text-light">{stat.val}</p>
                    <p className="text-muted text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── FINAL CTA STRIP ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <RevealSection>
            <div className="glass-card p-10 sm:p-14 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />
              <div className="relative">
                <div className="text-5xl mb-4">🚗💦</div>
                <h2 className="text-3xl sm:text-4xl font-bold text-text-light mb-4">
                  Ready for a <span className="text-gradient-blue">spotless ride?</span>
                </h2>
                <p className="text-muted mb-8 text-base max-w-md mx-auto">
                  Join hundreds of happy customers who've discovered the easiest way to keep their car clean.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/book" className="btn-primary flex items-center justify-center gap-2 !px-10 !py-4 !text-base">
                    <Zap size={18} /> Book Your First Wash
                  </Link>
                  <Link
                    to="/washer/register"
                    className="flex items-center justify-center gap-2 border border-white/15 bg-white/5 backdrop-blur-sm text-text-light font-semibold px-10 py-4 rounded-xl transition-all duration-200 hover:bg-white/10 text-base"
                  >
                    Earn as a Washer
                  </Link>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] bg-dark-bg/80 backdrop-blur-sm px-4 sm:px-6 lg:px-12 pt-14 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center shadow-glow-blue">
                  <span className="text-lg leading-none">💧</span>
                </div>
                <span className="text-xl font-bold text-text-light tracking-tight">
                  Dust<span className="text-gradient-blue">Heist</span>
                </span>
              </div>
              <p className="text-muted text-sm leading-relaxed mb-5">
                Professional car washing, delivered to your doorstep. Fast, affordable, and eco-friendly.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: <MessageCircle size={16} />, label: 'Instagram', href: '#' },
                  { icon: <MessageCircle size={16} />, label: 'Twitter', href: '#' },
                  { icon: <MessageCircle size={16} />, label: 'WhatsApp', href: '#' },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 flex items-center justify-center text-muted hover:text-primary hover:border-primary/30 transition-all duration-200 hover:shadow-[0_0_12px_rgba(26,115,232,0.2)]"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Services links */}
            <div>
              <h4 className="text-text-light font-semibold mb-4 text-sm uppercase tracking-widest">Services</h4>
              <ul className="space-y-3">
                {['Basic Exterior', 'Premium Clean', 'Deep Clean', 'Add-on Services'].map((l) => (
                  <li key={l}>
                    <a href="#services" className="text-muted text-sm hover:text-primary transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-text-light font-semibold mb-4 text-sm uppercase tracking-widest">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: 'About Us', to: '/about' },
                  { label: 'Become a Washer', to: '/washer/register' },
                  { label: 'Pricing', to: '#services' },
                  { label: 'FAQs', to: '/faq' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-muted text-sm hover:text-primary transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-text-light font-semibold mb-4 text-sm uppercase tracking-widest">Contact</h4>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:help@dustheist.com" className="flex items-center gap-2.5 text-muted text-sm hover:text-primary transition-colors">
                    <Mail size={14} className="shrink-0 text-primary" />
                    help@dustheist.com
                  </a>
                </li>
                <li>
                  <a href="tel:+919876543210" className="flex items-center gap-2.5 text-muted text-sm hover:text-primary transition-colors">
                    <Phone size={14} className="shrink-0 text-primary" />
                    +91-98765-43210
                  </a>
                </li>
                <li>
                  <div className="flex items-start gap-2.5 text-muted text-sm">
                    <MapPin size={14} className="shrink-0 text-primary mt-0.5" />
                    Bangalore, Karnataka, India
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.08] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-muted text-xs text-center sm:text-left">
              © 2026 DustHeist. All rights reserved.
            </p>
            <p className="text-muted text-xs flex items-center gap-1">
              Made with <span className="text-red-400 text-sm">❤️</span> by 3 college founders
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-muted text-xs hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-muted text-xs hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
