export enum InquiryStatus {
  New = 'new',
  Contacted = 'contacted',
  Qualified = 'qualified',
  Rejected = 'rejected',
  Converted = 'converted'
}

export enum InquirySource {
  Website = 'website',
  Phone = 'phone',
  WalkIn = 'walk-in',
  Referral = 'referral',
  GeneralForm = 'general-form'   // فورم عام من الصفحة الخارجية
}

export enum PreferredPaymentCycle {
  Monthly = 'monthly',         // شهري
  Quarterly = 'quarterly',     // ربع سنوي
  SemiAnnual = 'semi-annual',  // نصف سنوي
  Annual = 'annual'            // سنوي
}

export interface Inquiry {
  id: string;
  unitId?: string;              // اختياري - قد يكون طلباً عاماً بدون وحدة محددة
  unitCode?: string;
  isGeneral: boolean;           // هل هو طلب عام (بدون وحدة محددة)؟

  // Customer Information
  fullName: string;
  phone: string;
  email?: string;               // اختياري
  nationality?: string;

  // Inquiry Details
  message: string;
  preferredMoveInDate?: string;
  numberOfOccupants?: number;   // عدد أفراد الأسرة

  // General Inquiry Specific Fields (للطلبات العامة)
  preferredUnitType?: string;       // نوع الوحدة المطلوبة (شقة، محل، إلخ)
  preferredPaymentCycle?: PreferredPaymentCycle;  // دورة الدفع المفضلة
  budgetRange?: string;             // نطاق الميزانية
  preferredDistrict?: string;       // الحي المفضل
  numberOfRooms?: number;           // عدد الغرف

  // Status & Tracking
  status: InquiryStatus;
  source: InquirySource;

  // Admin Notes
  adminNotes?: string;
  assignedTo?: string; // User ID who handles this inquiry

  // Timestamps
  createdAt: string;
  updatedAt: string;
  contactedAt?: string;
  convertedAt?: string;
}

export interface CreateInquiryDto {
  unitId?: string;
  isGeneral: boolean;
  fullName: string;
  phone: string;
  email?: string;
  nationality?: string;
  message: string;
  preferredMoveInDate?: string;
  numberOfOccupants?: number;
  preferredUnitType?: string;
  preferredPaymentCycle?: PreferredPaymentCycle;
  budgetRange?: string;
  preferredDistrict?: string;
  numberOfRooms?: number;
}

export interface UpdateInquiryDto {
  status?: InquiryStatus;
  adminNotes?: string;
  assignedTo?: string;
}
