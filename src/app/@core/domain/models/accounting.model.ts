/**
 * Accounting Domain Models
 * Represents ledger accounts and entries for Trust/Clearing Accounting
 *
 * Account Structure:
 * - Assets: Cash, Bank, Tenant Receivables
 * - Liabilities: Owner Payables (amounts owed to owners)
 * - Revenue: Admin Fees
 * - Expenses: Unit Maintenance/Repair Expenses
 */

export interface LedgerAccount {
  id: string;
  code?: string;          // Account code for chart of accounts
  parentId?: string;
  name: string;
  type: LedgerAccountType;

  // Entity Links (for dynamic accounts)
  ownerId?: string;
  unitId?: string;
  renterId?: string;

  // Balance (debit-positive for Assets/Expenses, credit-positive for Liabilities/Revenue)
  balance: number;

  // Metadata
  isSystem?: boolean;     // System accounts cannot be deleted

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export enum LedgerAccountType {
  Asset = 'Asset',           // Cash, Bank, Tenant Receivables
  Liability = 'Liability',   // Owner Payables
  Revenue = 'Revenue',       // Admin Fee Revenue
  Expense = 'Expense',       // Unit Expenses
  Equity = 'Equity'
}

export interface LedgerEntry {
  id: string;
  transactionId?: string;   // Groups related entries together
  accountId: string;
  date: Date;
  debit: number;
  credit: number;
  note: string;

  // Reference to originating transaction
  referenceType?: string;   // 'RentPayment', 'OwnerPayout', 'Maintenance', 'Lease'
  referenceId?: string;

  // Audit
  createdAt: Date;
}

export interface CreateLedgerAccountDto {
  code?: string;
  parentId?: string;
  name: string;
  type: LedgerAccountType;
  ownerId?: string;
  unitId?: string;
  renterId?: string;
  balance?: number;
  isSystem?: boolean;
}

export interface CreateLedgerEntryDto {
  transactionId?: string;
  accountId: string;
  date: Date;
  debit: number;
  credit: number;
  note: string;
  referenceType?: string;
  referenceId?: string;
}

// ============================================
// TRANSACTION DTOs
// ============================================

export interface RecordRentPaymentDto {
  leaseId: string;
  scheduleItemIndex: number;
  receivedAmount: number;
  receivedDate: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'check';
  adminFeePercentage: number;  // e.g., 5 for 5%
  note?: string;
}

export interface PayOwnerDto {
  ownerId: string;
  amount: number;
  payoutDate: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'check';
  note?: string;
}

export interface RecordMaintenanceExpenseDto {
  unitId: string;
  amount: number;
  expenseDate: Date;
  description: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'check';
}

