/**
 * Owner Delegation (وكالة المالك) Domain Model
 * Represents a power of attorney from an owner on a building
 */

export interface OwnerDelegation {
  id: string;
  ownerId: string;
  buildingId: string;

  // Delegatee Info (الوكيل)
  delegateeName: string;
  delegateeIdNumber?: string;    // رقم هوية الوكيل
  delegateePhone?: string;

  // Delegation Details
  delegationNumber?: string;     // رقم الوكالة
  startDate: Date;
  endDate: Date;
  documentUrl?: string;          // صورة الوكالة

  // Notes
  notes?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDelegationDto {
  ownerId: string;
  buildingId: string;
  delegateeName: string;
  delegateeIdNumber?: string;
  delegateePhone?: string;
  delegationNumber?: string;
  startDate: Date;
  endDate: Date;
  documentUrl?: string;
  notes?: string;
}

export interface UpdateDelegationDto extends Partial<CreateDelegationDto> {}

/**
 * Check if a delegation is expiring within the given number of months
 */
export function isDelegationExpiringSoon(delegation: OwnerDelegation, monthsThreshold: number = 3): boolean {
  const now = new Date();
  const endDate = new Date(delegation.endDate);
  const thresholdDate = new Date();
  thresholdDate.setMonth(thresholdDate.getMonth() + monthsThreshold);
  return endDate > now && endDate <= thresholdDate;
}

/**
 * Check if a delegation has expired
 */
export function isDelegationExpired(delegation: OwnerDelegation): boolean {
  return new Date(delegation.endDate) < new Date();
}
