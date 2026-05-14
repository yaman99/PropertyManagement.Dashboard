/**
 * Renter Domain Model
 * Represents a tenant/renter in the system
 */

export interface Renter {
  id: string;
  fullName: string;
  phone: string;

  // Identity
  idType: RenterIdType;
  nationalId?: string;          // رقم الهوية / الإقامة / السجل التجاري
  idExpiryDate?: Date;          // تاريخ انتهاء الوثيقة
  nationality?: string;
  birthDate?: Date;             // تاريخ الميلاد ميلادي

  // Commercial Registration extra fields (only when idType = CommercialRecord)
  representativeId?: string;            // رقم هوية الممثل
  commercialRecordExpiryDate?: Date;    // تاريخ انتهاء السجل التجاري
  representativeName?: string;          // اسم الممثل
  representativeBirthDate?: Date;       // تاريخ ميلاد الممثل

  // Personal
  maritalStatus?: MaritalStatus;
  familyMemberCount?: number;   // عدد الأفراد (فقط إذا متزوج)

  // Employment & Emergency
  employer?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;

  // Blacklist
  isBlacklisted: boolean;
  blacklistReason?: string;
  blacklistedAt?: Date;

  // Account Management
  hasAccount: boolean;
  username?: string;
  role: 'Renter';
  tempPassword?: string;
  tempPasswordSentAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export enum RenterIdType {
  Identity = 'Identity',                  // هوية وطنية
  Residency = 'Residency',               // إقامة
  PremiumResidency = 'PremiumResidency', // إقامة مميزة
  GCC = 'GCC',                           // دول مجلس التعاون الخليجي
  CommercialRecord = 'CommercialRecord'  // سجل تجاري
}

export enum MaritalStatus {
  Single = 'Single',     // أعزب
  Married = 'Married'    // متزوج
}

export interface CreateRenterDto {
  fullName: string;
  phone: string;
  idType: RenterIdType;
  nationalId?: string;
  idExpiryDate?: Date;
  nationality?: string;
  birthDate?: Date;
  representativeId?: string;
  commercialRecordExpiryDate?: Date;
  representativeName?: string;
  representativeBirthDate?: Date;
  maritalStatus?: MaritalStatus;
  familyMemberCount?: number;
  employer?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  hasAccount: boolean;
}

export interface UpdateRenterDto extends Partial<CreateRenterDto> {
  isBlacklisted?: boolean;
  blacklistReason?: string;
}
