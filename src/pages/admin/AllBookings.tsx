import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Booking, SERVICE_LABELS } from '@/types';
import { X, MapPin, User, Car, Clock, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ALL_STATUSES = [
  'all', 'pending', 'accepted', 'enRoute', 'arrived', 'inProgress', 'completed', 'cancelled',
] as const;
type StatusFilter = typeof ALL_STATUSES[number];

const STATUS_COLOR: Record<string, string> = {
  pending:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  accepted:   'text-blue-400 bg-blue-400/10 border-blue-400/20',
  enRoute:    'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  arrived:    'text-purple-400 bg-purple-400/10 border-purple-400/20',
  inProgress: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  completed:  'text-accent bg-accent/10 border-accent/20',
  cancelled:  'text-red-400 bg-red-400/10 border-red-400/20',
};

function BookingModal({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  if (!booking) return null;

  const handleCancel = async () => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' });
      toast.success('Booking cancelled');
      onClose();
    } catch { toast.error('Failed to cancel'); }
  };

  const createdDate =
    booking.createdAt instanceof Timestamp
      ? booking.createdAt.toDate()
      : new Date(booking.createdAt as unknown as string);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card w-full max-w-lg max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-5 border-b border-dark-border">
            <div>
              <h2 className="text-text-light font-semibold">Booking Detail</h2>
              <p className="text-muted text-xs font-mono mt-0.5">{booking.id.slice(0, 12)}…</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-text-light transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className={`status-badge border ${STATUS_COLOR[booking.status] || ''}`}>
                {booking.status}
              </span>
              <span className="text-muted text-xs">{format(createdDate, 'dd MMM yyyy, HH:mm')}</span>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-dark-hover/60">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted text-xs font-medium">Customer</span>
                </div>
                <p className="text-text-light text-sm font-medium">{booking.customerName}</p>
                <p className="text-muted text-xs">{booking.customerId.slice(0, 8)}…</p>
              </div>
              <div className="p-3 rounded-xl bg-dark-hover/60">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-3.5 h-3.5 text-accent" />
                  <span className="text-muted text-xs font-medium">Washer</span>
                </div>
                <p className="text-text-light text-sm font-medium">{booking.washerName || 'Unassigned'}</p>
                <p className="text-muted text-xs">{booking.washerId?.slice(0, 8) || '—'}…</p>
              </div>
            </div>

            {/* Service Info */}
            <div className="p-4 rounded-xl bg-dark-hover/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted text-sm">Service</span>
                <span className="text-text-light text-sm font-medium capitalize">
                  {SERVICE_LABELS[booking.serviceType] || booking.serviceType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Plan</span>
                <span className="text-text-light text-sm capitalize">{booking.planType}</span>
              </div>
              {booking.addOns?.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted text-sm">Add-ons</span>
                  <span className="text-text-light text-sm">{booking.addOns.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted text-sm">Scheduled</span>
                <span className="text-text-light text-sm">
                  {booking.scheduledTime === 'asap'
                    ? 'ASAP'
                    : booking.scheduledTime
                    ? format(
                        booking.scheduledTime instanceof Timestamp
                          ? booking.scheduledTime.toDate()
                          : new Date(booking.scheduledTime as unknown as string),
                        'dd MMM, HH:mm',
                      )
                    : '—'}
                </span>
              </div>
            </div>

            {/* Location */}
            <div className="p-4 rounded-xl bg-dark-hover/60">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-warning-500" />
                <span className="text-muted text-xs font-medium">Location</span>
              </div>
              <p className="text-text-light text-sm">{booking.customerLocation?.formattedAddress || 'Unknown'}</p>
            </div>

            {/* Pricing */}
            <div className="p-4 rounded-xl bg-dark-hover/60 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="text-muted text-xs font-medium">Payment</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Base</span>
                <span className="text-text-light text-sm">₹{booking.pricing?.base || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Add-ons</span>
                <span className="text-text-light text-sm">₹{booking.pricing?.addOns || 0}</span>
              </div>
              {booking.pricing?.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted text-sm">Discount</span>
                  <span className="text-accent text-sm">-₹{booking.pricing.discount}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dark-border pt-2">
                <span className="text-text-light text-sm font-semibold">Total</span>
                <span className="text-text-light text-sm font-bold">₹{booking.pricing?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-xs">Method</span>
                <span className="text-muted text-xs uppercase">{booking.pricing?.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-xs">Payment</span>
                <span className={`text-xs font-medium ${booking.pricing?.paymentStatus === 'paid' ? 'text-accent' : 'text-yellow-400'}`}>
                  {booking.pricing?.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <div className="p-5 border-t border-dark-border">
              <button
                onClick={handleCancel}
                className="w-full btn-danger flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                Cancel Booking
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AllBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = statusFilter === 'all' ? bookings : bookings.filter((b) => b.status === statusFilter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">All Bookings</h1>
        <p className="section-subtitle mt-1">{bookings.length} total bookings — live updates</p>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              statusFilter === s
                ? s === 'all'
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : STATUS_COLOR[s] + ' border-current'
                : 'text-muted bg-dark-card border-dark-border hover:border-dark-hover'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-60">
                ({bookings.filter((b) => b.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-dark-border">
                <tr>
                  {['Booking ID', 'Customer', 'Washer', 'Service', 'Status', 'Time', 'Amount', ''].map((h) => (
                    <th key={h} className="text-left text-muted font-medium py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-12">No bookings found</td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className="border-b border-dark-border/40 hover:bg-dark-hover/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 text-muted font-mono text-xs">{b.id.slice(0, 8)}…</td>
                      <td className="py-3 px-4 text-text-light font-medium max-w-[100px] truncate">{b.customerName}</td>
                      <td className="py-3 px-4 text-muted max-w-[100px] truncate">{b.washerName || '—'}</td>
                      <td className="py-3 px-4 text-muted capitalize whitespace-nowrap">
                        {SERVICE_LABELS[b.serviceType] || b.serviceType}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-badge border ${STATUS_COLOR[b.status] || ''}`}>{b.status}</span>
                      </td>
                      <td className="py-3 px-4 text-muted text-xs whitespace-nowrap">
                        {b.createdAt
                          ? format(
                              b.createdAt instanceof Timestamp
                                ? b.createdAt.toDate()
                                : new Date(b.createdAt as unknown as string),
                              'dd MMM, HH:mm',
                            )
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-text-light font-mono font-semibold">₹{b.pricing?.total || 0}</td>
                      <td className="py-3 px-4">
                        <Clock className="w-4 h-4 text-muted group-hover:text-text-light transition-colors" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && <BookingModal booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
