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
  nationality?: string;
  birthDate?: Date;             // تاريخ الميلاد ميلادي

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
  Identity = 'Identity',               // هوية وطنية
  Residency = 'Residency',             // إقامة
  CommercialRecord = 'CommercialRecord' // سجل تجاري
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
  nationality?: string;
  birthDate?: Date;
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
