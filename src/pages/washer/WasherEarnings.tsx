import { ArrowLeft, Wallet, CheckCircle, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Booking } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function WasherEarnings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<Booking[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'bookings'), where('washerId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      const completed = docs.filter(b => b.status === 'completed');
      completed.sort((a, b) => {
        const tA = (a.completedAt as any)?.toDate?.()?.getTime() || 0;
        const tB = (b.completedAt as any)?.toDate?.()?.getTime() || 0;
        return tB - tA;
      });
      setHistory(completed);
    });
    return unsub;
  }, [user]);

  const totalEarned = history.reduce((acc, curr) => acc + (curr.pricing?.total || 0), 0);

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col pb-24">
      <div className="bg-dark-card/90 backdrop-blur-xl border-b border-dark-border px-4 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft size={20} className="text-text-light" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-text-light">Earnings & History</h1>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto w-full">
        {/* Total Earnings Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card relative overflow-hidden p-6 border border-accent/30 bg-gradient-to-br from-dark-card to-slate-900/80">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet size={80} className="text-accent rotate-12" />
          </div>
          <p className="text-sm text-muted mb-1">Lifetime Earnings</p>
          <h2 className="text-3xl font-bold text-white">{formatCurrency(totalEarned)}</h2>
          <div className="mt-4 flex items-center gap-2">
            <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-md font-medium">
              {history.length} Jobs Completed
            </span>
          </div>
        </motion.div>

        {/* Job History List */}
        <div>
          <h3 className="text-sm font-semibold text-text-light mb-3">Job History</h3>
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((job) => (
                <div key={job.id} className="glass-card p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-text-light">{job.serviceType.toUpperCase()} WASH</h4>
                      <p className="text-xs text-muted">{formatDate(job.completedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-accent">{formatCurrency(job.pricing.total)}</p>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-green-400 mt-0.5">
                        <CheckCircle size={10} /> Completed
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-dark-bg/60 p-2 rounded-lg mt-3 border border-white/5">
                    <Car size={14} className="text-muted" />
                    <span className="text-xs text-text-light flex-1">
                      {job.vehicleDetails?.make} {job.vehicleDetails?.model} ({job.vehicleDetails?.plate})
                    </span>
                  </div>

                  {job.afterPhoto && (
                    <div className="mt-3">
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">After Photo</p>
                      <img src={job.afterPhoto} alt="Completed Wash" className="w-full h-32 object-cover rounded-xl border border-white/10" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted">
                <Wallet size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No completed jobs yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}