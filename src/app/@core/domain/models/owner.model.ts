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

export interface CreateOwnerDto {
  fullName: string;
  phone: string;
  email: string;
  nationalId?: string;
  address?: string;
  notes?: string;
  hasAccount: boolean;
}

export interface UpdateOwnerDto extends Partial<CreateOwnerDto> {
  status?: OwnerStatus;
}
