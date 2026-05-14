/**
 * Owner Domain Model
 * Represents a property owner in the system
 */

export interface Owner {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  nationalId?: string;
  address?: string;
  status: OwnerStatus;
  notes?: string;

  // Independent owner flag
  isIndependent?: boolean;   // مالك مستقل فقط

  // Banking Info
  bankName?: string;          // اسم البنك (راجحي، إلخ)
  accountHolderName?: string; // اسم صاحب الحساب
  bankAccount?: string;       // رقم الحساب / IBAN

  // Agency (وكالة)
  agencyNumber?: string;      // رقم الوكالة (اختياري)
  agencyExpiryDate?: Date;    // تاريخ انتهاء الوكالة (اختياري)
  agencyFileUrl?: string;     // ملف الوكالة PDF (اختياري)

  // Account Management
  hasAccount: boolean;
  username?: string;
  role: 'Owner';
  tempPassword?: string;
  tempPasswordSentAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export enum OwnerStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Suspended = 'Suspended'
}

export const BANK_OPTIONS = [
  'الراجحي',
  'الأهلي التجاري',
  'الرياض',
  'البنك العربي الوطني',
  'سامبا',
  'الفرنسي',
  'الإنماء',
  'البلاد',
  'الجزيرة',
  'الاستثمار',
  'الخليج',
  'أخرى'
];

export interface CreateOwnerDto {
  fullName: string;
  phone: string;
  email: string;
  nationalId?: string;
  address?: string;
  notes?: string;
  hasAccount: boolean;
  isIndependent?: boolean;
  bankName?: string;
  accountHolderName?: string;
  bankAccount?: string;
  agencyNumber?: string;
  agencyExpiryDate?: Date;
  agencyFileUrl?: string;
}

export interface UpdateOwnerDto extends Partial<CreateOwnerDto> {
  status?: OwnerStatus;
}
