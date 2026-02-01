/**
 * Renter Domain Model
 * Represents a tenant/renter in the system
 */

export interface Renter {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  nationalId?: string;
  nationality?: string;
  address?: string;
  employer?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  status: RenterStatus;

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

export enum RenterStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Blacklisted = 'Blacklisted'
}

export interface CreateRenterDto {
  fullName: string;
  phone: string;
  email: string;
  nationalId?: string;
  nationality?: string;
  hasAccount: boolean;
}

export interface UpdateRenterDto extends Partial<CreateRenterDto> {
  status?: RenterStatus;
}
