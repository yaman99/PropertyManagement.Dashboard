import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, forkJoin } from 'rxjs';
import {
  LedgerAccount,
  LedgerEntry,
  CreateLedgerAccountDto,
  CreateLedgerEntryDto,
  LedgerAccountType,
  RecordRentPaymentDto,
  PayOwnerDto,
  RecordMaintenanceExpenseDto
} from '../../domain/models/accounting.model';
import { Owner } from '../../domain/models/owner.model';
import { Unit } from '../../domain/models/unit.model';
import { Renter } from '../../domain/models/renter.model';
import { Lease } from '../../domain/models/lease.model';
import { AccountingRepository } from '../../data-access/interfaces';
import { AccountingLocalStorageRepository } from '../../data-access/local-storage/accounting-local-storage.repository';

/**
 * Accounting Application Service
 * Implements Trust/Clearing Accounting for Property Management
 *
 * FLOW:
 * 1. Tenant pays rent → We receive cash
 * 2. We deduct admin fee → Admin Fee Revenue increases
 * 3. Net amount → Owner's payable balance increases
 * 4. When we pay owner → Owner's balance decreases, Cash decreases
 * 5. Maintenance expense → Expense recorded, charged to owner (reduces owner balance)
 *
 * ACCOUNT STRUCTURE:
 * - ACCT_CASH: Cash on hand (Asset)
 * - ACCT_BANK: Bank account (Asset)
 * - ACCT_ADMIN_FEE: Admin Fee Revenue (Revenue)
 * - Owner Accounts: Per-owner payable (Liability) - what we owe to owners
 * - Tenant Accounts: Per-tenant receivable (Asset) - what tenants owe us
 * - Unit Expense Accounts: Per-unit expenses (Expense) - maintenance costs
 */
@Injectable({
  providedIn: 'root'
})
export class AccountingService {
  private repository: AccountingRepository = inject(AccountingLocalStorageRepository);

  // System Account IDs
  readonly CASH_ACCOUNT_ID = 'ACCT_CASH';
  readonly BANK_ACCOUNT_ID = 'ACCT_BANK';
  readonly ADMIN_FEE_ACCOUNT_ID = 'ACCT_ADMIN_FEE';

  // ============================================
  // LEDGER ACCOUNTS - CRUD
  // ============================================

  getAllAccounts(): Observable<LedgerAccount[]> {
    return this.repository.getAllAccounts();
  }

  getAccountById(id: string): Observable<LedgerAccount | undefined> {
    return this.repository.getAccountById(id);
  }

  createAccount(dto: CreateLedgerAccountDto): Observable<LedgerAccount> {
    return this.repository.createAccount(dto);
  }

  deleteAccount(id: string): Observable<void> {
    return this.repository.deleteAccount(id);
  }

  // ============================================
  // ENTITY ACCOUNT CREATION
  // ============================================

  /**
   * Create Owner Account (Liability - what we owe to owner)
   * Called when a new owner is created
   */
  createOwnerAccount(owner: Owner): Observable<LedgerAccount> {
    const dto: CreateLedgerAccountDto = {
      code: `OWN-${owner.id?.substring(0, 8)}`,
      name: `مستحقات المالك - ${owner.fullName}`,
      type: LedgerAccountType.Liability,
      ownerId: owner.id,
      isSystem: false
    };
    return this.createAccount(dto);
  }

  /**
   * Create Tenant Account (Asset/Receivable - what tenant owes us)
   * Called when a new renter is created
   */
  createRenterAccount(renter: Renter): Observable<LedgerAccount> {
    const dto: CreateLedgerAccountDto = {
      code: `TEN-${renter.id?.substring(0, 8)}`,
      name: `ذمم المستأجر - ${renter.fullName}`,
      type: LedgerAccountType.Asset,
      renterId: renter.id,
      isSystem: false
    };
    return this.createAccount(dto);
  }

  /**
   * Create Unit Expense Account (Expense - maintenance costs for unit)
   * Called when a new unit is created
   */
  createUnitExpenseAccount(unit: Unit): Observable<LedgerAccount> {
    const dto: CreateLedgerAccountDto = {
      code: `EXP-${unit.unitCode}`,
      name: `مصروفات وحدة ${unit.unitCode}`,
      type: LedgerAccountType.Expense,
      unitId: unit.id,
      ownerId: unit.ownerId,
      isSystem: false
    };
    return this.createAccount(dto);
  }

  // Legacy method - keep for backwards compatibility
  createUnitAccount(unit: Unit): Observable<LedgerAccount> {
    return this.createUnitExpenseAccount(unit);
  }

  // ============================================
  // ACCOUNT FINDERS
  // ============================================

  getAccountByOwnerId(ownerId: string): Observable<LedgerAccount | undefined> {
    return this.getAllAccounts().pipe(
      map(accounts => accounts.find(a => a.ownerId === ownerId && a.type === LedgerAccountType.Liability))
    );
  }

  getAccountByRenterId(renterId: string): Observable<LedgerAccount | undefined> {
    return this.getAllAccounts().pipe(
      map(accounts => accounts.find(a => a.renterId === renterId))
    );
  }

  getUnitExpenseAccount(unitId: string): Observable<LedgerAccount | undefined> {
    return this.getAllAccounts().pipe(
      map(accounts => accounts.find(a => a.unitId === unitId && a.type === LedgerAccountType.Expense))
    );
  }

  // Legacy method
  getAccountByUnitId(unitId: string): Observable<LedgerAccount | undefined> {
    return this.getUnitExpenseAccount(unitId);
  }

  // ============================================
  // LEDGER ENTRIES
  // ============================================

  getAllEntries(): Observable<LedgerEntry[]> {
    return this.repository.getAllEntries();
  }

  getEntriesByAccountId(accountId: string): Observable<LedgerEntry[]> {
    return this.repository.getEntriesByAccountId(accountId);
  }

  createEntry(dto: CreateLedgerEntryDto): Observable<LedgerEntry> {
    return this.repository.createEntry(dto);
  }

  // ============================================
  // TRANSACTION: RECORD RENT PAYMENT
  // ============================================

  /**
   * Record Tenant Payment with Trust Accounting
   *
   * Flow:
   * 1. Cash/Bank increases (Debit)
   * 2. Tenant Receivable clears (Credit)
   * 3. Admin Fee Revenue recognized (Credit)
   * 4. Owner Payable increases (Credit) for net amount
   *
   * @param dto Payment details
   * @param lease The lease being paid
   * @param renterName For description
   * @param unitCode For description
   * @param ownerName For description
   */
  recordRentPaymentWithAllocation(
    dto: RecordRentPaymentDto,
    lease: Lease,
    renterName: string,
    unitCode: string,
    ownerName: string
  ): Observable<{ entries: LedgerEntry[]; adminFee: number; ownerNet: number }> {
    const transactionId = this.generateTransactionId();
    const cashAccountId = dto.paymentMethod === 'bank_transfer' ? this.BANK_ACCOUNT_ID : this.CASH_ACCOUNT_ID;

    // Calculate amounts
    const adminFee = Math.round(dto.receivedAmount * (dto.adminFeePercentage / 100) * 100) / 100;
    const ownerNet = dto.receivedAmount - adminFee;

    const baseNote = `إيجار ${unitCode} - ${renterName}`;

    return forkJoin({
      renterAccount: this.getAccountByRenterId(lease.renterId),
      ownerAccount: this.getAccountByOwnerId(lease.ownerId)
    }).pipe(
      switchMap(({ renterAccount, ownerAccount }) => {
        const entries: Observable<LedgerEntry>[] = [];

        // 1. Debit Cash/Bank (Asset increases - we received money)
        entries.push(this.createEntry({
          transactionId,
          accountId: cashAccountId,
          date: dto.receivedDate,
          debit: dto.receivedAmount,
          credit: 0,
          note: `${baseNote} - تحصيل إيجار`,
          referenceType: 'RentPayment',
          referenceId: dto.leaseId
        }));

        // 2. Credit Admin Fee Revenue (our management fee)
        entries.push(this.createEntry({
          transactionId,
          accountId: this.ADMIN_FEE_ACCOUNT_ID,
          date: dto.receivedDate,
          debit: 0,
          credit: adminFee,
          note: `${baseNote} - رسوم إدارة ${dto.adminFeePercentage}%`,
          referenceType: 'RentPayment',
          referenceId: dto.leaseId
        }));

        // 3. Credit Owner Account (Liability increases - we owe owner the net amount)
        if (ownerAccount) {
          entries.push(this.createEntry({
            transactionId,
            accountId: ownerAccount.id,
            date: dto.receivedDate,
            debit: 0,
            credit: ownerNet,
            note: `${baseNote} - صافي مستحق للمالك ${ownerName}`,
            referenceType: 'RentPayment',
            referenceId: dto.leaseId
          }));
        }

        // Note: We don't credit Tenant Receivable for direct cash payments
        // The tenant receivable is only used when tracking outstanding invoices

        return forkJoin(entries).pipe(
          map(createdEntries => ({
            entries: createdEntries,
            adminFee,
            ownerNet
          }))
        );
      })
    );
  }

  /**
   * Simplified rent payment (backwards compatible)
   * Uses default 5% admin fee
   */
  recordRentPayment(
    lease: Lease,
    amount: number,
    paymentMethod: string,
    renterName: string,
    unitCode: string,
    dueDate: Date
  ): Observable<LedgerEntry[]> {
    const dto: RecordRentPaymentDto = {
      leaseId: lease.id,
      scheduleItemIndex: 0,
      receivedAmount: amount,
      receivedDate: new Date(),
      paymentMethod: paymentMethod as 'cash' | 'bank_transfer' | 'check',
      adminFeePercentage: 5 // Default 5% admin fee
    };

    return this.recordRentPaymentWithAllocation(dto, lease, renterName, unitCode, 'المالك').pipe(
      map(result => result.entries)
    );
  }

  /**
   * When a lease is created, record the total receivable from the renter
   */
  recordLeaseReceivables(lease: Lease, renterName: string, unitCode: string): Observable<LedgerEntry[]> {
    const totalAmount = lease.paymentSchedule.reduce((sum, p) => sum + p.amount, 0);
    const transactionId = this.generateTransactionId();

    return this.getAccountByRenterId(lease.renterId).pipe(
      switchMap(renterAccount => {
        if (!renterAccount) {
          console.warn('Renter account not found');
          return of([]);
        }

        // Debit: Renter Receivable (what they owe us)
        const entry: CreateLedgerEntryDto = {
          transactionId,
          accountId: renterAccount.id,
          date: new Date(lease.startDate),
          debit: totalAmount,
          credit: 0,
          note: `عقد إيجار وحدة ${unitCode} - إجمالي الإيجار المستحق`,
          referenceType: 'Lease',
          referenceId: lease.id
        };

        return this.createEntry(entry).pipe(map(e => [e]));
      })
    );
  }

  // ============================================
  // TRANSACTION: PAY OWNER
  // ============================================

  /**
   * Pay Owner (Payout from trust account)
   *
   * Flow:
   * 1. Owner Payable decreases (Debit - we owe less)
   * 2. Cash/Bank decreases (Credit)
   *
   * @param dto Payout details
   * @param ownerName For description
   */
  payOwner(dto: PayOwnerDto, ownerName: string): Observable<{ entries: LedgerEntry[]; success: boolean; message: string }> {
    const transactionId = this.generateTransactionId();
    const cashAccountId = dto.paymentMethod === 'bank_transfer' ? this.BANK_ACCOUNT_ID : this.CASH_ACCOUNT_ID;

    return this.getAccountByOwnerId(dto.ownerId).pipe(
      switchMap(ownerAccount => {
        if (!ownerAccount) {
          return of({ entries: [], success: false, message: 'حساب المالك غير موجود' });
        }

        // For Liability accounts, balance is negative (credits increase it)
        // Use absolute value to check available balance
        const availableBalance = Math.abs(ownerAccount.balance);

        // Check if owner has sufficient balance
        if (availableBalance < dto.amount) {
          return of({
            entries: [],
            success: false,
            message: `رصيد المالك غير كافي. الرصيد الحالي: ${availableBalance.toLocaleString()} ر.س`
          });
        }

        const entries: Observable<LedgerEntry>[] = [];
        const note = `دفعة للمالك ${ownerName}${dto.note ? ' - ' + dto.note : ''}`;

        // 1. Debit Owner Account (Liability decreases - we owe less)
        entries.push(this.createEntry({
          transactionId,
          accountId: ownerAccount.id,
          date: dto.payoutDate,
          debit: dto.amount,
          credit: 0,
          note: note,
          referenceType: 'OwnerPayout',
          referenceId: dto.ownerId
        }));

        // 2. Credit Cash/Bank (Asset decreases)
        entries.push(this.createEntry({
          transactionId,
          accountId: cashAccountId,
          date: dto.payoutDate,
          debit: 0,
          credit: dto.amount,
          note: note,
          referenceType: 'OwnerPayout',
          referenceId: dto.ownerId
        }));

        return forkJoin(entries).pipe(
          map(createdEntries => ({
            entries: createdEntries,
            success: true,
            message: 'تم صرف المبلغ للمالك بنجاح'
          }))
        );
      })
    );
  }

  // ============================================
  // TRANSACTION: RECORD MAINTENANCE EXPENSE
  // ============================================

  /**
   * Record Unit Maintenance Expense
   *
   * Flow:
   * 1. Unit Expense Account increases (Debit)
   * 2. Cash/Bank decreases (Credit) - we paid for maintenance
   * 3. Owner Payable decreases (Debit) - owner's balance reduced to cover expense
   * 4. Unit Expense Account cleared (Credit)
   *
   * Net effect: Owner's balance reduced by maintenance cost
   */
  recordMaintenanceExpense(
    dto: RecordMaintenanceExpenseDto,
    ownerId: string,
    ownerName: string,
    unitCode: string
  ): Observable<{ entries: LedgerEntry[]; success: boolean; message: string }> {
    const transactionId = this.generateTransactionId();
    const cashAccountId = dto.paymentMethod === 'bank_transfer' ? this.BANK_ACCOUNT_ID : this.CASH_ACCOUNT_ID;

    return forkJoin({
      unitExpenseAccount: this.getUnitExpenseAccount(dto.unitId),
      ownerAccount: this.getAccountByOwnerId(ownerId)
    }).pipe(
      switchMap(({ unitExpenseAccount, ownerAccount }) => {
        if (!unitExpenseAccount) {
          return of({ entries: [], success: false, message: 'حساب مصروفات الوحدة غير موجود' });
        }
        if (!ownerAccount) {
          return of({ entries: [], success: false, message: 'حساب المالك غير موجود' });
        }

        const entries: Observable<LedgerEntry>[] = [];
        const note = `صيانة ${unitCode} - ${dto.description}`;

        // 1. Debit Unit Expense (Expense increases)
        entries.push(this.createEntry({
          transactionId,
          accountId: unitExpenseAccount.id,
          date: dto.expenseDate,
          debit: dto.amount,
          credit: 0,
          note: note,
          referenceType: 'Maintenance',
          referenceId: dto.unitId
        }));

        // 2. Credit Cash/Bank (we paid for it)
        entries.push(this.createEntry({
          transactionId,
          accountId: cashAccountId,
          date: dto.expenseDate,
          debit: 0,
          credit: dto.amount,
          note: note,
          referenceType: 'Maintenance',
          referenceId: dto.unitId
        }));

        // 3. Charge to owner: Debit Owner Account (reduces what we owe them)
        entries.push(this.createEntry({
          transactionId,
          accountId: ownerAccount.id,
          date: dto.expenseDate,
          debit: dto.amount,
          credit: 0,
          note: `خصم صيانة ${unitCode} من رصيد المالك ${ownerName}`,
          referenceType: 'Maintenance',
          referenceId: dto.unitId
        }));

        // 4. Credit Unit Expense (expense settled against owner)
        entries.push(this.createEntry({
          transactionId,
          accountId: unitExpenseAccount.id,
          date: dto.expenseDate,
          debit: 0,
          credit: dto.amount,
          note: `تحميل صيانة ${unitCode} على المالك`,
          referenceType: 'Maintenance',
          referenceId: dto.unitId
        }));

        return forkJoin(entries).pipe(
          map(createdEntries => ({
            entries: createdEntries,
            success: true,
            message: 'تم تسجيل مصروف الصيانة وخصمه من رصيد المالك'
          }))
        );
      })
    );
  }

  // ============================================
  // REPORTS & QUERIES
  // ============================================

  /**
   * Get owner's current balance (what we owe them)
   * Returns positive number for display
   */
  getOwnerBalance(ownerId: string): Observable<number> {
    return this.getAccountByOwnerId(ownerId).pipe(
      map(account => Math.abs(account?.balance || 0))
    );
  }

  /**
   * Get total owed to all owners
   * Returns positive number for display
   */
  getTotalOwedToOwners(): Observable<number> {
    return this.getAllAccounts().pipe(
      map(accounts =>
        accounts
          .filter(a => a.type === LedgerAccountType.Liability && a.ownerId)
          .reduce((sum, a) => sum + Math.abs(a.balance), 0)
      )
    );
  }

  /**
   * Get tenant's outstanding balance (what they owe us)
   */
  getTenantBalance(renterId: string): Observable<number> {
    return this.getAccountByRenterId(renterId).pipe(
      map(account => account?.balance || 0)
    );
  }

  /**
   * Get owner's transaction history
   */
  getOwnerTransactions(ownerId: string): Observable<LedgerEntry[]> {
    return this.getAccountByOwnerId(ownerId).pipe(
      switchMap(account => {
        if (!account) return of([]);
        return this.getEntriesByAccountId(account.id);
      }),
      map(entries => entries.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ))
    );
  }

  /**
   * Get unit expenses total
   */
  getUnitExpensesTotal(unitId: string): Observable<number> {
    return this.getUnitExpenseAccount(unitId).pipe(
      switchMap(account => {
        if (!account) return of(0);
        return this.getEntriesByAccountId(account.id).pipe(
          map(entries => entries.reduce((sum, e) => sum + e.debit - e.credit, 0))
        );
      })
    );
  }

  /**
   * Get accounts grouped by type
   */
  getAccountsByType(): Observable<Record<string, LedgerAccount[]>> {
    return this.getAllAccounts().pipe(
      map(accounts => {
        const grouped: Record<string, LedgerAccount[]> = {
          'Asset': [],
          'Liability': [],
          'Revenue': [],
          'Expense': [],
          'Equity': []
        };

        accounts.forEach(account => {
          if (grouped[account.type]) {
            grouped[account.type].push(account);
          }
        });

        return grouped;
      })
    );
  }

  /**
   * Get total by account type
   * For Liability and Revenue accounts, returns absolute value (they store as negative)
   */
  getTotalByType(type: LedgerAccountType): Observable<number> {
    return this.getAllAccounts().pipe(
      map(accounts => {
        const total = accounts
          .filter(a => a.type === type)
          .reduce((sum, a) => sum + a.balance, 0);
        // Liability and Revenue accounts have credit-positive balance (stored as negative)
        return (type === LedgerAccountType.Liability || type === LedgerAccountType.Revenue)
          ? Math.abs(total)
          : total;
      })
    );
  }

  /**
   * Get admin fee revenue total
   * Returns positive number for display
   */
  getAdminFeeRevenue(): Observable<number> {
    return this.getAccountById(this.ADMIN_FEE_ACCOUNT_ID).pipe(
      map(account => Math.abs(account?.balance || 0))
    );
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateTransactionId(): string {
    return `TXN${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Clear all data for demo reset
   */
  clearAllData(): void {
    (this.repository as AccountingLocalStorageRepository).clearAllData();
  }

  /**
   * Clear only entries and reset balances
   * Keeps accounts (owners, renters, units) intact
   */
  clearEntriesOnly(): void {
    (this.repository as AccountingLocalStorageRepository).clearEntriesOnly();
  }
}
