import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Booking, WasherProfile } from '@/types';
import {
  Phone,
  Star,
  Car,
  X,
  CheckCircle2,
  Clock,
  Navigation,
  ChevronLeft,
  MapPin,
  Droplets,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChecklistStep {
  key: keyof Booking['checklist'] | 'confirmed';
  label: string;
  icon: React.ReactNode;
}

interface WasherInfo {
  name: string;
  rating: number;
  phone?: string;
  profilePic?: string;
  vehicleInfo?: WasherProfile['vehicleInfo'];
}

// ─── Checklist config ────────────────────────────────────────────────────────

const CHECKLIST_STEPS: ChecklistStep[] = [
  { key: 'confirmed', label: 'Booking Confirmed', icon: <CheckCircle2 size={24} /> },
  { key: 'accepted', label: 'Washer Accepted', icon: <CheckCircle2 size={24} /> },
  { key: 'enRoute', label: 'En Route to You', icon: <Car size={24} /> },
  { key: 'arrived', label: 'Arrived at Location', icon: <MapPin size={24} /> },
  { key: 'started', label: 'Wash in Progress', icon: <Droplets size={24} /> },
  { key: 'completed', label: 'Wash Completed', icon: <Sparkles size={24} /> },
];

// ─── Simulated Map ───────────────────────────────────────────────────────────

function SimulatedMap({ washerX }: { washerX: number }) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-dark-bg">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#162032] to-[#1E293B]" />

      {/* CSS grid lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="map-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#94A3B8" strokeWidth="0.6" />
          </pattern>
          <pattern id="road-h" width="96" height="96" patternUnits="userSpaceOnUse">
            <rect y="42" width="96" height="12" fill="#1E293B" opacity="0.6" />
          </pattern>
          <pattern id="road-v" width="96" height="96" patternUnits="userSpaceOnUse">
            <rect x="42" width="12" height="96" fill="#1E293B" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid)" />
        <rect width="100%" height="100%" fill="url(#road-h)" />
        <rect width="100%" height="100%" fill="url(#road-v)" />
      </svg>

      {/* Simulated city blocks */}
      {[
        { x: '10%', y: '15%', w: '18%', h: '14%' },
        { x: '32%', y: '8%', w: '14%', h: '22%' },
        { x: '54%', y: '20%', w: '20%', h: '16%' },
        { x: '10%', y: '55%', w: '22%', h: '18%' },
        { x: '38%', y: '58%', w: '16%', h: '20%' },
        { x: '60%', y: '52%', w: '18%', h: '22%' },
        { x: '80%', y: '10%', w: '14%', h: '30%' },
        { x: '78%', y: '60%', w: '16%', h: '24%' },
      ].map((block, i) => (
        <div
          key={i}
          className="absolute rounded-sm opacity-20"
          style={{
            left: block.x,
            top: block.y,
            width: block.w,
            height: block.h,
            background: 'linear-gradient(135deg, #1E293B, #273548)',
            border: '1px solid #334155',
          }}
        />
      ))}

      {/* Dashed route line (SVG) */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <line
          x1={`${washerX}%`}
          y1="47%"
          x2="71%"
          y2="47%"
          stroke="#1A73E8"
          strokeWidth="2.5"
          strokeDasharray="8 5"
          opacity="0.75"
        />
      </svg>

      {/* Washer pin — animated float + horizontal progress */}
      <motion.div
        className="absolute"
        style={{ left: `${washerX}%`, top: '41%', translateX: '-50%' }}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <div className="flex flex-col items-center">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-warning-500 opacity-30 animate-ping scale-150 block" />
            <div className="relative w-10 h-10 rounded-full bg-warning-500/20 border-2 border-warning-500 flex items-center justify-center text-xl shadow-glow-orange">
              <Car size={20} className="text-warning-500" />
            </div>
          </div>
          <div className="mt-1 px-2 py-0.5 rounded-full bg-warning-500 text-white text-[10px] font-bold whitespace-nowrap shadow-md">
            Washer
          </div>
        </div>
      </motion.div>

      {/* Customer home pin */}
      <motion.div
        className="absolute"
        style={{ left: '71%', top: '41%', translateX: '-50%' }}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut', delay: 0.3 }}
      >
        <div className="flex flex-col items-center">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-accent opacity-30 animate-ping scale-150 block" />
            <div className="relative w-10 h-10 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-xl shadow-glow-green">
              <MapPin size={20} className="text-accent" />
            </div>
          </div>
          <div className="mt-1 px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold whitespace-nowrap shadow-md">
            You
          </div>
        </div>
      </motion.div>

      {/* LIVE badge */}
      <div className="absolute top-4 left-16">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse block" />
          <span className="text-xs font-bold text-white tracking-wider">LIVE</span>
        </div>
      </div>

      {/* ETA badge */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-card/90 backdrop-blur-md border border-dark-border shadow-glass">
          <Clock className="w-4 h-4 text-warning-500" />
          <span className="text-sm font-bold text-text-light">ETA: ~8 min</span>
        </div>
      </div>
    </div>
  );
}

// ─── Completion overlay ──────────────────────────────────────────────────────

function CompletionOverlay({ onRate }: { onRate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-bg/95 backdrop-blur-lg px-6"
    >
      {/* Confetti dots */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * 360;
        const radius = 110;
        const colors = ['#1A73E8', '#00C853', '#FF6D00', '#a78bfa'];
        return (
          <motion.div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{
              background: colors[i % colors.length],
              top: '42%',
              left: '50%',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * (radius + (i % 3) * 20),
              y: Math.sin((angle * Math.PI) / 180) * (radius + (i % 3) * 20) - 60,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 1.3, delay: 0.2 + (i % 4) * 0.05, ease: 'easeOut' }}
          />
        );
      })}

      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
        className="relative mb-6"
      >
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-accent/30"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1 + i * 0.3, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.3, ease: 'easeOut' }}
          />
        ))}
        <div className="w-28 h-28 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center shadow-glow-green">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 260 }}
          >
            <CheckCircle2 className="w-14 h-14 text-accent" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center w-full max-w-xs"
      >
        <h2 className="text-3xl font-display font-bold text-text-light mb-2">
          Wash Complete!
        </h2>
        <p className="text-muted text-sm mb-8">
          Your car is squeaky clean and ready to roll.
        </p>
        <button
          onClick={onRate}
          className="btn-accent w-full flex items-center justify-center gap-2 mb-3"
        >
          <Star className="w-5 h-5" />
          Rate Your Experience
        </button>
        <p className="text-muted text-xs">Takes less than 10 seconds</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Timeline Step ───────────────────────────────────────────────────────────

function TimelineStep({
  step,
  isDone,
  isCurrent,
  isLast,
  timestamp,
}: {
  step: ChecklistStep;
  isDone: boolean;
  isCurrent: boolean;
  isLast: boolean;
  timestamp?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <motion.div
          animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 transition-all duration-500 ${
            isDone
              ? 'border-accent bg-accent/20'
              : isCurrent
              ? 'border-warning-500 bg-warning-500/20'
              : 'border-dark-border bg-dark-card/50'
          }`}
        >
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-accent" />
          ) : (
            <div className={isCurrent ? 'text-warning-500' : 'text-muted'}>{step.icon}</div>
          )}
        </motion.div>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 my-1 min-h-[20px] rounded-full transition-all duration-700 ${
              isDone ? 'bg-accent/60' : 'bg-dark-border'
            }`}
          />
        )}
      </div>

      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-semibold transition-colors duration-300 ${
              isDone ? 'text-text-light' : isCurrent ? 'text-warning-500' : 'text-muted'
            }`}
          >
            {step.label}
          </span>
          {isCurrent && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-500/15 border border-warning-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse block" />
              <span className="text-[10px] font-medium text-warning-500">Now</span>
            </span>
          )}
        </div>
        {(isCurrent || isDone) && timestamp && (
          <p className="text-xs text-muted mt-0.5">{timestamp}</p>
        )}
      </div>
    </div>
  );
}

// ─── Map View (Leaflet) ───────────────────────────────────────────────────────────────

const customerIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div class="w-10 h-10 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center shadow-lg"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const washerIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div class="w-10 h-10 rounded-full bg-warning-500/20 border-2 border-warning-500 flex items-center justify-center shadow-lg"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function LiveMapView({
  customerLocation,
  washerLocation,
}: {
  customerLocation: Booking['customerLocation'];
  washerLocation: { lat: number; lng: number } | null;
}) {
  const center = { lat: customerLocation.lat, lng: customerLocation.lng };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={14} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <Marker position={[center.lat, center.lng]} icon={customerIcon} />
        {washerLocation && <Marker position={[washerLocation.lat, washerLocation.lng]} icon={washerIcon} />}
      </MapContainer>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function LiveTracking() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { profile: _profile } = useAuth(); // available for future auth guards

  const [booking, setBooking] = useState<Booking | null>(null);
  const [washerInfo, setWasherInfo] = useState<WasherInfo | null>(null);
  const [washerLocation, setWasherLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [washerX, setWasherX] = useState(20);

  const washerXRef = useRef(20);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Booking real-time listener ───────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;

    const unsub = onSnapshot(
      doc(db, 'bookings', bookingId),
      (snap) => {
        if (!snap.exists()) {
          setLoading(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() } as Booking;
        setBooking(data);
        setLoading(false);
        if (data.status === 'completed') {
          setTimeout(() => setShowCompletion(true), 800);
        }
      },
      (err) => {
        console.error('Booking listener:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [bookingId]);

  // ── Washer profile + location listener ────────────────────────────────
  useEffect(() => {
    if (!booking?.washerId) return;

    const unsub = onSnapshot(doc(db, 'washers', booking.washerId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as WasherProfile;
      setWasherInfo({
        name: data.name,
        rating: data.rating,
        phone: data.phone,
        profilePic: data.profilePic,
        vehicleInfo: data.vehicleInfo,
      });
      if (data.currentLocation) setWasherLocation(data.currentLocation);
    });

    return () => unsub();
  }, [booking?.washerId]);

  // ── Simulated washer approach ────────────────────────────────────────────
  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current);

    const status = booking?.status;
    if (status === 'accepted' || status === 'enRoute') {
      animRef.current = setInterval(() => {
        washerXRef.current = Math.min(washerXRef.current + 0.06, 58);
        setWasherX(washerXRef.current);
        if (washerXRef.current >= 58) clearInterval(animRef.current!);
      }, 80);
    } else if (status === 'arrived' || status === 'inProgress') {
      setWasherX(60);
    } else if (status === 'completed') {
      setWasherX(71);
    }

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [booking?.status]);

  // ── Cancel booking ───────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!bookingId || !booking) return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: 'customer',
      });
      toast.success('Booking cancelled');
      navigate(-1);
    } catch {
      toast.error('Failed to cancel. Try again.');
    } finally {
      setCancelling(false);
    }
  };

  // ── Step state helper ────────────────────────────────────────────────────
  const getStepState = (step: ChecklistStep) => {
    if (!booking) return { isDone: false, isCurrent: false };

    if (step.key === 'confirmed') {
      return { isDone: true, isCurrent: booking.status === 'pending' };
    }

    const checklist = booking.checklist;
    const stepOrder: Array<ChecklistStep['key']> = [
      'confirmed', 'accepted', 'enRoute', 'arrived', 'started', 'completed',
    ];
    const statusMap: Record<string, ChecklistStep['key']> = {
      accepted: 'accepted',
      enRoute: 'enRoute',
      arrived: 'arrived',
      inProgress: 'started',
      completed: 'completed',
    };
    const currentKey = statusMap[booking.status] ?? null;
    const stepIdx = stepOrder.indexOf(step.key);
    const currentIdx = currentKey ? stepOrder.indexOf(currentKey) : 1;

    const checklistKey = step.key as keyof Booking['checklist'];
    const isDone = !!checklist?.[checklistKey];
    const isCurrent = stepIdx === currentIdx && !isDone;

    return { isDone, isCurrent };
  };

  const acceptedTime = booking?.checklist?.accepted
    ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : undefined;

  const canCancel = !!booking && ['accepted', 'enRoute'].includes(booking.status);
  const googleMapsKey = (import.meta as any).env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-dark-bg">
        <div className="shimmer" style={{ height: '60%' }} />
        <div className="bg-dark-card p-5 space-y-4" style={{ height: '40%' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-4 rounded-lg shimmer ${i === 1 ? 'w-1/2' : i === 2 ? 'w-1/3' : 'w-2/3'}`} />
          ))}
        </div>
      </div>
    );
  }

  // ── No booking ───────────────────────────────────────────────────────────
  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-dark-bg px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center mb-4">
          <Car className="w-8 h-8 text-muted" />
        </div>
        <h2 className="text-xl font-display font-bold text-text-light mb-2">Booking Not Found</h2>
        <p className="text-muted text-sm mb-6">We couldn't locate this booking.</p>
        <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-dark-bg overflow-hidden">

      {/* ── MAP AREA — top 60% ─────────────────────────────────────────── */}
      <div className="relative flex-shrink-0" style={{ height: '60%' }}>
        {booking.customerLocation ? (
          <LiveMapView
            customerLocation={booking.customerLocation}
            washerLocation={washerLocation}
          />
        ) : (
          <SimulatedMap washerX={washerX} />
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-full bg-dark-card/80 backdrop-blur-sm border border-dark-border text-muted hover:text-text-light transition-colors z-10"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* ── BOTTOM SHEET — bottom 40% ──────────────────────────────────── */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.1 }}
        className="flex flex-col bg-dark-card/90 backdrop-blur-md border-t border-dark-border rounded-t-3xl"
        style={{ height: '40%' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-dark-border" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-1 pb-6 space-y-4">

          {/* ── Washer card ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {washerInfo?.profilePic ? (
              <img
                src={washerInfo.profilePic}
                alt={washerInfo.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/40 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-display font-bold text-primary">
                  {(washerInfo?.name ?? booking.washerName ?? 'W').charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-text-light text-base truncate">
                {washerInfo?.name ?? booking.washerName ?? 'Your Washer'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-semibold text-text-light">
                  {(washerInfo?.rating ?? 4.8).toFixed(1)}
                </span>
                <span className="text-muted text-xs">· Verified Pro</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Car className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                <span className="text-xs text-muted truncate">
                  {washerInfo?.vehicleInfo
                    ? `${washerInfo.vehicleInfo.make} – ${washerInfo.vehicleInfo.color}`
                    : 'Honda Activa – Blue'}
                </span>
              </div>
            </div>

            {/* Call button */}
            <a
              href={`tel:${washerInfo?.phone ?? ''}`}
              className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center flex-shrink-0 hover:bg-accent/25 active:scale-95 transition-all"
              aria-label="Call washer"
            >
              <Phone className="w-5 h-5 text-accent" />
            </a>
          </div>

          {/* Divider */}
          <div className="h-px bg-dark-border" />

          {/* ── Status Timeline ──────────────────────────────────────────── */}
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">
              Live Status
            </p>
            {CHECKLIST_STEPS.map((step, idx) => {
              const { isDone, isCurrent } = getStepState(step);
              return (
                <TimelineStep
                  key={step.key}
                  step={step}
                  isDone={isDone}
                  isCurrent={isCurrent}
                  isLast={idx === CHECKLIST_STEPS.length - 1}
                  timestamp={step.key === 'accepted' ? acceptedTime : undefined}
                />
              );
            })}
          </div>

          {/* ── Cancel button ────────────────────────────────────────────── */}
          <AnimatePresence>
            {canCancel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-red-600/40 bg-red-600/10 text-red-400 font-semibold text-sm transition-all hover:bg-red-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  {cancelling ? 'Cancelling…' : 'Cancel Booking'}
                </button>
                <p className="text-center text-muted text-xs mt-1.5">
                  Free cancellation until washer arrives
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Completion overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showCompletion && (
          <CompletionOverlay onRate={() => navigate(`/customer/rate/${bookingId}`)} />
        )}
      </AnimatePresence>
    </div>
  );
}
