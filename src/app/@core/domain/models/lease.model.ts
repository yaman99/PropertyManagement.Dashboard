/**
 * Lease Domain Model
 * Represents a rental agreement between owner, renter, and unit
 */

export interface Lease {
  id: string;
  ownerId: string;
  renterId: string;
  unitId: string;

  // Agreement Details
  startDate: Date;
  endDate: Date;
  paymentCycle: PaymentCycle;
  rentAmount: number;
  depositAmount?: number;
  dueDayOfMonth?: number;

  // Status
  status: LeaseStatus;

  // Payment Schedule
  paymentSchedule: PaymentScheduleItem[];

  // Accounting Integration
  renterAccountId: string;
  unitLedgerAccountId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentCycle {
  Monthly = 'Monthly',
  Quarterly = 'Quarterly',
  Yearly = 'Yearly'
}

export enum LeaseStatus {
  Draft = 'Draft',
  Active = 'Active',
  Expired = 'Expired',
  Cancelled = 'Cancelled'
}

export interface PaymentScheduleItem {
  dueDate: Date;
  amount: number;
  status: PaymentStatus;
  paidDate?: Date;
  paidAmount?: number;
}

export enum PaymentStatus {
  Pending = 'Pending',
  Paid = 'Paid',
  Overdue = 'Overdue',
  PartiallyPaid = 'PartiallyPaid'
}

export interface CreateLeaseDto {
  ownerId: string;
  renterId: string;
  unitId: string;
  startDate: Date;
  endDate: Date;
  paymentCycle: PaymentCycle;
  rentAmount: number;
  depositAmount?: number;
  dueDayOfMonth?: number;
  paymentSchedule?: PaymentScheduleItem[];
}

export interface UpdateLeaseDto extends Partial<CreateLeaseDto> {
  status?: LeaseStatus;
}
