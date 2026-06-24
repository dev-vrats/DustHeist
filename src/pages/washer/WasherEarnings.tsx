import { ArrowLeft, Wallet, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WasherEarnings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-bg p-6 flex flex-col items-center justify-center relative">
      <button 
        onClick={() => navigate(-1)}
        className="absolute top-10 left-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
      >
        <ArrowLeft size={20} className="text-text-light" />
      </button>

      <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 shadow-glow-blue">
        <Wallet size={36} className="text-accent" />
      </div>

      <h1 className="text-2xl font-bold text-text-light mb-2 font-display">Earnings Dashboard</h1>
      <p className="text-muted text-center max-w-sm mb-8">
        Detailed earning analytics and payout management are coming in the next update!
      </p>

      <div className="glass-card p-4 flex items-center gap-3 bg-blue-500/10 border-blue-500/20 max-w-sm w-full">
        <AlertCircle size={20} className="text-blue-400 flex-shrink-0" />
        <p className="text-sm text-blue-200">
          Your earnings are securely tracked. You can view your daily summary on the Home tab.
        </p>
      </div>
    </div>
  );
}