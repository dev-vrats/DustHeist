import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { WasherProfile } from '@/types';
import {
  Search, X, ChevronRight, CheckCircle, XCircle,
  Phone, Mail, Star, Briefcase, BadgeCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

function PulseDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {online && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
          online ? 'bg-accent' : 'bg-muted'
        }`}
      />
    </span>
  );
}

function WasherDrawer({
  washer,
  onClose,
}: {
  washer: WasherProfile | null;
  onClose: () => void;
}) {
  if (!washer) return null;

  const handleApprove = async () => {
    try {
      await updateDoc(doc(db, 'washers', washer.uid), { documentsVerified: true });
      await updateDoc(doc(db, 'users', washer.uid), { isActive: true });
      toast.success(`${washer.name} approved!`);
      onClose();
    } catch { toast.error('Failed to approve'); }
  };

  const handleToggleActive = async () => {
    try {
      await updateDoc(doc(db, 'washers', washer.uid), { isActive: !washer.isActive });
      await updateDoc(doc(db, 'users', washer.uid), { isActive: !washer.isActive });
      toast.success(washer.isActive ? 'Washer deactivated' : 'Washer activated');
      onClose();
    } catch { toast.error('Update failed'); }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-dark-card border-l border-dark-border z-[60] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <h2 className="text-text-light font-semibold">Washer Profile</h2>
          <button onClick={onClose} className="text-muted hover:text-text-light transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-emerald-600 flex items-center justify-center text-white font-bold text-3xl">
                {washer.name?.charAt(0)?.toUpperCase()}
              </div>
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-dark-card ${
                  washer.isOnline ? 'bg-accent' : 'bg-muted'
                }`}
              />
            </div>
            <div className="text-center">
              <p className="text-text-light font-bold text-lg">{washer.name}</p>
              <div className="flex items-center gap-2 justify-center mt-1">
                {washer.documentsVerified ? (
                  <span className="status-badge bg-accent/10 text-accent text-xs">
                    <BadgeCheck className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="status-badge bg-yellow-400/10 text-yellow-400 text-xs">
                    Pending Verification
                  </span>
                )}
                <span className={`status-badge text-xs ${washer.isActive ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                  {washer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {[
            { icon: Mail, label: 'Email', value: washer.email },
            { icon: Phone, label: 'Phone', value: washer.phone || 'N/A' },
            { icon: Star, label: 'Rating', value: `★ ${washer.rating?.toFixed(1) || '5.0'} (${washer.totalRatings} reviews)` },
            { icon: Briefcase, label: 'Jobs Completed', value: washer.jobsCompleted || 0 },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-dark-hover/60">
              <Icon className="w-4 h-4 text-muted shrink-0" />
              <div>
                <p className="text-muted text-xs">{label}</p>
                <p className="text-text-light text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}

          {/* Vehicle Info */}
          {washer.vehicleInfo && (
            <div className="p-4 rounded-xl bg-dark-hover/60">
              <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-2">Vehicle</p>
              <p className="text-text-light text-sm">
                {washer.vehicleInfo.color} {washer.vehicleInfo.make} — {washer.vehicleInfo.plate}
              </p>
            </div>
          )}

          {/* Earnings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-accent">₹{(washer.earningsTotal || 0).toLocaleString('en-IN')}</p>
              <p className="text-muted text-xs mt-1">Total Earnings</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">{washer.jobsCompleted || 0}</p>
              <p className="text-muted text-xs mt-1">Jobs Done</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-dark-border space-y-2">
          {!washer.documentsVerified && (
            <button
              onClick={handleApprove}
              className="w-full btn-accent flex items-center justify-center gap-2 text-sm py-2.5"
            >
              <CheckCircle className="w-4 h-4" /> Approve Washer
            </button>
          )}
          <button
            onClick={handleToggleActive}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              washer.isActive
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-accent/10 text-accent hover:bg-accent/20'
            }`}
          >
            {washer.isActive ? (
              <><XCircle className="w-4 h-4" />Deactivate</>
            ) : (
              <><CheckCircle className="w-4 h-4" />Activate</>
            )}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

export default function ManageWashers() {
  const [washers, setWashers] = useState<WasherProfile[]>([]);
  const [filtered, setFiltered] = useState<WasherProfile[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WasherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'washers'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as WasherProfile));
      setWashers(rows);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? washers.filter((w) => w.name?.toLowerCase().includes(q) || w.email?.toLowerCase().includes(q)) : washers);
  }, [search, washers]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">Washers</h1>
        <p className="section-subtitle mt-1">
          {washers.length} washers · {washers.filter((w) => w.isOnline).length} online ·{' '}
          {washers.filter((w) => !w.documentsVerified).length} pending approval
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          className="input-field pl-9"
          placeholder="Search washers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-light" onClick={() => setSearch('')}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

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
                  {['Name', 'Email', 'Online', 'Rating', 'Jobs', 'Verified', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-muted font-medium py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-12">No washers found</td>
                  </tr>
                ) : (
                  filtered.map((w) => (
                    <tr
                      key={w.uid}
                      onClick={() => setSelected(w)}
                      className="border-b border-dark-border/40 hover:bg-dark-hover/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {w.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-text-light font-medium">{w.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted">{w.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <PulseDot online={w.isOnline} />
                          <span className={`text-xs ${w.isOnline ? 'text-accent' : 'text-muted'}`}>
                            {w.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-light">★ {w.rating?.toFixed(1) || '5.0'}</td>
                      <td className="py-3 px-4 text-text-light font-semibold text-center">{w.jobsCompleted || 0}</td>
                      <td className="py-3 px-4">
                        {w.documentsVerified ? (
                          <span className="status-badge bg-accent/10 text-accent text-xs">
                            <BadgeCheck className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="status-badge bg-yellow-400/10 text-yellow-400 text-xs">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-badge text-xs ${w.isActive ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                          {w.isActive ? 'Active' : 'Inactive'}
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

      {selected && <WasherDrawer washer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
