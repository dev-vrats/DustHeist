import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, LogOut, Loader2, User, Mail, Calendar, Settings, ChevronRight, HelpCircle, FileText, Car, Edit2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/firebase';

export default function CustomerProfile() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vColor, setVColor] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [addingVehicle, setAddingVehicle] = useState(false);

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
    const storageRef = ref(storage, `profilePics/${user.uid}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snap) => console.log('Upload progress:', (snap.bytesTransferred / snap.totalBytes) * 100),
      (error) => {
        toast.error('Failed to upload image');
        console.error(error);
        setUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await updateDoc(doc(db, 'users', user.uid), { profilePic: downloadURL });
          await updateDoc(doc(db, 'customers', user.uid), { profilePic: downloadURL });
          await refreshProfile();
          toast.success('Profile picture updated!');
        } catch (error) {
          toast.error('Failed to save profile picture URL');
          console.error(error);
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vMake.trim() || !vModel.trim() || !vColor.trim() || !vPlate.trim() || !user) {
      toast.error('All fields are required');
      return;
    }
    setAddingVehicle(true);
    try {
      const newVehicle = {
        id: Math.random().toString(36).slice(2, 11),
        make: vMake.trim(),
        model: vModel.trim(),
        color: vColor.trim(),
        plate: vPlate.trim().toUpperCase(),
      };
      await updateDoc(doc(db, 'customers', user.uid), {
        vehicles: arrayUnion(newVehicle),
      });
      toast.success('Vehicle added!');
      setShowVehicleModal(false);
      setVMake(''); setVModel(''); setVColor(''); setVPlate('');
      await refreshProfile();
    } catch {
      toast.error('Failed to add vehicle');
    } finally {
      setAddingVehicle(false);
    }
  };

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-bg/90 backdrop-blur-xl border-b border-white/5 px-4 py-4 text-center">
        <h1 className="text-lg font-semibold text-text-light">Your Profile</h1>
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
              className="w-28 h-28 rounded-full border-4 border-dark-card bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center cursor-pointer overflow-hidden shadow-xl shadow-primary/20 relative"
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
          
          <h2 className="text-xl font-bold text-text-light mt-4">{profile?.name || 'Customer'}</h2>
          <p className="text-sm text-muted">{user?.email}</p>
          <div className="mt-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
            Customer Account
          </div>
        </div>

        {/* Profile Details List */}
        <div className="glass-card mt-8 p-0 overflow-hidden divide-y divide-white/5">
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

        {/* Vehicles Section */}
        <div className="flex items-center justify-between mt-8 mb-2">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-widest px-1">Your Vehicles</h3>
          <button onClick={() => setShowVehicleModal(true)} className="text-xs text-primary font-medium hover:underline">Add New</button>
        </div>
        <div className="glass-card p-4">
          {(profile as any)?.vehicles?.length > 0 ? (
            <div className="space-y-3">
              {(profile as any).vehicles.map((v: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-dark-bg/60 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Car size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-light">{v.color} {v.make} {v.model}</p>
                      <p className="text-xs text-muted uppercase tracking-wider">{v.plate}</p>
                    </div>
                  </div>
                  <button onClick={() => toast("Edit vehicle coming soon!")} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Edit2 size={14} className="text-muted hover:text-text-light" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Car size={24} className="text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted">No vehicles added yet.</p>
              <button onClick={() => setShowVehicleModal(true)} className="text-xs font-medium text-primary mt-2">Add your first vehicle</button>
            </div>
          )}
        </div>

        {/* Settings Links */}
        <h3 className="text-xs font-semibold text-muted uppercase tracking-widest px-1 mt-6">Settings & Support</h3>
        <div className="glass-card p-0 overflow-hidden divide-y divide-white/5">
          {[
            { icon: Settings, label: 'App Settings', color: 'text-slate-400' },
            { icon: HelpCircle, label: 'Help & Support', color: 'text-slate-400' },
            { icon: FileText, label: 'Terms of Service', color: 'text-slate-400' },
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

      {/* ── Add Vehicle Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showVehicleModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-dark-card border border-dark-border rounded-3xl p-6 w-full max-w-sm"
            >
              <h2 className="text-text-light font-bold text-xl mb-4 text-center">Add Vehicle</h2>
              <form onSubmit={handleAddVehicle} className="space-y-4">
                <input
                  type="text" placeholder="Make (e.g. Honda)"
                  value={vMake} onChange={e => setVMake(e.target.value)}
                  className="input-field w-full"
                />
                <input
                  type="text" placeholder="Model (e.g. Civic)"
                  value={vModel} onChange={e => setVModel(e.target.value)}
                  className="input-field w-full"
                />
                <input
                  type="text" placeholder="Color (e.g. Blue)"
                  value={vColor} onChange={e => setVColor(e.target.value)}
                  className="input-field w-full"
                />
                <input
                  type="text" placeholder="License Plate"
                  value={vPlate} onChange={e => setVPlate(e.target.value)}
                  className="input-field w-full uppercase"
                />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowVehicleModal(false)} className="flex-1 py-3 bg-dark-bg text-muted font-bold rounded-xl">Cancel</button>
                  <button type="submit" disabled={addingVehicle} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50">
                    {addingVehicle ? 'Adding...' : 'Add Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}