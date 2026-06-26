import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MapPin, Car, CheckCircle, Circle, Navigation, Camera,
  MessageSquare, Send, AlertTriangle, ChevronLeft, Upload,
  Package, Clock, Shield, Phone, CheckCircle2
} from 'lucide-react';
import {
  doc, collection, query, orderBy, onSnapshot,
  updateDoc, addDoc, serverTimestamp, getDoc, Timestamp,
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { Booking, Vehicle, SERVICE_LABELS, ADDON_LABELS } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  status: 'sent' | 'seen';
  createdAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDate(val: unknown): Date {
  if (!val) return new Date(0);
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val as string);
}

const STEPS = [
  { key: 'accepted',  label: 'Job Accepted',    icon: CheckCircle },
  { key: 'enRoute',   label: "I'm En Route",     icon: Navigation },
  { key: 'arrived',   label: "I've Arrived",     icon: MapPin },
  { key: 'inProgress',label: 'Start Wash',       icon: Car },
  { key: 'completed', label: 'Mark Complete',    icon: CheckCircle },
] as const;

type StepKey = typeof STEPS[number]['key'];

const STATUS_ORDER: StepKey[] = ['accepted', 'enRoute', 'arrived', 'inProgress', 'completed'];

function stepIndex(status: string) {
  return STATUS_ORDER.indexOf(status as StepKey);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ActiveJob() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{name: string; profilePic: string; phone: string} | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch booking ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    const unsub = onSnapshot(doc(db, 'bookings', bookingId), async (snap) => {
      if (!snap.exists()) { navigate('/washer'); return; }
      const data = { id: snap.id, ...snap.data() } as Booking;
      setBooking(data);
      setLoadingBooking(false);

      // Fetch customer and vehicle info
      if (data.customerId) {
        try {
          const custSnap = await getDoc(doc(db, 'customers', data.customerId));
          if (custSnap.exists()) {
            const custData = custSnap.data();
            setCustomerInfo({
              name: custData.name || 'Customer',
              profilePic: custData.profilePic || '',
              phone: custData.phone || ''
            });

            if (data.vehicleId) {
              const vehicles: Vehicle[] = custData.vehicles || [];
              const v = vehicles.find((x) => x.id === data.vehicleId);
              if (v) setVehicle(v);
            }
          }
        } catch { /* ignore */ }
      }
    });
    return () => unsub();
  }, [bookingId, navigate]);

  // ── Chat listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    const q = query(
      collection(db, 'chats', bookingId, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const newMsgs = snap.docs.map((d) => ({
        id: d.id,
        senderId: d.data().senderId,
        senderName: d.data().senderName,
        text: d.data().text,
        status: d.data().status || 'sent',
        createdAt: toDate(d.data().createdAt),
      }));
      setMessages(newMsgs);

      // Mark incoming messages as seen if chat is open
      if (showChat) {
        newMsgs.forEach((m) => {
          if (m.senderId !== user?.uid && m.status !== 'seen') {
            updateDoc(doc(db, 'chats', bookingId, 'messages', m.id), { status: 'seen' }).catch(console.error);
          }
        });
      }
    });
    return () => unsub();
  }, [bookingId, showChat, user?.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Location Tracker (Live Tracking) ───────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation || !user?.uid) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateDoc(doc(db, 'washers', user.uid), {
          currentLocation: { lat: latitude, lng: longitude },
          lastActive: new Date()
        }).catch(() => {}); // silent fail if offline
      },
      (err) => console.error('Location tracking error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.uid]);

  // ── Advance status ────────────────────────────────────────────────────────
  const handleAdvance = async (step: StepKey) => {
    if (!bookingId || !booking) return;
    if (step === 'completed') { setShowPhotoModal(true); return; }

    setAdvancing(true);
    try {
      const updates: Record<string, unknown> = {
        status: step,
        [`checklist.${step === 'inProgress' ? 'started' : step}`]: true,
      };
      if (step === 'enRoute') updates['checklist.enRoute'] = true;
      if (step === 'arrived') updates['checklist.arrived'] = true;
      if (step === 'inProgress') updates['checklist.started'] = true;
      await updateDoc(doc(db, 'bookings', bookingId), updates);
      toast.success(STEPS.find((s) => s.key === step)?.label + ' ✓');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setAdvancing(false);
    }
  };

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !bookingId) return;
    setUploading(true);
    setUploadProgress(10);
    
    // Fake progress interval since fetch doesn't provide upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => prev < 90 ? prev + 15 : prev);
    }, 500);

    try {
      const formData = new FormData();
      formData.append('image', photoFile);
      
      const response = await fetch('https://api.imgbb.com/1/upload?key=f7a3c9fd52dcbbb94a18325f4f29f76d', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('ImgBB upload failed');
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const url = data.data.url;
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'completed',
        'checklist.completed': true,
        afterPhoto: url,
        completedAt: serverTimestamp(),
      });

      // Increment total washes for the washer
      if (user?.uid) {
        const { increment } = await import('firebase/firestore');
        await updateDoc(doc(db, 'washers', user.uid), {
          jobsCompleted: increment(1)
        });
      }

      setShowPhotoModal(false);
      setShowSuccessAnimation(true); // new state for green tick animation
      
      // Delay QR modal if needed
      setTimeout(() => {
        if (booking?.pricing?.paymentMethod === 'after_wash') {
          setShowQRModal(true);
        }
      }, 3000);
    } catch (err) {
      console.error('Upload Error:', err);
      toast.error('Upload failed. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // ── Chat send ─────────────────────────────────────────────────────────────
  const handleSendMsg = async () => {
    if (!chatText.trim() || !bookingId || !user?.uid) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'chats', bookingId, 'messages'), {
        senderId: user.uid,
        senderName: profile?.name ?? 'Washer',
        text: chatText.trim(),
        createdAt: serverTimestamp(),
        status: 'sent',
      });
      
      // Increment unread count for customer
      if (booking?.customerId) {
        const { increment } = await import('firebase/firestore');
        updateDoc(doc(db, 'customers', booking.customerId), {
          unreadCount: increment(1)
        }).catch(console.error);
      }

      setChatText('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  // ── SOS ───────────────────────────────────────────────────────────────────
  const handleSOS = async () => {
    if (!user?.uid) return;
    try {
      await addDoc(collection(db, 'sos'), {
        washerId: user.uid,
        washerName: profile?.name ?? 'Unknown',
        bookingId: bookingId ?? null,
        createdAt: serverTimestamp(),
        resolved: false,
      });
      toast('SOS sent to admin! Help is on the way.', { icon: '🚨', duration: 5000 });
    } catch {
      toast.error('Failed to send SOS');
    }
  };

  const googleMapsUrl = booking?.customerLocation
    ? `https://maps.google.com/?q=${booking.customerLocation.lat},${booking.customerLocation.lng}`
    : 'https://maps.google.com';

  if (loadingBooking) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted text-sm">Loading job details…</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted">Booking not found</p>
          <button onClick={() => navigate('/washer')} className="btn-primary mt-4">Go Home</button>
        </div>
      </div>
    );
  }

  const currentStepIdx = stepIndex(booking.status);
  const isCompleted = booking.status === 'completed';

  return (
    <div className="min-h-screen bg-dark-bg pb-28">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-dark-bg/90 backdrop-blur-md border-b border-dark-border px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/washer')} className="p-2 rounded-xl bg-dark-card text-muted hover:text-text-light transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-text-light font-bold text-lg">Active Job</h1>
            <p className="text-muted text-xs">#{bookingId?.slice(-6).toUpperCase()}</p>
          </div>
          {isCompleted ? (
            <span className="status-badge bg-accent/10 text-accent">Completed</span>
          ) : (
            <span className="status-badge bg-primary/10 text-primary">{booking.status}</span>
          )}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* ── Customer Info Card ────────────────────────────────────────── */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            {customerInfo?.profilePic ? (
              <img
                src={customerInfo.profilePic}
                alt={customerInfo.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/40 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border-2 border-primary/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-display font-bold text-primary">
                  {(customerInfo?.name ?? 'C').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted font-medium mb-0.5 uppercase tracking-wide">Customer</p>
              <p className="font-display font-bold text-text-light text-base truncate">
                {customerInfo?.name ?? 'Loading...'}
              </p>
            </div>
            {customerInfo?.phone && (
              <a
                href={`tel:${customerInfo.phone}`}
                className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center flex-shrink-0 hover:bg-accent/25 active:scale-95 transition-all"
                aria-label="Call customer"
              >
                <Phone className="w-5 h-5 text-accent" />
              </a>
            )}
          </div>
        </div>

        {/* ── Customer Address + Navigate ──────────────────────────────── */}
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-warning-500/10 flex-shrink-0 mt-0.5">
              <MapPin size={18} className="text-warning-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-muted text-xs uppercase tracking-wide mb-0.5">Customer Location</p>
              <p className="text-text-light font-medium text-sm leading-snug">
                {booking.customerLocation?.formattedAddress || 'Address not available'}
              </p>
              {booking.customerLocation?.extraDetails && (
                <p className="text-muted text-xs mt-1">{booking.customerLocation.extraDetails}</p>
              )}
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-2 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors flex-shrink-0"
            >
              <Navigation size={14} />
              Navigate
            </a>
          </div>
        </div>

        {/* ── Car Details Card ─────────────────────────────────────────── */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Car size={16} className="text-primary" />
            <h2 className="text-text-light font-semibold text-sm">Vehicle Details</h2>
          </div>
          {vehicle ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Make', value: vehicle.make },
                { label: 'Model', value: vehicle.model },
                { label: 'Color', value: vehicle.color },
                { label: 'Plate', value: vehicle.plate },
              ].map(({ label, value }) => (
                <div key={label} className="bg-dark-bg/60 rounded-xl p-3">
                  <p className="text-muted text-xs">{label}</p>
                  <p className="text-text-light font-semibold text-sm mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">Vehicle info not available</p>
          )}
        </div>

        {/* ── Service Details ──────────────────────────────────────────── */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-accent" />
            <h2 className="text-text-light font-semibold text-sm">Service</h2>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-light font-medium">{SERVICE_LABELS[booking.serviceType]}</span>
            <span className="text-muted text-sm">{formatCurrency(booking.pricing?.base ?? 0)}</span>
          </div>
          {booking.addOns?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-dark-border">
              {booking.addOns.map((addon) => (
                <div key={addon} className="flex items-center justify-between">
                  <span className="text-muted text-sm">
                    + {ADDON_LABELS[addon as keyof typeof ADDON_LABELS] ?? addon}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-dark-border">
            <span className="text-text-light font-bold">Total</span>
            <span className="text-accent font-bold text-lg">{formatCurrency(booking.pricing?.total ?? 0)}</span>
          </div>
        </div>

        {/* ── Job Checklist Stepper ────────────────────────────────────── */}
        <div className="glass-card p-4">
          <h2 className="text-text-light font-bold mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-accent" />
            Job Progress
          </h2>
          <div className="space-y-4">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStepIdx;
              const isNext = idx === currentStepIdx + 1;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    done ? 'bg-accent text-white' : isNext ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-dark-hover text-muted'
                  }`}>
                    {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <p className={`text-sm font-medium ${done ? 'text-accent' : isNext ? 'text-text-light' : 'text-muted'}`}>
                      {step.label}
                    </p>
                    {isNext && !isCompleted && (
                      <button
                        onClick={() => handleAdvance(step.key)}
                        disabled={advancing}
                        className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          step.key === 'completed'
                            ? 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30'
                            : 'bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25'
                        } disabled:opacity-50`}
                      >
                        {step.key === 'completed' ? (
                          <><Camera size={14} /> Upload Photo & Complete</>
                        ) : (
                          <><Circle size={14} /> {step.label}</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Connector line */}
                  {idx < STEPS.length - 1 && (
                    <div className={`absolute ml-4 mt-9 w-px h-4 ${done ? 'bg-accent' : 'bg-dark-border'}`} style={{ position: 'relative', left: -36, top: 8, marginLeft: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── In-App Chat ──────────────────────────────────────────────── */}
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setShowChat((s) => !s)}
            className="w-full flex items-center justify-between p-4 hover:bg-dark-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-primary" />
              <span className="text-text-light font-semibold text-sm">Chat with Customer</span>
              {messages.length > 0 && (
                <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {messages.length}
                </span>
              )}
            </div>
            <ChevronLeft size={16} className={`text-muted transition-transform ${showChat ? '-rotate-90' : 'rotate-180'}`} />
          </button>

          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-dark-border"
              >
                {/* Messages */}
                <div className="h-56 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                  {messages.length === 0 ? (
                    <p className="text-muted text-sm text-center mt-8">No messages yet. Say hi!</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.uid;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                            isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-dark-hover text-text-light rounded-bl-sm'
                          }`}>
                            {msg.text}
                          </div>
                          {isMe && (
                            <span className="text-[10px] text-muted mt-1 mr-1 flex items-center gap-1">
                              {msg.status === 'seen' ? (
                                <><CheckCircle size={10} className="text-primary" /> Seen</>
                              ) : (
                                <><CheckCircle size={10} /> Sent</>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 p-3 border-t border-dark-border">
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMsg()}
                    placeholder="Type a message…"
                    className="input-field flex-1 py-2 text-sm"
                  />
                  <button
                    onClick={handleSendMsg}
                    disabled={!chatText.trim() || sendingMsg}
                    className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-50 hover:bg-primary-600 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── SOS Button ───────────────────────────────────────────────── */}
        <button
          onClick={handleSOS}
          className="w-full flex items-center justify-center gap-2 bg-red-600/15 border border-red-600/30 text-red-400 font-bold py-3.5 rounded-xl hover:bg-red-600/25 transition-all"
        >
          <Shield size={18} />
          SOS – Emergency Help
        </button>
      </div>

      {/* ── Photo Upload Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showPhotoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-dark-bg/90 backdrop-blur-md flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="w-full max-w-md glass-card p-6 border border-dark-border"
            >
              <div className="flex items-center gap-2 mb-5">
                <Camera size={20} className="text-accent" />
                <h2 className="text-text-light font-bold text-lg">Upload After Photo</h2>
              </div>
              <p className="text-muted text-sm mb-4">Take a photo of the clean car to complete the job.</p>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-4 ${
                  photoPreview ? 'border-accent' : 'border-dark-border hover:border-primary'
                }`}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="After photo preview" className="w-full h-40 object-cover rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={32} className="text-muted" />
                    <p className="text-muted text-sm">Tap to select photo</p>
                    <p className="text-muted/60 text-xs">JPEG, PNG up to 10MB</p>
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

              {uploading && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-dark-hover rounded-full overflow-hidden">
                    <motion.div className="h-full bg-accent rounded-full" animate={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowPhotoModal(false); setPhotoFile(null); setPhotoPreview(null); }}
                  className="btn-secondary flex-1"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePhotoUpload}
                  disabled={!photoFile || uploading}
                  className="btn-accent flex-1 disabled:opacity-50"
                >
                  {uploading ? `Uploading ${uploadProgress}%` : 'Complete Job'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success Animation Overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-bg/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.5)] mb-6 relative"
              >
                {/* Ping rings */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-green-500 rounded-full"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 bg-green-500 rounded-full"
                />
                
                <CheckCircle size={80} className="text-white relative z-10" strokeWidth={2.5} />
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-display font-bold text-white mb-2"
              >
                Job Completed!
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-green-400 font-medium"
              >
                Excellent work!
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
