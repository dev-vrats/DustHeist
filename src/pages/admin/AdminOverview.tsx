import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot, where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { Booking, WasherProfile, SERVICE_LABELS } from '@/types';
import {
  Users, Car, ClipboardList, DollarSign,
  TrendingUp, Activity,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

// ── Sample data for charts ──────────────────────────────────────────────────
const generateRevData = () =>
  Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'dd MMM'),
    revenue: Math.floor(Math.random() * 8000) + 1500,
  }));

const PIE_DATA = [
  { name: 'Basic',   value: 45, color: '#1A73E8' },
  { name: 'Premium', value: 35, color: '#00C853' },
  { name: 'Deep',    value: 20, color: '#FF6D00' },
];

const STATUS_COLOR: Record<string, string> = {
  pending:    'text-yellow-400 bg-yellow-400/10',
  accepted:   'text-blue-400 bg-blue-400/10',
  enRoute:    'text-cyan-400 bg-cyan-400/10',
  arrived:    'text-purple-400 bg-purple-400/10',
  inProgress: 'text-orange-400 bg-orange-400/10',
  completed:  'text-accent bg-accent/10',
  cancelled:  'text-red-400 bg-red-400/10',
};

// ── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  colorClass: string;
  glowClass: string;
  sub?: string;
}
function StatCard({ icon: Icon, label, value, colorClass, glowClass, sub }: StatCardProps) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass} ${glowClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-muted text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-text-light text-2xl font-bold font-display">{value}</p>
        {sub && <p className="text-muted text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Pulsing dot ──────────────────────────────────────────────────────────────
function PulseDot({ color = 'bg-accent' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

export default function AdminOverview() {
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [onlineWashers, setOnlineWashers] = useState<WasherProfile[]>([]);
  const [stats, setStats] = useState({
    customers: 0,
    washers: 0,
    bookingsToday: 0,
    revenueToday: 0,
  });
  const [revData] = useState(generateRevData);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Fetch stats
  useEffect(() => {
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setStats((s) => ({ ...s, customers: snap.size }));
    });
    const unsubWashers = onSnapshot(collection(db, 'washers'), (snap) => {
      setStats((s) => ({ ...s, washers: snap.size }));
      const online = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() } as WasherProfile))
        .filter((w) => w.isOnline);
      setOnlineWashers(online);
    });

    const todayStart = Timestamp.fromDate(startOfDay(new Date()));
    const todayEnd = Timestamp.fromDate(endOfDay(new Date()));
    const qToday = query(
      collection(db, 'bookings'),
      where('createdAt', '>=', todayStart),
      where('createdAt', '<=', todayEnd),
    );
    const unsubToday = onSnapshot(qToday, (snap) => {
      let rev = 0;
      snap.forEach((d) => {
        const data = d.data();
        if (data.status === 'completed') rev += data.pricing?.total || 0;
      });
      setStats((s) => ({ ...s, bookingsToday: snap.size, revenueToday: rev }));
    });

    return () => {
      unsubCustomers();
      unsubWashers();
      unsubToday();
    };
  }, []);

  // Recent bookings
  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setRecentBookings(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)),
      );
      setLoadingBookings(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Dashboard Overview</h1>
        <p className="section-subtitle mt-1">Real-time insights for DustHeist platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Customers"
          value={stats.customers}
          colorClass="bg-primary/20 text-primary"
          glowClass="shadow-glow-blue"
        />
        <StatCard
          icon={Car}
          label="Total Washers"
          value={stats.washers}
          colorClass="bg-accent/20 text-accent"
          glowClass="shadow-glow-green"
          sub={`${onlineWashers.length} online now`}
        />
        <StatCard
          icon={ClipboardList}
          label="Bookings Today"
          value={stats.bookingsToday}
          colorClass="bg-warning-500/20 text-warning-500"
          glowClass="shadow-glow-orange"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue Today"
          value={`₹${stats.revenueToday.toLocaleString('en-IN')}`}
          colorClass="bg-purple-500/20 text-purple-400"
          glowClass=""
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Line Chart */}
        <div className="glass-card p-5 xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-text-light font-semibold text-sm">Revenue — Last 30 Days</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#F8FAFC',
                  fontSize: 12,
                }}
                formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1A73E8"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#1A73E8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-accent" />
            <h2 className="text-text-light font-semibold text-sm">Bookings by Service</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={PIE_DATA}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {PIE_DATA.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#F8FAFC',
                  fontSize: 12,
                }}
                formatter={(value: any) => [`${value}%`, '']}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Bookings */}
        <div className="glass-card p-5 xl:col-span-2 overflow-hidden">
          <h2 className="text-text-light font-semibold text-sm mb-4">Recent Bookings</h2>
          <div className="overflow-x-auto">
            {loadingBookings ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    {['Customer', 'Service', 'Status', 'Amount', 'Time'].map((h) => (
                      <th key={h} className="text-left text-muted font-medium py-2 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-8 text-sm">No bookings yet</td>
                    </tr>
                  ) : (
                    recentBookings.map((b) => (
                      <tr key={b.id} className="border-b border-dark-border/50 hover:bg-dark-hover/50 transition-colors">
                        <td className="py-2.5 pr-4 text-text-light font-medium truncate max-w-[120px]">{b.customerName}</td>
                        <td className="py-2.5 pr-4 text-muted capitalize">{SERVICE_LABELS[b.serviceType] || b.serviceType}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`status-badge ${STATUS_COLOR[b.status] || ''}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-text-light font-mono">₹{b.pricing?.total || 0}</td>
                        <td className="py-2.5 text-muted text-xs whitespace-nowrap">
                          {b.createdAt
                            ? format(
                                b.createdAt instanceof Timestamp
                                  ? b.createdAt.toDate()
                                  : new Date(b.createdAt as unknown as string),
                                'dd MMM, HH:mm',
                              )
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Live Washers */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PulseDot />
            <h2 className="text-text-light font-semibold text-sm">Live Washers Online</h2>
            <span className="ml-auto text-accent font-bold text-sm">{onlineWashers.length}</span>
          </div>
          <div className="space-y-3">
            {onlineWashers.length === 0 ? (
              <p className="text-muted text-sm text-center py-6">No washers online</p>
            ) : (
              onlineWashers.map((w) => (
                <div key={w.uid} className="flex items-center gap-3 p-3 rounded-xl bg-dark-hover/60">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                      {w.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent border-2 border-dark-card" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-text-light text-sm font-medium truncate">{w.name}</p>
                    <p className="text-muted text-xs">★ {w.rating?.toFixed(1)} · {w.jobsCompleted} jobs</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
