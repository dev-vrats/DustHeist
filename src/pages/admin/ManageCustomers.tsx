import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, query, orderBy,
  getDocs, where, Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { CustomerProfile } from '@/types';
import { Search, X, UserX, UserCheck, ChevronRight, Phone, Mail, Calendar, Star } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface CustomerRow extends CustomerProfile {
  bookingCount: number;
  totalSpent: number;
}

function DetailDrawer({
  customer,
  onClose,
}: {
  customer: CustomerRow | null;
  onClose: () => void;
}) {
  if (!customer) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-dark-card border-l border-dark-border z-[60] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <h2 className="text-text-light font-semibold">Customer Details</h2>
          <button onClick={onClose} className="text-muted hover:text-text-light transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-bold text-3xl">
              {customer.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="text-center">
              <p className="text-text-light font-bold text-lg">{customer.name}</p>
              <span
                className={`status-badge text-xs mt-1 inline-block ${
                  customer.isActive ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-400'
                }`}
              >
                {customer.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Info cards */}
          {[
            { icon: Mail, label: 'Email', value: customer.email },
            { icon: Phone, label: 'Phone', value: customer.phone || 'N/A' },
            {
              icon: Calendar,
              label: 'Joined',
              value: customer.createdAt
                ? format(
                    customer.createdAt instanceof Timestamp
                      ? customer.createdAt.toDate()
                      : new Date(customer.createdAt as unknown as string),
                    'dd MMM yyyy',
                  )
                : '—',
            },
            { icon: Star, label: 'Rating', value: `★ ${customer.rating?.toFixed(1) || '5.0'}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-dark-hover/60">
              <Icon className="w-4 h-4 text-muted shrink-0" />
              <div>
                <p className="text-muted text-xs">{label}</p>
                <p className="text-text-light text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}

          {/* Booking stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{customer.bookingCount}</p>
              <p className="text-muted text-xs mt-1">Total Bookings</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-accent">₹{customer.totalSpent.toLocaleString('en-IN')}</p>
              <p className="text-muted text-xs mt-1">Total Spent</p>
            </div>
          </div>

          {/* Vehicles */}
          {customer.vehicles?.length > 0 && (
            <div>
              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-2">Vehicles</p>
              {customer.vehicles.map((v) => (
                <div key={v.id} className="flex items-center gap-2 p-3 rounded-xl bg-dark-hover/60 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-text-light text-sm">
                    {v.color} {v.make} {v.model} · {v.plate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-dark-border">
          <button
            onClick={async () => {
              try {
                await updateDoc(doc(db, 'customers', customer.uid), {
                  isActive: !customer.isActive,
                });
                await updateDoc(doc(db, 'users', customer.uid), {
                  isActive: !customer.isActive,
                });
                toast.success(customer.isActive ? 'Account disabled' : 'Account enabled');
                onClose();
              } catch {
                toast.error('Failed to update account');
              }
            }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
              customer.isActive
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-accent/10 text-accent hover:bg-accent/20'
            }`}
          >
            {customer.isActive ? (
              <><UserX className="w-4 h-4" />Disable Account</>
            ) : (
              <><UserCheck className="w-4 h-4" />Enable Account</>
            )}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

export default function ManageCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [filtered, setFiltered] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const rows: CustomerRow[] = await Promise.all(
        snap.docs.map(async (d) => {
          const data = { uid: d.id, ...d.data() } as CustomerProfile;
          const bSnap = await getDocs(
            query(collection(db, 'bookings'), where('customerId', '==', d.id)),
          );
          let totalSpent = 0;
          bSnap.forEach((b) => { totalSpent += b.data().pricing?.total || 0; });
          return { ...data, bookingCount: bSnap.size, totalSpent };
        }),
      );
      setCustomers(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? customers.filter(
            (c) =>
              c.name?.toLowerCase().includes(q) ||
              c.email?.toLowerCase().includes(q) ||
              c.phone?.includes(q),
          )
        : customers,
    );
  }, [search, customers]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Customers</h1>
          <p className="section-subtitle mt-1">{customers.length} registered customers</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          className="input-field pl-9"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-light"
            onClick={() => setSearch('')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
                  {['Name', 'Email', 'Phone', 'Joined', 'Bookings', 'Spent', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-muted font-medium py-3 px-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-12">
                      {search ? 'No customers match your search' : 'No customers yet'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.uid}
                      onClick={() => setSelected(c)}
                      className="border-b border-dark-border/40 hover:bg-dark-hover/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {c.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-text-light font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted">{c.email}</td>
                      <td className="py-3 px-4 text-muted">{c.phone || '—'}</td>
                      <td className="py-3 px-4 text-muted whitespace-nowrap">
                        {c.createdAt
                          ? format(
                              c.createdAt instanceof Timestamp
                                ? c.createdAt.toDate()
                                : new Date(c.createdAt as unknown as string),
                              'dd MMM yy',
                            )
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-center text-text-light font-semibold">{c.bookingCount}</td>
                      <td className="py-3 px-4 text-text-light font-mono">₹{c.totalSpent.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`status-badge text-xs ${
                            c.isActive ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ChevronRight className="w-4 h-4 text-muted group-hover:text-text-light transition-colors" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && <DetailDrawer customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
