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
  Referral = 'referral'
}

export interface Inquiry {
  id: string;
  unitId: string;
  unitCode?: string;

  // Customer Information
  fullName: string;
  email: string;
  phone: string;
  nationality?: string;

  // Inquiry Details
  message: string;
  preferredMoveInDate?: string;
  numberOfOccupants?: number;

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
  unitId: string;
  fullName: string;
  email: string;
  phone: string;
  nationality?: string;
  message: string;
  preferredMoveInDate?: string;
  numberOfOccupants?: number;
}

export interface UpdateInquiryDto {
  status?: InquiryStatus;
  adminNotes?: string;
  assignedTo?: string;
}
