import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MapPin, Star, Zap, ZapOff, TrendingUp, Briefcase,
  Clock, Car, CheckCircle,
  Wallet, Calendar, BarChart2,
} from 'lucide-react';
import {
  collection, doc, query, where, onSnapshot,
  updateDoc, serverTimestamp,
  orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { haversineDistance } from '@/lib/haversine';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Booking, SERVICE_LABELS } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface IncomingJob extends Booking {
  distanceKm: number;
}

interface EarningStat {
  todayEarnings: number;
  todayJobs: number;
  weekEarnings: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function toDate(val: unknown): Date {
  if (!val) return new Date(0);
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val as string);
}

const COUNTDOWN_SECONDS = 30;

// ─── Component ────────────────────────────────────────────────────────────────
export default function WasherHome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stats, setStats] = useState<EarningStat>({ todayEarnings: 0, todayJobs: 0, weekEarnings: 0 });
  const [recentJobs, setRecentJobs] = useState<Booking[]>([]);
  const [incomingJob, setIncomingJob] = useState<IncomingJob | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const watcherRef = useRef<number | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef(currentLocation);
  locationRef.current = currentLocation;

  // ── Load washer online status from Firestore on mount ─────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'washers', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.isOnline === 'boolean') setIsOnline(data.isOnline);
        if (data.currentLocation) setCurrentLocation(data.currentLocation);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // ── Earnings stats ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'bookings'),
      where('washerId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('completedAt', 'desc'),
      limit(50),
    );
    const unsub = onSnapshot(q, (snap) => {
      let todayEarnings = 0;
      let todayJobs = 0;
      let weekEarnings = 0;
      const recent: Booking[] = [];

      snap.docs.forEach((d, idx) => {
        const data = d.data();
        const completedAt = toDate(data.completedAt);
        const amount = data.pricing?.total ?? 0;

        if (completedAt >= startOfDay) { todayEarnings += amount; todayJobs++; }
        if (completedAt >= startOfWeek) weekEarnings += amount;
        if (idx < 5) recent.push({ id: d.id, ...data } as Booking);
      });

      setStats({ todayEarnings, todayJobs, weekEarnings });
      setRecentJobs(recent);
    });
    return () => unsub();
  }, [user?.uid]);

  // ── Incoming job listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid || !isOnline) return;

    const q = query(
      collection(db, 'bookings'),
      where('status', '==', 'pending'),
      where('washerId', '==', null),
    );

    const unsub = onSnapshot(q, (snap) => {
      const loc = locationRef.current;
      if (!loc) return;

      for (const d of snap.docs) {
        const booking = { id: d.id, ...d.data() } as Booking;
        if (skippedIds.has(booking.id)) continue;
        if (!booking.customerLocation) continue;

        const dist = haversineDistance(
          loc.lat, loc.lng,
          booking.customerLocation.lat, booking.customerLocation.lng,
        );

        if (dist <= 5) {
          setIncomingJob((prev) => {
            if (prev?.id === booking.id) return prev;
            setCountdown(COUNTDOWN_SECONDS);
            return { ...booking, distanceKm: dist };
          });
          break;
        }
      }
    });
    return () => unsub();
  }, [user?.uid, isOnline, skippedIds]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!incomingJob) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setSkippedIds((s) => new Set(s).add(incomingJob.id));
          setIncomingJob(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingJob?.id]);

  // ── Location tracking ─────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (!user?.uid) return;
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }

    watcherRef.current = navigator.geolocation.watchPosition(
      (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => toast.error(`Location: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );

    locationIntervalRef.current = setInterval(() => {
      const loc = locationRef.current;
      if (loc && user?.uid) {
        updateDoc(doc(db, 'washers', user.uid), {
          currentLocation: loc,
          lastLocationUpdate: serverTimestamp(),
          isOnline: true,
        }).catch(() => {});
      }
    }, 10000);
  }, [user?.uid]);

  const stopTracking = useCallback(async () => {
    if (watcherRef.current !== null) {
      navigator.geolocation.clearWatch(watcherRef.current);
      watcherRef.current = null;
    }
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    if (user?.uid) {
      await updateDoc(doc(db, 'washers', user.uid), { isOnline: false });
    }
  }, [user?.uid]);

  // ── Toggle online/offline ─────────────────────────────────────────────────
  const handleToggle = async () => {
    setToggling(true);
    try {
      if (!isOnline) {
        await updateDoc(doc(db, 'washers', user!.uid), {
          isOnline: true,
          lastLocationUpdate: serverTimestamp(),
        });
        setIsOnline(true);
        startTracking();
        toast.success("You're now Online 🟢", { icon: '🚗' });
      } else {
        await stopTracking();
        setIsOnline(false);
        setIncomingJob(null);
        toast("You're now Offline", { icon: '⚫' });
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  // ── Accept job ────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!incomingJob || !user?.uid || !profile) return;
    try {
      await updateDoc(doc(db, 'bookings', incomingJob.id), {
        washerId: user.uid,
        washerName: profile.name,
        status: 'accepted',
        'checklist.accepted': true,
      });
      toast.success('Job Accepted!', { icon: '✅' });
      setIncomingJob(null);
      navigate(`/washer/job/${incomingJob.id}`);
    } catch {
      toast.error('Failed to accept job');
    }
  };

  // ── Decline job ───────────────────────────────────────────────────────────
  const handleDecline = () => {
    if (!incomingJob) return;
    setSkippedIds((prev) => new Set(prev).add(incomingJob.id));
    setIncomingJob(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watcherRef.current !== null) navigator.geolocation.clearWatch(watcherRef.current);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const washerName = profile?.name ?? 'Washer';
  const rating = profile?.rating ?? 5.0;

  return (
    <div className="min-h-screen bg-dark-bg pb-24">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-dark-bg/90 backdrop-blur-md border-b border-dark-border px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {getInitials(washerName)}
            </div>
            <div>
              <p className="text-xs text-muted">Welcome back</p>
              <h1 className="text-text-light font-bold text-lg leading-tight">{washerName}</h1>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={11} className={s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted'} />
                ))}
                <span className="text-xs text-muted ml-1">{rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/washer/earnings')} className="glass-card p-2 rounded-xl text-muted hover:text-text-light transition-colors">
            <BarChart2 size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* ── Online / Offline Toggle ───────────────────────────────────── */}
        <motion.div layout className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-text-light font-bold text-lg">
                {isOnline ? "You're Online" : "You're Offline"}
              </h2>
              <p className="text-muted text-sm mt-0.5">
                {isOnline ? 'Accepting jobs in your area' : 'Toggle to start receiving jobs'}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${
                isOnline ? 'bg-accent text-white' : 'bg-dark-hover text-muted border border-dark-border'
              } disabled:opacity-60`}
            >
              <motion.div animate={{ rotate: toggling ? 360 : 0 }} transition={{ duration: 0.5 }}>
                {isOnline ? <Zap size={16} /> : <ZapOff size={16} />}
              </motion.div>
              {isOnline ? 'Online' : 'Offline'}
              {isOnline && (
                <span className="absolute -top-1 -right-1 w-3 h-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* ── Location Status Card ──────────────────────────────────────── */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isOnline ? 'bg-accent/15' : 'bg-dark-hover'}`}>
            <MapPin size={18} className={isOnline ? 'text-accent' : 'text-muted'} />
          </div>
          <div className="flex-1">
            {isOnline ? (
              <>
                <p className="text-text-light text-sm font-medium">Location is being shared</p>
                <p className="text-muted text-xs mt-0.5">
                  {currentLocation
                    ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
                    : 'Acquiring GPS signal…'}
                </p>
              </>
            ) : (
              <>
                <p className="text-muted text-sm font-medium">Go online to share location</p>
                <p className="text-muted/60 text-xs mt-0.5">Customers cannot find you while offline</p>
              </>
            )}
          </div>
          {isOnline && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
            </span>
          )}
        </div>

        {/* ── Earnings Card ─────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-accent" />
            <h2 className="text-text-light font-bold">Your Earnings</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-dark-bg/60 rounded-xl p-3 text-center">
              <p className="text-muted text-xs mb-1">Today</p>
              <p className="text-accent font-bold text-lg">{formatCurrency(stats.todayEarnings)}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Briefcase size={10} className="text-muted" />
                <span className="text-muted text-xs">{stats.todayJobs} jobs</span>
              </div>
            </div>
            <div className="bg-dark-bg/60 rounded-xl p-3 text-center">
              <p className="text-muted text-xs mb-1">This Week</p>
              <p className="text-primary font-bold text-lg">{formatCurrency(stats.weekEarnings)}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Calendar size={10} className="text-muted" />
                <span className="text-muted text-xs">7 days</span>
              </div>
            </div>
            <div className="bg-dark-bg/60 rounded-xl p-3 text-center">
              <p className="text-muted text-xs mb-1">Rating</p>
              <p className="text-yellow-400 font-bold text-lg">{rating.toFixed(1)}</p>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={8} className={s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted'} />
                ))}
              </div>
            </div>
          </div>
          <Link to="/washer/earnings" className="mt-4 flex items-center justify-center gap-2 text-primary text-sm font-medium hover:underline">
            <TrendingUp size={14} />
            View detailed earnings
          </Link>
        </div>

        {/* ── Recent Jobs ───────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-text-light font-bold">Recent Jobs</h2>
            <Link to="/washer/earnings" className="text-primary text-sm">See all</Link>
          </div>
          {recentJobs.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Car size={32} className="text-muted mx-auto mb-2" />
              <p className="text-muted text-sm">No completed jobs yet</p>
              <p className="text-muted/60 text-xs mt-1">Go online to start receiving jobs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div key={job.id} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-light text-sm font-medium truncate">{SERVICE_LABELS[job.serviceType]}</p>
                    <p className="text-muted text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDateTime(toDate(job.completedAt))}
                    </p>
                  </div>
                  <p className="text-accent font-bold text-sm flex-shrink-0">{formatCurrency(job.pricing?.total ?? 0)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Navigation ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-card/95 backdrop-blur-xl border-t border-dark-border flex items-stretch z-30">
        <Link to="/washer" className="bottom-tab active flex-1">
          <Car size={20} />
          <span>Home</span>
        </Link>
        <Link to="/washer/earnings" className="bottom-tab flex-1">
          <Wallet size={20} />
          <span>Earnings</span>
        </Link>
        <Link to="/washer/profile" className="bottom-tab flex-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
            {getInitials(washerName)}
          </div>
          <span>Profile</span>
        </Link>
      </nav>

      {/* ── Incoming Job Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {incomingJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-dark-bg/90 backdrop-blur-md flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="w-full max-w-md glass-card p-6 shadow-2xl border border-dark-border"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                </span>
                <p className="text-accent font-bold text-sm uppercase tracking-wide">New Job Request!</p>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {getInitials(incomingJob.customerName || 'Customer')}
                </div>
                <div>
                  <h3 className="text-text-light font-bold text-lg">{incomingJob.customerName}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={13} className="text-warning-500" />
                    <span className="text-warning-500 text-sm font-medium">{incomingJob.distanceKm.toFixed(1)} km away</span>
                  </div>
                  <p className="text-muted text-xs mt-0.5 truncate max-w-xs">
                    {incomingJob.customerLocation?.formattedAddress || 'Location shared'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-dark-bg/60 rounded-xl px-4 py-3 mb-5">
                <div className="flex items-center gap-2">
                  <Car size={16} className="text-primary" />
                  <span className="text-text-light text-sm font-medium">{SERVICE_LABELS[incomingJob.serviceType]}</span>
                  {incomingJob.addOns?.length > 0 && (
                    <span className="text-xs text-muted">+{incomingJob.addOns.length} add-on{incomingJob.addOns.length > 1 ? 's' : ''}</span>
                  )}
                </div>
                <span className="text-accent font-bold">{formatCurrency(incomingJob.pricing?.total ?? 0)}</span>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted text-xs">Auto-declining in</span>
                  <span className={`font-bold text-sm ${countdown <= 10 ? 'text-red-400' : 'text-text-light'}`}>{countdown}s</span>
                </div>
                <div className="h-2 bg-dark-hover rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${countdown <= 10 ? 'bg-red-500' : 'bg-accent'}`}
                    animate={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleDecline} className="btn-danger py-3.5 rounded-xl text-base font-bold">Decline</button>
                <button onClick={handleAccept} className="btn-accent py-3.5 rounded-xl text-base font-bold">Accept ✓</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
