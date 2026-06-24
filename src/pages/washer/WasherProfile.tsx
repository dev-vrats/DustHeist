import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, LogOut, Loader2, User, Mail, Calendar, Settings, ChevronRight, HelpCircle, Star, Droplets } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/firebase';

export default function WasherProfile() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('https://api.imgbb.com/1/upload?key=f7a3c9fd52dcbbb94a18325f4f29f76d', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        const downloadURL = data.data.url;
        await updateDoc(doc(db, 'users', user.uid), { profilePic: downloadURL });
        await updateDoc(doc(db, 'washers', user.uid), { profilePic: downloadURL });
        await refreshProfile();
        toast.success('Profile picture updated!');
      } else {
        throw new Error('ImgBB upload failed');
      }
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-bg/90 backdrop-blur-xl border-b border-white/5 px-4 py-4 text-center">
        <h1 className="text-lg font-semibold text-text-light">Washer Profile</h1>
      </div>

      <div className="flex-1 px-4 pt-6 max-w-lg mx-auto w-full space-y-6">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-28 h-28 rounded-full border-4 border-dark-card bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center cursor-pointer overflow-hidden shadow-xl shadow-accent/20 relative"
            >
              {profile?.profilePic ? (
                <img src={profile.profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{initials}</span>
              )}
              
              {/* Upload overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                <Camera size={24} className="text-white mb-1" />
                <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Edit</span>
              </div>

              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                  <Loader2 size={24} className="text-white animate-spin mb-1" />
                  <span className="text-[10px] text-white">Uploading...</span>
                </div>
              )}
            </motion.div>
          </div>
          
          <h2 className="text-xl font-bold text-text-light mt-4">{profile?.name || 'Washer'}</h2>
          <p className="text-sm text-muted">{user?.email}</p>
          <div className="mt-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-medium text-accent">
            Washer Account
          </div>
        </div>

        {/* Washer Stats Quick Look */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="glass-card flex flex-col items-center justify-center py-4">
            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
              <Star size={16} className="text-yellow-500" />
            </div>
            <p className="text-xl font-bold text-text-light">{(profile as any)?.rating ? (profile as any).rating.toFixed(1) : 'New'}</p>
            <p className="text-xs text-muted">Avg Rating</p>
          </div>
          <div className="glass-card flex flex-col items-center justify-center py-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center mb-2">
              <Droplets size={16} className="text-cyan-500" />
            </div>
            <p className="text-xl font-bold text-text-light">{(profile as any)?.totalWashes || '0'}</p>
            <p className="text-xs text-muted">Total Washes</p>
          </div>
        </div>

        {/* Profile Details List */}
        <h3 className="text-xs font-semibold text-muted uppercase tracking-widest px-1 mt-8">Account Details</h3>
        <div className="glass-card p-0 overflow-hidden divide-y divide-white/5">
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <User size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Full Name</p>
              <p className="text-sm font-medium text-text-light">{profile?.name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Mail size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Email Address</p>
              <p className="text-sm font-medium text-text-light">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Calendar size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Member Since</p>
              <p className="text-sm font-medium text-text-light">
                {profile?.createdAt 
                  ? new Date((profile.createdAt as any).toDate ? (profile.createdAt as any).toDate() : profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'}) 
                  : 'Recently'}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Links */}
        <h3 className="text-xs font-semibold text-muted uppercase tracking-widest px-1 mt-6">Settings & Support</h3>
        <div className="glass-card p-0 overflow-hidden divide-y divide-white/5">
          {[
            { icon: Settings, label: 'App Settings', color: 'text-slate-400' },
            { icon: HelpCircle, label: 'Help & Support', color: 'text-slate-400' },
          ].map((item, idx) => (
            <button key={idx} onClick={() => toast('This section is under construction.')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-3">
                <item.icon size={18} className={item.color} />
                <span className="text-sm text-text-light font-medium">{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full mt-6 flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-semibold hover:bg-red-500/20 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </motion.button>
      </div>
    </div>
  );
}