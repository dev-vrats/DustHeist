import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { UserProfile } from '@/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'washer' | 'admin';
  vehicleInfo?: Record<string, string>;
  adminCode?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const googleProvider = new GoogleAuthProvider();
const ADMIN_CODE = import.meta.env.VITE_ADMIN_INVITE_CODE || 'SPARKLE_ADMIN_2024';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string): Promise<UserProfile | null> => {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return { uid, ...snap.data() } as UserProfile;
    }
    return null;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await fetchProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    const existing = await fetchProfile(u.uid);
    if (!existing) {
      // New Google user — create as customer by default
      const baseProfile = {
        name: u.displayName || 'User',
        email: u.email || '',
        phone: '',
        role: 'customer' as const,
        profilePic: u.photoURL || '',
        createdAt: serverTimestamp(),
        isActive: true,
        rating: 5.0,
        totalRatings: 0,
        referralCode: generateReferralCode(),
        vehicles: [],
        savedAddresses: [],
      };
      await setDoc(doc(db, 'users', u.uid), baseProfile);
      await setDoc(doc(db, 'customers', u.uid), baseProfile);
    }
  };

  const register = async (data: RegisterData) => {
    if (data.role === 'admin' && data.adminCode !== ADMIN_CODE) {
      throw new Error('Invalid admin invite code');
    }

    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const uid = cred.user.uid;

    const baseProfile = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      profilePic: '',
      createdAt: serverTimestamp(),
      isActive: data.role === 'admin' ? true : data.role === 'washer' ? false : true,
      rating: 5.0,
      totalRatings: 0,
    };

    await setDoc(doc(db, 'users', uid), baseProfile);

    if (data.role === 'customer') {
      await setDoc(doc(db, 'customers', uid), {
        ...baseProfile,
        vehicles: [],
        savedAddresses: [],
        referralCode: generateReferralCode(),
      });
    } else if (data.role === 'washer') {
      await setDoc(doc(db, 'washers', uid), {
        ...baseProfile,
        isOnline: false,
        currentLocation: null,
        vehicleInfo: data.vehicleInfo || {},
        documentsVerified: false,
        earningsTotal: 0,
        jobsCompleted: 0,
        bankDetails: {},
      });
    } else if (data.role === 'admin') {
      await setDoc(doc(db, 'admins', uid), baseProfile);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.uid);
      setProfile(p);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, loginWithGoogle, register, logout, resetPassword, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function generateReferralCode(): string {
  return 'DH' + Math.random().toString(36).substring(2, 8).toUpperCase();
}
