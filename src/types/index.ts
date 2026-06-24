export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'washer' | 'admin';
  profilePic?: string;
  createdAt: Date;
  isActive: boolean;
  rating: number;
  totalRatings: number;
}

export interface WasherProfile extends UserProfile {
  isOnline: boolean;
  currentLocation?: { lat: number; lng: number };
  lastLocationUpdate?: Date;
  vehicleInfo?: {
    type: string;
    make: string;
    color: string;
    plate: string;
  };
  documentsVerified: boolean;
  earningsTotal: number;
  jobsCompleted: number;
  bankDetails?: {
    upiId?: string;
    bankAccount?: string;
    ifsc?: string;
  };
}

export interface CustomerProfile extends UserProfile {
  vehicles: Vehicle[];
  savedAddresses: SavedAddress[];
  activeSubscription?: Subscription;
  referralCode: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  color: string;
  plate: string;
}

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Office' | 'Other';
  lat: number;
  lng: number;
  formattedAddress: string;
  extraDetails?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  washerId: string | null;
  washerName?: string;
  serviceType: 'basic' | 'premium' | 'deep';
  planType: 'single' | '4wash' | '8wash';
  addOns: string[];
  scheduledTime: Date | 'asap';
  status: 'pending' | 'accepted' | 'enRoute' | 'arrived' | 'inProgress' | 'completed' | 'cancelled';
  customerLocation: {
    lat: number;
    lng: number;
    formattedAddress: string;
    extraDetails?: string;
  };
  washerLocation?: { lat: number; lng: number };
  pricing: {
    base: number;
    addOns: number;
    discount: number;
    total: number;
    paymentMethod: 'before_wash' | 'after_wash';
    paymentStatus: 'pending' | 'paid';
  };
  checklist: {
    accepted: boolean;
    enRoute: boolean;
    arrived: boolean;
    started: boolean;
    completed: boolean;
  };
  vehicleId?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  customerRating?: number;
  customerReview?: string;
  washerRating?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface Subscription {
  id: string;
  customerId: string;
  serviceType: 'basic' | 'premium' | 'deep';
  planType: '4wash' | '8wash';
  totalWashes: number;
  remainingWashes: number;
  purchasedAt: Date;
  expiresAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxUses: number;
  usedCount: number;
  validUntil: Date;
  isActive: boolean;
}

export interface ChatMessageDoc {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Date;
}

// Pricing constants
export const SERVICE_PRICES = {
  basic: 99,
  premium: 249,
  deep: 499,
} as const;

export const ADDON_PRICES = {
  vacuum: 99,
  tyre: 49,
  dashboard: 79,
  seat: 199,
} as const;

export const ADDON_LABELS = {
  vacuum: 'Interior Vacuum',
  tyre: 'Tyre Shine',
  dashboard: 'Dashboard Polish',
  seat: 'Seat Cleaning',
} as const;

export const SERVICE_LABELS = {
  basic: 'Basic Exterior',
  premium: 'Premium Clean',
  deep: 'Deep Clean',
} as const;

export const PLAN_DISCOUNTS = {
  single: 0,
  '4wash': 0.10,
  '8wash': 0.15,
} as const;

export const TIME_SLOTS = [
  '7:00 AM', '9:00 AM', '11:00 AM', '1:00 PM',
  '3:00 PM', '5:00 PM', '7:00 PM',
] as const;
