import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  X, ChevronLeft, CheckCircle2, MapPin, Car, Clock, CreditCard,
  Smartphone, Banknote, Tag, AlertCircle, Navigation, Home,
} from 'lucide-react';
import {
  collection, doc, addDoc, onSnapshot, query, where, getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { StatusDot } from '@/components/StatusDot';
import {
  SERVICE_PRICES, ADDON_PRICES, ADDON_LABELS, SERVICE_LABELS,
  PLAN_DISCOUNTS, TIME_SLOTS,
} from '@/types';
import type { Vehicle, Coupon } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type ServiceType = keyof typeof SERVICE_PRICES;
type PlanType = keyof typeof PLAN_DISCOUNTS;
type AddOnKey = keyof typeof ADDON_PRICES;
type PaymentMethod = 'upi' | 'cash' | 'card';

// ─── Constants ────────────────────────────────────────────────────────────────
const STEP_LABELS = [
  'Service', 'Plan & Add-ons', 'Time', 'Location', 'Payment', 'Confirmed',
] as const;

const SERVICE_CONFIG: Record<
  ServiceType,
  { emoji: string; duration: string; bullets: string[]; popular?: boolean }
> = {
  basic: {
    emoji: '',
    duration: '30 min',
    bullets: ['Full exterior rinse', 'Foam wash & rinse', 'Tyre & rim clean'],
  },
  premium: {
    emoji: '',
    duration: '45 min',
    popular: true,
    bullets: ['Everything in Basic', 'Interior wipe-down', 'Glass polish & shine'],
  },
  deep: {
    emoji: '',
    duration: '75 min',
    bullets: ['Everything in Premium', 'Engine bay light clean', 'Clay bar decontamination'],
  },
};

const PLAN_LABELS: Record<PlanType, string> = {
  single: 'Single Wash',
  '4wash': '4-Wash Pack',
  '8wash': '8-Wash Pack',
};

const PLAN_TAG: Record<PlanType, string | null> = {
  single: null,
  '4wash': 'Save 10%',
  '8wash': 'Save 15%',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTotal(
  service: ServiceType,
  plan: PlanType,
  addOns: AddOnKey[],
  couponDiscount: number,
): { base: number; addOnTotal: number; discount: number; total: number } {
  const base = SERVICE_PRICES[service];
  const addOnTotal = addOns.reduce((s, k) => s + ADDON_PRICES[k], 0);
  const discountRate = PLAN_DISCOUNTS[plan];
  const planCount = plan === '4wash' ? 4 : plan === '8wash' ? 8 : 1;
  const subtotal = base * planCount + addOnTotal;
  const discount = Math.round(subtotal * discountRate) + couponDiscount;
  const total = Math.max(0, subtotal - discount);
  return { base: base * planCount, addOnTotal, discount, total };
}

function formatPlanPrice(service: ServiceType, plan: PlanType): string {
  const base = SERVICE_PRICES[service];
  const count = plan === '4wash' ? 4 : plan === '8wash' ? 8 : 1;
  const raw = base * count;
  const off = PLAN_DISCOUNTS[plan];
  const final = Math.round(raw * (1 - off));
  return `₹${final}${count > 1 ? ` for ${count} washes` : ''}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function generateBookingId(): string {
  return 'DH' + Date.now().toString(36).toUpperCase().slice(-6);
}

// ─── Step animations ──────────────────────────────────────────────────────────
const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ═══════════════════════════════════════════════════════════════════════════
//  BookingFlow
// ═══════════════════════════════════════════════════════════════════════════
export default function BookingFlow() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [selectedService, setSelectedService] = useState<ServiceType>('premium');

  // Step 2
  const [plan, setPlan] = useState<PlanType>('single');
  const [addOns, setAddOns] = useState<AddOnKey[]>([]);

  // Step 3
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [isAsap, setIsAsap] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Step 4
  const [formattedAddress, setFormattedAddress] = useState('MG Road, Bengaluru, Karnataka 560001');
  const [changeAddress, setChangeAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // Step 5
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  // Step 6
  const [bookingId, setBookingId] = useState('');
  const [firestoreDocId, setFirestoreDocId] = useState('');
  const [washerFound, setWasherFound] = useState<{ id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Load vehicles
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'customers', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const vList: Vehicle[] = data.vehicles || [];
        setVehicles(vList);
        if (vList.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(vList[0].id);
        }
      }
    });
    return unsub;
  }, [user]);

  // Real-time listener on booking doc
  useEffect(() => {
    if (!firestoreDocId) return;
    const unsub = onSnapshot(doc(db, 'bookings', firestoreDocId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.washerId) {
          setWasherFound({ id: data.washerId, name: data.washerName || 'Your Washer' });
        }
      }
    });
    return unsub;
  }, [firestoreDocId]);

  // Pricing
  const couponDiscount = couponApplied
    ? couponApplied.discountType === 'flat'
      ? couponApplied.discountValue
      : Math.round(
          calcTotal(selectedService, plan, addOns, 0).total * (couponApplied.discountValue / 100),
        )
    : 0;

  const pricing = calcTotal(selectedService, plan, addOns, couponDiscount);

  // Navigation
  const goTo = useCallback(
    (next: number) => {
      setDirection(next > step ? 1 : -1);
      setStep(next);
    },
    [step],
  );

  const goNext = () => {
    if (step === 3 && !isAsap && !selectedSlot) {
      toast.error('Please select a time slot or choose ASAP');
      return;
    }
    goTo(step + 1);
  };

  const goBack = () => {
    if (step === 1) { navigate('/customer'); return; }
    goTo(step - 1);
  };

  const toggleAddOn = (key: AddOnKey) => {
    setAddOns((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const q = query(
        collection(db, 'coupons'),
        where('code', '==', couponCode.trim().toUpperCase()),
        where('isActive', '==', true),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error('Invalid or expired coupon');
        setCouponApplied(null);
      } else {
        const data = snap.docs[0].data() as Coupon;
        const validUntil = (data.validUntil as any)?.toDate?.() ?? new Date(0);
        if (validUntil < new Date()) {
          toast.error('This coupon has expired');
          setCouponApplied(null);
        } else if (data.usedCount >= data.maxUses) {
          toast.error('Coupon usage limit reached');
          setCouponApplied(null);
        } else {
          setCouponApplied({ ...data, id: snap.docs[0].id });
          toast.success('Coupon applied!');
        }
      }
    } catch {
      toast.error('Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (!user || !profile) { toast.error('Please log in first'); return; }
    setConfirming(true);
    try {
      const address = changeAddress && newAddress.trim() ? newAddress.trim() : formattedAddress;
      const scheduledTime = isAsap ? 'asap' : `${selectedDate}T${selectedSlot}`;
      const newBid = generateBookingId();
      setBookingId(newBid);

      const docRef = await addDoc(collection(db, 'bookings'), {
        customerId: user.uid,
        customerName: profile.name,
        washerId: null,
        serviceType: selectedService,
        planType: plan,
        addOns,
        scheduledTime,
        status: 'pending',
        customerLocation: {
          lat: 12.9716,
          lng: 77.5946,
          formattedAddress: address,
          extraDetails: extraDetails.trim() || null,
        },
        vehicleId: selectedVehicleId || null,
        pricing: {
          base: pricing.base,
          addOns: pricing.addOnTotal,
          discount: pricing.discount,
          total: pricing.total,
          paymentMethod,
          paymentStatus: 'pending',
        },
        checklist: {
          accepted: false,
          enRoute: false,
          arrived: false,
          started: false,
          completed: false,
        },
        bookingDisplayId: newBid,
        createdAt: serverTimestamp(),
      });

      setFirestoreDocId(docRef.id);
      setDirection(1);
      setStep(6);
      toast.success('Booking confirmed! 🎉');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-dark-bg/95 backdrop-blur-md border-b border-dark-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {step < 6 && (
            <button
              onClick={goBack}
              className="p-2 rounded-xl hover:bg-dark-card transition-colors text-muted hover:text-text-light"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <p className="text-xs text-muted font-medium">Step {step} of 6</p>
            <p className="text-sm font-semibold text-text-light">{STEP_LABELS[step - 1]}</p>
          </div>
          {step < 6 && (
            <button
              onClick={() => navigate('/customer')}
              className="p-2 rounded-xl hover:bg-dark-card transition-colors text-muted hover:text-text-light"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-dark-card mx-4 mb-3 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((step - 1) / 5) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Step dots */}
        <div className="flex justify-between px-6 pb-3 max-w-lg mx-auto">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                  i + 1 < step
                    ? 'bg-accent text-white'
                    : i + 1 === step
                    ? 'bg-primary text-white shadow-glow-blue'
                    : 'bg-dark-card text-muted border border-dark-border'
                }`}
              >
                {i + 1 < step ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              <span
                className={`text-[9px] font-medium hidden sm:block ${
                  i + 1 === step ? 'text-primary' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              {step === 1 && <Step1Service selected={selectedService} onSelect={setSelectedService} />}
              {step === 2 && (
                <Step2PlanAddons
                  service={selectedService}
                  plan={plan}
                  onPlanChange={setPlan}
                  addOns={addOns}
                  onToggleAddOn={toggleAddOn}
                  pricing={pricing}
                />
              )}
              {step === 3 && (
                <Step3Time
                  date={selectedDate}
                  onDateChange={setSelectedDate}
                  isAsap={isAsap}
                  onAsapToggle={setIsAsap}
                  slot={selectedSlot}
                  onSlotSelect={setSelectedSlot}
                />
              )}
              {step === 4 && (
                <Step4Location
                  address={formattedAddress}
                  changeAddress={changeAddress}
                  onToggleChange={() => setChangeAddress((v) => !v)}
                  newAddress={newAddress}
                  onNewAddressChange={setNewAddress}
                  extraDetails={extraDetails}
                  onExtraDetailsChange={setExtraDetails}
                  vehicles={vehicles}
                  selectedVehicleId={selectedVehicleId}
                  onVehicleChange={setSelectedVehicleId}
                />
              )}
              {step === 5 && (
                <Step5Payment
                  service={selectedService}
                  plan={plan}
                  addOns={addOns}
                  pricing={pricing}
                  couponCode={couponCode}
                  onCouponChange={setCouponCode}
                  onApplyCoupon={applyCoupon}
                  couponLoading={couponLoading}
                  couponApplied={couponApplied}
                  onRemoveCoupon={() => { setCouponApplied(null); setCouponCode(''); }}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                />
              )}
              {step === 6 && (
                <Step6Confirmed
                  bookingId={bookingId}
                  firestoreDocId={firestoreDocId}
                  washerFound={washerFound}
                  onTrack={() => navigate(`/customer/track/${firestoreDocId}`)}
                  onDone={() => navigate('/customer')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom CTA */}
      {step < 6 && (
        <div className="sticky bottom-0 bg-dark-bg/95 backdrop-blur-md border-t border-dark-border p-4">
          <div className="max-w-lg mx-auto">
            {step < 5 ? (
              <button className="btn-primary w-full text-base py-4" onClick={goNext}>
                Continue →
              </button>
            ) : (
              <button
                className="btn-accent w-full text-base py-4 flex items-center justify-center gap-2"
                onClick={confirmBooking}
                disabled={confirming}
              >
                {confirming ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Confirm &amp; Pay ₹{pricing.total}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  STEP 1 – Choose Service
// ═════════════════════════════════════════════════════════════════════════════
function Step1Service({
  selected,
  onSelect,
}: {
  selected: ServiceType;
  onSelect: (s: ServiceType) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="section-title">Choose a Service</h2>
        <p className="section-subtitle mt-1">What level of clean does your car deserve?</p>
      </div>

      {(Object.keys(SERVICE_PRICES) as ServiceType[]).map((key) => {
        const config = SERVICE_CONFIG[key];
        const isSelected = selected === key;
        return (
          <motion.button
            key={key}
            whileTap={{ scale: 0.985 }}
            onClick={() => onSelect(key)}
            className={`w-full text-left glass-card p-5 transition-all duration-200 relative overflow-hidden ${
              isSelected
                ? 'border-primary shadow-glow-blue ring-1 ring-primary/40'
                : 'hover:border-dark-border/80 hover:bg-dark-card/90'
            }`}
          >
            {config.popular && (
              <span className="absolute top-3 right-3 bg-warning-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">
                POPULAR
              </span>
            )}

            {isSelected && (
              <motion.div
                layoutId="service-selector"
                className="absolute inset-0 bg-primary/5 rounded-2xl pointer-events-none"
                initial={false}
              />
            )}

            <div className="relative flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition-all ${
                  isSelected ? 'bg-primary/20' : 'bg-dark-border/30'
                }`}
              >
                {config.emoji}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-display font-bold text-text-light text-lg">
                    {SERVICE_LABELS[key]}
                  </span>
                  <span
                    className={`text-2xl font-display font-black ${
                      isSelected ? 'text-primary' : 'text-text-light'
                    }`}
                  >
                    ₹{SERVICE_PRICES[key]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 mb-3">
                  <Clock size={12} className="text-muted" />
                  <span className="text-muted text-xs">{config.duration}</span>
                </div>
                <ul className="space-y-1">
                  {config.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-muted">
                      <CheckCircle2 size={12} className="text-accent flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {isSelected && (
              <div className="absolute top-3 left-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  STEP 2 – Plan & Add-ons
// ═════════════════════════════════════════════════════════════════════════════
function Step2PlanAddons({
  service,
  plan,
  onPlanChange,
  addOns,
  onToggleAddOn,
  pricing,
}: {
  service: ServiceType;
  plan: PlanType;
  onPlanChange: (p: PlanType) => void;
  addOns: AddOnKey[];
  onToggleAddOn: (k: AddOnKey) => void;
  pricing: { base: number; addOnTotal: number; discount: number; total: number };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Plan &amp; Add-ons</h2>
        <p className="section-subtitle mt-1">Save more with multi-wash packs</p>
      </div>

      {/* Plan selector */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-semibold text-text-light mb-1">Select Plan</p>
        {(Object.keys(PLAN_DISCOUNTS) as PlanType[]).map((p) => {
          const isActive = plan === p;
          const tag = PLAN_TAG[p];
          return (
            <button
              key={p}
              onClick={() => onPlanChange(p)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-dark-border bg-dark-card/50 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isActive ? 'border-primary' : 'border-muted'
                  }`}
                >
                  {isActive && <div className="w-2 h-2 bg-primary rounded-full" />}
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-text-light'}`}>
                    {PLAN_LABELS[p]}
                  </p>
                  <p className="text-xs text-muted">{formatPlanPrice(service, p)}</p>
                </div>
              </div>
              {tag && (
                <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add-ons */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-semibold text-text-light mb-1">Add-on Services</p>
        {(Object.keys(ADDON_PRICES) as AddOnKey[]).map((key) => {
          const checked = addOns.includes(key);
          return (
            <button
              key={key}
              onClick={() => onToggleAddOn(key)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                checked
                  ? 'border-accent bg-accent/10'
                  : 'border-dark-border bg-dark-card/50 hover:border-accent/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    checked ? 'bg-accent border-accent' : 'border-muted'
                  }`}
                >
                  {checked && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <span className={`text-sm font-medium ${checked ? 'text-text-light' : 'text-muted'}`}>
                  {ADDON_LABELS[key]}
                </span>
              </div>
              <span className={`text-sm font-bold ${checked ? 'text-accent' : 'text-muted'}`}>
                +₹{ADDON_PRICES[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Running total */}
      <div className="glass-card p-4 border border-primary/30">
        <div className="flex items-center justify-between">
          <span className="text-muted text-sm">Estimated Total</span>
          <motion.span
            key={pricing.total}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            className="text-2xl font-display font-black text-text-light"
          >
            ₹{pricing.total}
          </motion.span>
        </div>
        {pricing.discount > 0 && (
          <p className="text-accent text-xs mt-1 text-right">You save ₹{pricing.discount}!</p>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  STEP 3 – Select Time
// ═════════════════════════════════════════════════════════════════════════════
function Step3Time({
  date,
  onDateChange,
  isAsap,
  onAsapToggle,
  slot,
  onSlotSelect,
}: {
  date: string;
  onDateChange: (d: string) => void;
  isAsap: boolean;
  onAsapToggle: (v: boolean) => void;
  slot: string | null;
  onSlotSelect: (s: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Select Time</h2>
        <p className="section-subtitle mt-1">When should we arrive?</p>
      </div>

      {/* ASAP toggle */}
      <button
        onClick={() => { onAsapToggle(!isAsap); if (!isAsap) onSlotSelect(''); }}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
          isAsap
            ? 'border-primary bg-primary/15 shadow-glow-blue'
            : 'border-dark-border bg-dark-card hover:border-primary/40'
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            isAsap ? 'bg-primary/20' : 'bg-dark-border/30'
          }`}
        >
          -
        </div>
        <div className="text-left">
          <p className={`font-semibold ${isAsap ? 'text-primary' : 'text-text-light'}`}>ASAP</p>
          <p className="text-xs text-muted">Next available washer, ~30 min</p>
        </div>
        {isAsap && <div className="ml-auto"><StatusDot status="active" size="lg" /></div>}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-dark-border" />
        <span className="text-muted text-xs font-medium">or schedule</span>
        <div className="flex-1 h-px bg-dark-border" />
      </div>

      {/* Date picker */}
      <div className="glass-card p-4 space-y-2">
        <label className="text-sm font-semibold text-text-light block">Select Date</label>
        <input
          type="date"
          min={todayStr()}
          value={date}
          onChange={(e) => { onDateChange(e.target.value); onAsapToggle(false); }}
          className="input-field [color-scheme:dark]"
        />
      </div>

      {/* Time slots */}
      <div className="glass-card p-4">
        <p className="text-sm font-semibold text-text-light mb-3">Select Time Slot</p>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((s) => {
            const isSelected = slot === s && !isAsap;
            return (
              <button
                key={s}
                onClick={() => { onSlotSelect(s); onAsapToggle(false); }}
                className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary border-primary text-white shadow-glow-blue'
                    : 'bg-dark-card border-dark-border text-muted hover:border-primary/40 hover:text-text-light'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {!isAsap && !slot && (
        <div className="flex items-center gap-2 text-warning-500 text-xs p-3 bg-warning-500/10 border border-warning-500/20 rounded-xl">
          <AlertCircle size={14} />
          Please select a time slot or choose ASAP to continue.
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  STEP 4 – Confirm Location
// ═════════════════════════════════════════════════════════════════════════════
function Step4Location({
  address,
  changeAddress,
  onToggleChange,
  newAddress,
  onNewAddressChange,
  extraDetails,
  onExtraDetailsChange,
  vehicles,
  selectedVehicleId,
  onVehicleChange,
}: {
  address: string;
  changeAddress: boolean;
  onToggleChange: () => void;
  newAddress: string;
  onNewAddressChange: (v: string) => void;
  extraDetails: string;
  onExtraDetailsChange: (v: string) => void;
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onVehicleChange: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Confirm Location</h2>
        <p className="section-subtitle mt-1">We'll come to your doorstep</p>
      </div>

      {/* Simulated map */}
      <div className="glass-card overflow-hidden">
        <div
          className="relative h-44 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1a2744 0%, #1e3a5f 50%, #152238 100%)',
          }}
        >
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(26,115,232,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(26,115,232,0.5) 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px',
            }}
          />
          {/* Roads */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-dark-border/60 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-dark-border/60 -translate-x-1/2" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-dark-border/30" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-dark-border/30" />
          </div>
          {/* Pin */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-glow-blue border-4 border-white/20">
              <Home size={22} className="text-white" />
            </div>
            <div className="w-3 h-3 bg-primary/40 rounded-full blur-sm mt-1" />
          </motion.div>
          {/* Badge */}
          <div className="absolute top-3 right-3 bg-dark-card/80 backdrop-blur-sm border border-dark-border rounded-lg px-2 py-1 text-[10px] text-muted flex items-center gap-1">
            <Navigation size={10} />
            Simulated Map
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin size={16} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted font-medium mb-0.5">Detected Location</p>
            <p className="text-sm text-text-light font-medium">{address}</p>
          </div>
          <button
            onClick={onToggleChange}
            className="text-xs text-primary font-medium hover:text-blue-400 transition-colors whitespace-nowrap"
          >
            {changeAddress ? 'Cancel' : 'Change'}
          </button>
        </div>

        <AnimatePresence>
          {changeAddress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                value={newAddress}
                onChange={(e) => onNewAddressChange(e.target.value)}
                placeholder="Enter your full address…"
                className="input-field text-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <input
          type="text"
          value={extraDetails}
          onChange={(e) => onExtraDetailsChange(e.target.value)}
          placeholder="Flat / Floor / Landmark (optional)"
          className="input-field text-sm"
        />
      </div>

      {/* Vehicle */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Car size={16} className="text-primary" />
          <p className="text-sm font-semibold text-text-light">Select Vehicle</p>
        </div>
        {vehicles.length === 0 ? (
          <div className="flex items-center gap-2 text-muted text-sm p-3 bg-dark-card rounded-xl border border-dark-border">
            <AlertCircle size={14} />
            No vehicles saved. Add one in your profile.
          </div>
        ) : (
          <select
            value={selectedVehicleId}
            onChange={(e) => onVehicleChange(e.target.value)}
            className="input-field"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.color} {v.make} {v.model} — {v.plate}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  STEP 5 – Payment
// ═════════════════════════════════════════════════════════════════════════════
function Step5Payment({
  service,
  plan,
  addOns,
  pricing,
  couponCode,
  onCouponChange,
  onApplyCoupon,
  couponLoading,
  couponApplied,
  onRemoveCoupon,
  paymentMethod,
  onPaymentMethodChange,
}: {
  service: ServiceType;
  plan: PlanType;
  addOns: AddOnKey[];
  pricing: { base: number; addOnTotal: number; discount: number; total: number };
  couponCode: string;
  onCouponChange: (v: string) => void;
  onApplyCoupon: () => void;
  couponLoading: boolean;
  couponApplied: Coupon | null;
  onRemoveCoupon: () => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (m: PaymentMethod) => void;
}) {
  const planCount = plan === '4wash' ? 4 : plan === '8wash' ? 8 : 1;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Payment</h2>
        <p className="section-subtitle mt-1">Review your order and pay</p>
      </div>

      {/* Order summary */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-semibold text-text-light">Order Summary</p>
        <div className="space-y-2 pb-3 border-b border-dark-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted">
              {SERVICE_LABELS[service]}{planCount > 1 ? ` ×${planCount}` : ''}
            </span>
            <span className="text-text-light font-medium">₹{pricing.base}</span>
          </div>
          {addOns.map((key) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted">{ADDON_LABELS[key]}</span>
              <span className="text-text-light font-medium">+₹{ADDON_PRICES[key]}</span>
            </div>
          ))}
        </div>
        {pricing.discount > 0 && (
          <div className="flex justify-between text-sm text-accent">
            <span>Discount</span>
            <span>−₹{pricing.discount}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1">
          <span className="font-semibold text-text-light">Total</span>
          <span className="text-2xl font-display font-black text-primary">₹{pricing.total}</span>
        </div>
      </div>

      {/* Coupon */}
      <div className="glass-card p-4">
        <p className="text-sm font-semibold text-text-light mb-3 flex items-center gap-1.5">
          <Tag size={14} />
          Coupon Code
        </p>
        {couponApplied ? (
          <div className="flex items-center justify-between p-3 bg-accent/10 border border-accent/30 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-accent">{couponApplied.code}</p>
              <p className="text-xs text-muted mt-0.5">
                {couponApplied.discountType === 'flat'
                  ? `₹${couponApplied.discountValue} off`
                  : `${couponApplied.discountValue}% off`}
              </p>
            </div>
            <button onClick={onRemoveCoupon} className="text-muted hover:text-red-400 transition-colors">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && onApplyCoupon()}
              placeholder="Enter coupon code"
              className="input-field flex-1 uppercase tracking-widest text-sm"
            />
            <button
              onClick={onApplyCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {couponLoading ? (
                <div className="w-4 h-4 border-2 border-muted border-t-text-light rounded-full animate-spin" />
              ) : (
                'Apply'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Payment method */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-semibold text-text-light">Payment Method</p>

        {/* UPI */}
        <button
          onClick={() => onPaymentMethodChange('upi')}
          className={`w-full p-3 rounded-xl border-2 transition-all duration-200 text-left ${
            paymentMethod === 'upi' ? 'border-primary bg-primary/10' : 'border-dark-border hover:border-primary/40'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Smartphone size={16} className="text-primary" />
            <span className="text-sm font-semibold text-text-light">UPI</span>
            {paymentMethod === 'upi' && <CheckCircle2 size={16} className="text-primary ml-auto" />}
          </div>
          <AnimatePresence>
            {paymentMethod === 'upi' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-7 space-y-2 overflow-hidden"
              >
                {/* Fake QR code */}
                <div className="w-28 h-28 bg-white rounded-xl p-2 flex items-center justify-center">
                  <div className="w-full h-full grid grid-cols-7 gap-px">
                    {Array.from({ length: 49 }).map((_, i) => {
                      const corners = i < 7 || i >= 42 || i % 7 === 0 || i % 7 === 6
                        || (i >= 14 && i <= 20) || (i >= 28 && i <= 34);
                      const fill = corners || (i % 3 === 0) || (i % 5 === 0);
                      return (
                        <div key={i} className={`rounded-sm ${fill ? 'bg-gray-900' : 'bg-white'}`} />
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-muted">Scan QR or pay to</p>
                <p className="text-sm font-mono text-primary font-bold">dustheist@upi</p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Cash */}
        <button
          onClick={() => onPaymentMethodChange('cash')}
          className={`w-full p-3 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${
            paymentMethod === 'cash' ? 'border-accent bg-accent/10' : 'border-dark-border hover:border-accent/40'
          }`}
        >
          <Banknote size={16} className="text-accent" />
          <div className="text-left">
            <p className="text-sm font-semibold text-text-light">Cash on Delivery</p>
            <p className="text-xs text-muted">Pay when the washer arrives</p>
          </div>
          {paymentMethod === 'cash' && <CheckCircle2 size={16} className="text-accent ml-auto" />}
        </button>

        {/* Card */}
        <button
          onClick={() => onPaymentMethodChange('card')}
          className={`w-full p-3 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${
            paymentMethod === 'card' ? 'border-primary bg-primary/10' : 'border-dark-border hover:border-primary/40'
          }`}
        >
          <CreditCard size={16} className="text-primary" />
          <div className="text-left">
            <p className="text-sm font-semibold text-text-light">Card</p>
            <p className="text-xs text-muted">Debit / Credit / NetBanking</p>
          </div>
          {paymentMethod === 'card' && <CheckCircle2 size={16} className="text-primary ml-auto" />}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  STEP 6 – Booking Confirmed
// ═════════════════════════════════════════════════════════════════════════════
function Step6Confirmed({
  bookingId,
  firestoreDocId,
  washerFound,
  onTrack,
  onDone,
}: {
  bookingId: string;
  firestoreDocId: string;
  washerFound: { id: string; name: string } | null;
  onTrack: () => void;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-8 py-6">
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="relative"
      >
        <div className="w-28 h-28 bg-accent/20 rounded-full flex items-center justify-center">
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center shadow-glow-green">
            <CheckCircle2 size={44} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
        {[1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-accent/30"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.8 + i * 0.4, opacity: 0 }}
            transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <h2 className="font-display text-3xl font-black text-text-light">Booking Confirmed!</h2>
        <p className="text-muted">Your booking has been placed successfully</p>
      </motion.div>

      {/* Booking ID */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="glass-card p-4 w-full"
      >
        <p className="text-xs text-muted mb-1">Booking ID</p>
        <p className="font-mono text-lg font-bold text-primary tracking-widest">#{bookingId}</p>
      </motion.div>

      {/* Washer search */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-5 w-full"
      >
        {!washerFound ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3">
              <StatusDot status="pending" size="lg" />
              <motion.p
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-sm font-semibold text-yellow-400"
              >
                Finding a washer near you…
              </motion.p>
            </div>
            <p className="text-xs text-muted">This usually takes 2–5 minutes. Stay tuned!</p>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-3">
              <StatusDot status="online" size="lg" />
              <p className="text-sm font-semibold text-accent">Washer Found!</p>
            </div>
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-2xl">
              -
            </div>
            <p className="text-text-light font-semibold">{washerFound.name}</p>
            <p className="text-xs text-muted">is on the way to your location</p>
            <button
              onClick={onTrack}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              <Navigation size={16} />
              Track Live
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.75 }}
        className="glass-card p-4 w-full text-left space-y-2"
      >
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Tips</p>
        {[
          'Make sure your car is accessible',
          'Ensure water access nearby',
          'Leave keys at reception if needed',
        ].map((tip) => (
          <p key={tip} className="text-sm text-muted">{tip}</p>
        ))}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        onClick={onDone}
        className="btn-secondary w-full"
      >
        Back to Home
      </motion.button>
    </div>
  );
}
