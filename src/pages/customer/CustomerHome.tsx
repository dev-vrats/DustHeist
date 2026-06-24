import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MapPin, Car, Sparkles, Droplets, Home, History,
  User, MessageCircle, Navigation, ChevronRight,
  Zap, Shield, Star, Bell, Plus, X,
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, orderBy, limit,
} from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase';
import { StatusDot } from '@/components/StatusDot';
import { Booking, CustomerProfile, SERVICE_PRICES } from '@/types';
import { formatCurrency, getStatusLabel } from '@/lib/utils';

const SERVICES = [
  {
    id: 'basic' as const,
    label: 'Basic Exterior',
    price: SERVICE_PRICES.basic,
    duration: '20 min',
    icon: Droplets,
    gradient: 'from-blue-600 to-cyan-500',
    glow: 'shadow-blue-500/30',
    desc: 'Rinse + hand wash',
  },
  {
    id: 'premium' as const,
    label: 'Premium Clean',
    price: SERVICE_PRICES.premium,
    duration: '45 min',
    icon: Sparkles,
    gradient: 'from-violet-600 to-purple-500',
    glow: 'shadow-purple-500/30',
    desc: 'Wash + wax + interior',
  },
  {
    id: 'deep' as const,
    label: 'Deep Clean',
    price: SERVICE_PRICES.deep,
    duration: '90 min',
    icon: Shield,
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-orange-500/30',
    desc: 'Full detail + ceramic',
  },
];

// Remove fake washers array
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const customerIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div class="w-4 h-4 rounded-full bg-primary border-2 border-white shadow-lg"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const washerIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div class="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-emerald-600 border-2 border-white/30 flex items-center justify-center shadow-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const TABS = [
  { id: 'home', label: 'Home', icon: Home, path: '/customer' },
  { id: 'bookings', label: 'Bookings', icon: History, path: '/customer/history' },
  { id: 'profile', label: 'Profile', icon: User, path: '/customer/profile' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, path: '#' },
];

function bookingStatusToDot(status: string): 'pending' | 'active' | 'busy' | 'done' {
  if (status === 'pending') return 'pending';
  if (status === 'completed') return 'done';
  if (['accepted', 'enRoute', 'arrived', 'inProgress'].includes(status)) return 'active';
  return 'pending';
}

export default function CustomerHome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [city, setCity] = useState('Detecting…');
  const [address, setAddress] = useState('Fetching your location…');
  const [customerLocation, setCustomerLocation] = useState<{lat: number; lng: number} | null>(null);
  const [extraDetails, setExtraDetails] = useState('');
  const [showDetailsInput, setShowDetailsInput] = useState(false);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [nearbyWashers, setNearbyWashers] = useState<any[]>([]);
  const [selectedWasher, setSelectedWasher] = useState<string | null>(null);
  const detailsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCity('India');
      setAddress('Location unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCustomerLocation({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const a = data.address || {};
          setCity(a.city || a.town || a.village || a.county || 'India');
          setAddress(
            [a.road, a.suburb, a.city || a.town]
              .filter(Boolean)
              .join(', ') || data.display_name?.split(',').slice(0, 2).join(', ')
          );
        } catch {
          setCity('India');
          setAddress('Unable to resolve address');
        }
      },
      (error) => {
        if (error.code === 1) {
          setCity('Location Denied');
          setAddress('Location permission denied');
        } else {
          setCity('Locating failed');
          setAddress('Could not determine location. Check signal.');
        }
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid),
      where('status', 'not-in', ['completed', 'cancelled']),
      orderBy('status'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        completedAt: d.data().completedAt?.toDate?.() ?? undefined,
        scheduledTime:
          d.data().scheduledTime === 'asap'
            ? 'asap'
            : d.data().scheduledTime?.toDate?.() ?? 'asap',
      })) as Booking[];
      setActiveBookings(docs);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (showDetailsInput) setTimeout(() => detailsRef.current?.focus(), 50);
  }, [showDetailsInput]);

  useEffect(() => {
    if (!customerLocation) return;
    const q = query(collection(db, 'washers'), where('isOnline', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const washers = snap.docs.map(doc => {
        const data = doc.data();
        const dist = data.currentLocation ? getDistance(customerLocation.lat, customerLocation.lng, data.currentLocation.lat, data.currentLocation.lng) : 999;
        return {
          id: doc.id,
          name: data.name || 'Washer',
          rating: data.rating || 4.5,
          lat: data.currentLocation?.lat,
          lng: data.currentLocation?.lng,
          dist: dist.toFixed(1)
        };
      }).filter(w => w.lat && w.lng && parseFloat(w.dist) < 50); // within 50km
      setNearbyWashers(washers.sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist)));
    });
    return unsub;
  }, [customerLocation]);

  const customerProfile = profile as CustomerProfile | null;
  const sub = customerProfile?.activeSubscription;
  const firstName = profile?.name?.split(' ')[0] ?? 'there';
  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <div className="flex-1 overflow-y-auto pb-24">

        {/* TOP BAR */}
        <div className="sticky top-0 z-30 bg-dark-bg/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <motion.div whileTap={{ scale: 0.95 }} onClick={() => navigate('/customer/profile')} className="cursor-pointer">
                {profile?.profilePic ? (
                  <img src={profile.profilePic} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/40" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center ring-2 ring-primary/40">
                    <span className="text-xs font-bold text-white">{initials}</span>
                  </div>
                )}
              </motion.div>
              <div>
                <p className="text-xs text-muted">{getGreeting()}</p>
                <p className="text-sm font-semibold text-text-light">Hey {firstName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-muted">
                <MapPin size={12} className="text-primary" />
                <span className="max-w-[80px] truncate">{city}</span>
              </div>
              <motion.button onClick={() => toast('No new notifications', { icon: '🔔' })} whileTap={{ scale: 0.9 }} className="w-9 h-9 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center relative">
                <Bell size={16} className="text-muted" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
              </motion.button>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 max-w-lg mx-auto space-y-5">

          {/* LOCATION CARD */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card overflow-hidden">
            <div className="relative h-28 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 overflow-hidden">
              <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 320 112">
                <line x1="0" y1="56" x2="320" y2="56" stroke="#1A73E8" strokeWidth="3" />
                <line x1="160" y1="0" x2="160" y2="112" stroke="#1A73E8" strokeWidth="2" />
                <line x1="80" y1="0" x2="80" y2="112" stroke="#64748b" strokeWidth="1" />
                <line x1="240" y1="0" x2="240" y2="112" stroke="#64748b" strokeWidth="1" />
                <line x1="0" y1="28" x2="320" y2="28" stroke="#64748b" strokeWidth="1" />
                <line x1="0" y1="84" x2="320" y2="84" stroke="#64748b" strokeWidth="1" />
                <rect x="60" y="36" width="40" height="16" fill="#334155" rx="3" />
                <rect x="140" y="60" width="50" height="20" fill="#334155" rx="3" />
                <rect x="220" y="32" width="35" height="18" fill="#334155" rx="3" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-dark-card/60 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/40 flex items-center justify-center shadow-lg">
                    <MapPin size={18} className="text-primary" />
                  </div>
                  <div className="w-2 h-2 rounded-full bg-primary mt-0.5" />
                </motion.div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-primary/20 animate-pulse" />
              </div>
              <div className="absolute top-2 left-2 bg-dark-card/80 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5">
                <Navigation size={10} className="text-accent" />
                <span className="text-xs text-accent font-medium">Live</span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Your location</p>
              <p className="text-sm font-medium text-text-light leading-tight">{address}</p>
              <AnimatePresence>
                {showDetailsInput ? (
                  <motion.div key="input" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                    <div className="flex gap-2">
                      <input ref={detailsRef} className="input-field text-xs py-2 flex-1" placeholder="Flat no., landmark, gate…" value={extraDetails} onChange={(e) => setExtraDetails(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setShowDetailsInput(false)} />
                      <button onClick={() => setShowDetailsInput(false)} className="w-9 h-9 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center text-muted"><X size={14} /></button>
                    </div>
                    {extraDetails && <p className="text-xs text-accent mt-1.5">Details saved</p>}
                  </motion.div>
                ) : (
                  <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowDetailsInput(true)} className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium">
                    <Plus size={12} />Add more details
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ACTIVE BOOKING BANNER */}
          <AnimatePresence>
            {activeBookings.length > 0 && (
              <motion.div key="active-banner" initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-blue-600/10 to-violet-600/20 border border-primary/30 p-4">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                {activeBookings.map((bk) => (
                  <div key={bk.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <StatusDot status={bookingStatusToDot(bk.status)} size="lg" />
                        <div>
                          <p className="text-xs text-muted">{bk.washerName ? `${bk.washerName} is on the way` : 'Finding a washer…'}</p>
                          <p className="text-sm font-semibold text-text-light capitalize">{getStatusLabel(bk.status)}</p>
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate(`/customer/track/${bk.id}`)} className="flex items-center gap-1.5 btn-primary text-xs px-3 py-1.5">
                        <Navigation size={12} />Track Live
                      </motion.button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="status-badge bg-primary/10 text-primary capitalize">{bk.serviceType}</span>
                      <span className="text-xs text-muted">•</span>
                      <span className="text-xs text-muted">₹{bk.pricing.total}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* QUICK BOOK */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-text-light">Quick Book</h2>
              <span className="text-xs text-muted">Doorstep in 30 min</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {SERVICES.map((svc, i) => (
                <motion.button key={svc.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/customer/book', { state: { serviceType: svc.id } })} className={`relative flex-shrink-0 w-44 rounded-2xl overflow-hidden shadow-xl ${svc.glow} shadow-lg`}>
                  <div className={`bg-gradient-to-br ${svc.gradient} p-4 pb-5`}>
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3"><svc.icon size={20} className="text-white" /></div>
                    <p className="text-white font-bold text-sm leading-tight">{svc.label}</p>
                    <p className="text-white/70 text-xs mt-0.5">{svc.desc}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-white font-extrabold text-lg">{formatCurrency(svc.price)}</p>
                      <span className="text-white/60 text-xs">{svc.duration}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2"><ChevronRight size={14} className="text-white/50" /></div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* NEARBY WASHERS */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-base font-semibold text-text-light">Nearby Washers</h2>
              <div className="flex items-center gap-1.5">
                <StatusDot status="online" size="sm" />
                <span className="text-xs text-accent font-medium">{nearbyWashers.length} online</span>
              </div>
            </div>
            <div className="relative mx-4 mb-4 h-48 rounded-xl overflow-hidden bg-slate-900 border border-dark-border z-0">
              {customerLocation ? (
                <MapContainer 
                  center={[customerLocation.lat, customerLocation.lng]} 
                  zoom={13} 
                  style={{ width: '100%', height: '100%' }}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon} />
                  {nearbyWashers.map(w => (
                    <Marker 
                      key={w.id} 
                      position={[w.lat, w.lng]} 
                      icon={washerIcon}
                      eventHandlers={{ click: () => setSelectedWasher(selectedWasher === w.id ? null : w.id) }}
                    />
                  ))}
                </MapContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted">
                  <Navigation className="w-8 h-8 animate-spin text-primary/50 mb-2" />
                  <span className="text-xs">Locating...</span>
                </div>
              )}
              
              <AnimatePresence>
                {selectedWasher && (() => {
                  const w = nearbyWashers.find((x) => x.id === selectedWasher);
                  if (!w) return null;
                  return (
                    <motion.div key="card" initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} className="absolute bottom-3 left-3 right-3 bg-dark-card/95 backdrop-blur-md rounded-xl border border-dark-border p-3 flex items-center justify-between z-[1000]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{w.name.split(' ').map((n: string) => n[0]).join('')}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-text-light">{w.name}</p>
                          <p className="text-xs text-muted flex items-center gap-1"><Star size={9} className="text-yellow-400 fill-yellow-400" />{w.rating} · {w.dist} km away</p>
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/customer/book')} className="btn-accent text-xs px-3 py-1.5">Book</motion.button>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* SUBSCRIPTION */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {sub ? (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Zap size={16} className="text-accent" /></div>
                    <div>
                      <p className="text-xs text-muted">My Subscription</p>
                      <p className="text-sm font-semibold text-text-light capitalize">{sub.serviceType} — {sub.planType}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/customer/book')} className="btn-accent text-xs px-3 py-1.5">Upgrade</button>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1.5"><span>{sub.remainingWashes} washes left</span><span>{sub.totalWashes} total</span></div>
                  <div className="h-2 rounded-full bg-dark-hover overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(sub.remainingWashes / sub.totalWashes) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400" />
                  </div>
                </div>
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/customer/book')} className="w-full rounded-2xl overflow-hidden bg-gradient-to-br from-accent/20 to-emerald-600/10 border border-accent/20 p-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center"><Zap size={20} className="text-accent" /></div>
                    <div>
                      <p className="text-sm font-semibold text-text-light">Get a Subscription</p>
                      <p className="text-xs text-muted">Save up to 15% on every wash</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-accent" />
                </div>
                <div className="mt-3 flex gap-2">
                  {['4 Washes', '8 Washes'].map((p) => (<span key={p} className="text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full font-medium">{p}</span>))}
                </div>
              </motion.button>
            )}
          </motion.div>

          {/* HISTORY SHORTCUT */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><History size={16} className="text-muted" /><span className="text-sm font-medium text-text-light">Booking History</span></div>
              <Link to="/customer/history" className="flex items-center gap-1 text-xs text-primary font-medium">View all <ChevronRight size={12} /></Link>
            </div>
            {activeBookings.length === 0 && <p className="text-xs text-muted mt-2">No active bookings. Book your first wash!</p>}
          </motion.div>

        </div>
      </div>

      {/* BOTTOM TAB NAV */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-dark-card/95 backdrop-blur-xl border-t border-dark-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {TABS.map((tab) => {
            const isActive = window.location.pathname === tab.path;
            return (
              <Link key={tab.id} to={tab.path} className={`bottom-tab ${isActive ? 'active' : ''}`}>
                <motion.div whileTap={{ scale: 0.85 }}>
                  <tab.icon size={20} className={isActive ? 'text-primary' : 'text-muted'} strokeWidth={isActive ? 2.5 : 1.8} />
                </motion.div>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
