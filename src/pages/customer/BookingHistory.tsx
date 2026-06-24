import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, ChevronDown, ChevronUp, X,
  Calendar, User, CheckCircle, Clock, Car, CreditCard,
  Droplets, Sparkles, Shield, MapPin, Send,
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase';
import { StatusDot } from '@/components/StatusDot';
import { Booking } from '@/types';
import { formatDate, formatCurrency, getStatusLabel, getStatusColor } from '@/lib/utils';

/* ─── Filter tabs ──────────────────────────────────── */
type FilterType = 'all' | 'active' | 'completed' | 'cancelled';

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['pending', 'accepted', 'enRoute', 'arrived', 'inProgress'];

/* ─── Service icon helper ──────────────────────────── */
function ServiceIcon({ type }: { type: string }) {
  if (type === 'basic') return <Droplets size={14} className="text-cyan-400" />;
  if (type === 'premium') return <Sparkles size={14} className="text-violet-400" />;
  return <Shield size={14} className="text-orange-400" />;
}

/* ─── Status → StatusDot mapper ───────────────────── */
function toDotStatus(s: string): 'pending' | 'active' | 'busy' | 'done' | 'offline' {
  if (s === 'completed') return 'done';
  if (s === 'cancelled') return 'offline';
  if (ACTIVE_STATUSES.includes(s)) return 'active';
  return 'pending';
}

/* ─── Checklist display ────────────────────────────── */
const CHECKLIST_STEPS = [
  { key: 'accepted', label: 'Booking Accepted' },
  { key: 'enRoute', label: 'Washer En Route' },
  { key: 'arrived', label: 'Washer Arrived' },
  { key: 'started', label: 'Wash Started' },
  { key: 'completed', label: 'Wash Completed' },
];

/* ════════════════════════════════════════════════════ */
export default function BookingHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<Booking | null>(null);
  const [stars, setStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ── Firestore listener ── */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
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
      setBookings(docs);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  /* ── Filtered list ── */
  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ACTIVE_STATUSES.includes(b.status);
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  /* ── Submit rating ── */
  const submitRating = async () => {
    if (!ratingModal || stars === 0) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      // Update booking
      await updateDoc(doc(db, 'bookings', ratingModal.id), {
        customerRating: stars,
        customerReview: review.trim(),
        ratedAt: serverTimestamp(),
      });

      // Update washer average rating if washer assigned
      if (ratingModal.washerId) {
        const washerRef = doc(db, 'washers', ratingModal.washerId);
        const washerSnap = await getDoc(washerRef);
        if (washerSnap.exists()) {
          const washerData = washerSnap.data();
          const oldTotal = washerData.totalRatings || 0;
          const oldRating = washerData.rating || 5.0;
          const newTotal = oldTotal + 1;
          const newRating = ((oldRating * oldTotal) + stars) / newTotal;
          await updateDoc(washerRef, {
            rating: Math.round(newRating * 10) / 10,
            totalRatings: newTotal,
          });
        }
        // Also update users collection
        const userRef = doc(db, 'users', ratingModal.washerId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const ud = userSnap.data();
          const oldTotal = ud.totalRatings || 0;
          const oldRating = ud.rating || 5.0;
          const newTotal = oldTotal + 1;
          const newRating = ((oldRating * oldTotal) + stars) / newTotal;
          await updateDoc(userRef, {
            rating: Math.round(newRating * 10) / 10,
            totalRatings: newTotal,
          });
        }
      }

      toast.success('Rating submitted! Thank you 🌟');
      setRatingModal(null);
      setStars(0);
      setReview('');
    } catch (err) {
      toast.error('Failed to submit rating');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const serviceGradient = (type: string) => {
    if (type === 'basic') return 'from-cyan-500/10 to-blue-500/10 border-cyan-500/20';
    if (type === 'premium') return 'from-violet-500/10 to-purple-500/10 border-violet-500/20';
    return 'from-orange-500/10 to-amber-500/10 border-orange-500/20';
  };

  return (
    <div className="min-h-screen bg-dark-bg">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-30 bg-dark-bg/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center">
            <ArrowLeft size={18} className="text-text-light" />
          </motion.button>
          <div>
            <h1 className="text-lg font-bold text-text-light">Booking History</h1>
            <p className="text-xs text-muted">{bookings.length} total bookings</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 max-w-lg mx-auto">

        {/* ── FILTER PILLS ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
          {FILTERS.map((f) => (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                filter === f.id
                  ? 'bg-primary text-white shadow-glow-blue'
                  : 'bg-dark-card border border-dark-border text-muted'
              }`}
            >
              {f.label}
              {f.id === 'active' && bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length > 0 && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-accent text-white text-[9px] inline-flex items-center justify-center font-bold">
                  {bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4 h-24 shimmer rounded-2xl" />
            ))}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center mx-auto mb-4">
              <Car size={28} className="text-muted" />
            </div>
            <p className="text-text-light font-semibold mb-1">No bookings found</p>
            <p className="text-sm text-muted">Your booking history will appear here</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/customer/book')} className="btn-primary mt-5 mx-auto">
              Book a Wash
            </motion.button>
          </motion.div>
        )}

        {/* ── BOOKING CARDS ── */}
        {!loading && (
          <div className="space-y-3">
            {filtered.map((bk, idx) => {
              const isExpanded = expanded === bk.id;
              const canRate = bk.status === 'completed' && !bk.customerRating;
              const createdDate = bk.createdAt instanceof Date ? bk.createdAt : new Date();

              return (
                <motion.div
                  key={bk.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`glass-card overflow-hidden border ${serviceGradient(bk.serviceType)}`}
                >
                  {/* Card Header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : bk.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-dark-hover flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ServiceIcon type={bk.serviceType} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-text-light capitalize">{bk.serviceType} Wash</span>
                            <span className={`status-badge ${getStatusColor(bk.status)}`}>
                              <StatusDot status={toDotStatus(bk.status)} size="sm" />
                              {getStatusLabel(bk.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {formatDate(createdDate)}
                            </span>
                            {bk.washerName && (
                              <span className="flex items-center gap-1">
                                <User size={10} />
                                {bk.washerName}
                              </span>
                            )}
                          </div>
                          {/* Rating display */}
                          {bk.customerRating && (
                            <div className="flex items-center gap-0.5 mt-1.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={11}
                                  className={s <= bk.customerRating! ? 'text-yellow-400 fill-yellow-400' : 'text-dark-border'}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-text-light">{formatCurrency(bk.pricing.total)}</span>
                        {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                      </div>
                    </div>

                    {/* Rate button */}
                    {canRate && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRatingModal(bk);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-semibold"
                      >
                        <Star size={13} className="fill-yellow-400" />
                        Rate this wash
                      </motion.button>
                    )}
                  </div>

                  {/* ── EXPANDED DETAILS ── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        key="details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-dark-border px-4 pb-4 pt-3 space-y-4">

                          {/* Booking ID */}
                          <div className="flex justify-between text-xs">
                            <span className="text-muted">Booking ID</span>
                            <span className="text-text-light font-mono">{bk.id.slice(0, 12)}…</span>
                          </div>

                          {/* Service details */}
                          <div className="space-y-2">
                            <p className="text-xs text-muted uppercase tracking-wider">Details</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-dark-hover rounded-lg p-2.5">
                                <p className="text-muted mb-0.5">Plan</p>
                                <p className="text-text-light font-medium capitalize">{bk.planType}</p>
                              </div>
                              <div className="bg-dark-hover rounded-lg p-2.5">
                                <p className="text-muted mb-0.5">Payment</p>
                                <p className="text-text-light font-medium uppercase">{bk.pricing.paymentMethod}</p>
                              </div>
                              <div className="bg-dark-hover rounded-lg p-2.5">
                                <p className="text-muted mb-0.5">Base price</p>
                                <p className="text-text-light font-medium">{formatCurrency(bk.pricing.base)}</p>
                              </div>
                              <div className="bg-dark-hover rounded-lg p-2.5">
                                <p className="text-muted mb-0.5">Total paid</p>
                                <p className="text-text-light font-semibold">{formatCurrency(bk.pricing.total)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Location */}
                          {bk.customerLocation?.formattedAddress && (
                            <div className="flex items-start gap-2 text-xs">
                              <MapPin size={12} className="text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-muted">{bk.customerLocation.formattedAddress}</span>
                            </div>
                          )}

                          {/* Progress Checklist */}
                          <div>
                            <p className="text-xs text-muted uppercase tracking-wider mb-2">Progress</p>
                            <div className="space-y-2">
                              {CHECKLIST_STEPS.map((step, i) => {
                                const done = bk.checklist[step.key as keyof typeof bk.checklist];
                                return (
                                  <div key={step.key} className="flex items-center gap-2.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-accent' : 'bg-dark-hover border border-dark-border'}`}>
                                      {done ? <CheckCircle size={12} className="text-white" /> : <span className="text-[9px] text-muted font-bold">{i + 1}</span>}
                                    </div>
                                    <span className={`text-xs ${done ? 'text-text-light font-medium' : 'text-muted'}`}>{step.label}</span>
                                    {!done && i === CHECKLIST_STEPS.findIndex((s) => !bk.checklist[s.key as keyof typeof bk.checklist]) && (
                                      <Clock size={10} className="text-warning-500 ml-auto" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Add-ons */}
                          {bk.addOns?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted uppercase tracking-wider mb-2">Add-ons</p>
                              <div className="flex flex-wrap gap-1.5">
                                {bk.addOns.map((ao) => (
                                  <span key={ao} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full capitalize">{ao}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Photos */}
                          {(bk.beforePhoto || bk.afterPhoto) && (
                            <div>
                              <p className="text-xs text-muted uppercase tracking-wider mb-2">Photos</p>
                              <div className="flex gap-2">
                                {bk.beforePhoto && (
                                  <div className="flex-1">
                                    <p className="text-[10px] text-muted mb-1">Before</p>
                                    <img src={bk.beforePhoto} alt="Before" className="w-full h-20 object-cover rounded-lg" />
                                  </div>
                                )}
                                {bk.afterPhoto && (
                                  <div className="flex-1">
                                    <p className="text-[10px] text-muted mb-1">After</p>
                                    <img src={bk.afterPhoto} alt="After" className="w-full h-20 object-cover rounded-lg" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Review */}
                          {bk.customerReview && (
                            <div className="bg-dark-hover rounded-xl p-3">
                              <p className="text-xs text-muted mb-1">Your Review</p>
                              <p className="text-xs text-text-light italic">"{bk.customerReview}"</p>
                            </div>
                          )}

                          {/* Track button for active */}
                          {ACTIVE_STATUSES.includes(bk.status) && (
                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate(`/customer/track/${bk.id}`)} className="w-full btn-primary text-sm">
                              Track Live
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════ RATING MODAL ════════════════════════════════ */}
      <AnimatePresence>
        {ratingModal && (
          <motion.div
            key="rating-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setRatingModal(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="glass-card w-full max-w-sm p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-text-light">Rate Your Wash</h3>
                  <p className="text-xs text-muted capitalize">{ratingModal.serviceType} wash · {formatCurrency(ratingModal.pricing.total)}</p>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setRatingModal(null)} className="w-8 h-8 rounded-xl bg-dark-hover flex items-center justify-center">
                  <X size={16} className="text-muted" />
                </motion.button>
              </div>

              {/* Washer info */}
              {ratingModal.washerName && (
                <div className="flex items-center gap-3 bg-dark-hover rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-emerald-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{ratingModal.washerName.split(' ').map((n) => n[0]).join('')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-light">{ratingModal.washerName}</p>
                    <p className="text-xs text-muted">Your washer</p>
                  </div>
                </div>
              )}

              {/* Stars */}
              <div>
                <p className="text-xs text-muted text-center mb-3">How was your experience?</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <motion.button
                      key={s}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHoverStar(s)}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => setStars(s)}
                    >
                      <Star
                        size={36}
                        className={`transition-all duration-150 ${s <= (hoverStar || stars) ? 'text-yellow-400 fill-yellow-400' : 'text-dark-border'}`}
                      />
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-xs text-muted mt-2">
                  {stars === 0 ? 'Tap to rate' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][stars]}
                </p>
              </div>

              {/* Review text */}
              <div>
                <label className="text-xs text-muted mb-1.5 block">Write a review (optional)</label>
                <textarea
                  rows={3}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience with this washer…"
                  className="input-field resize-none text-sm"
                />
              </div>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={submitRating}
                disabled={submitting || stars === 0}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <Send size={15} />
                    Submit Rating
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
