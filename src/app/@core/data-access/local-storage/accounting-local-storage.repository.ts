import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { LedgerAccount, LedgerEntry, CreateLedgerAccountDto, CreateLedgerEntryDto, LedgerAccountType } from '../../domain/models';
import { AccountingRepository } from '../interfaces';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AccountingLocalStorageRepository implements AccountingRepository {
  private readonly ACCOUNTS_KEY = 'ledger.accounts';
  private readonly ENTRIES_KEY = 'ledger.entries';

  constructor(private storage: LocalStorageService) {
    this.initializeDefaultAccounts();
  }

  private initializeDefaultAccounts(): void {
    const accounts = this.storage.getItem<LedgerAccount[]>(this.ACCOUNTS_KEY);
    if (!accounts || accounts.length === 0) {
      // Create system accounts for Trust Accounting
      const defaultAccounts: LedgerAccount[] = [
        {
          id: 'ACCT_CASH',
          code: 'CASH',
          name: 'الصندوق النقدي',
          type: LedgerAccountType.Asset,
          balance: 0,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'ACCT_BANK',
          code: 'BANK',
          name: 'البنك',
          type: LedgerAccountType.Asset,
          balance: 0,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'ACCT_ADMIN_FEE',
          code: 'ADMIN_FEE',
          name: 'إيرادات رسوم الإدارة',
          type: LedgerAccountType.Revenue,
          balance: 0,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      this.storage.setItem(this.ACCOUNTS_KEY, defaultAccounts);
      // Clear entries too for fresh start
      this.storage.setItem(this.ENTRIES_KEY, []);
    } else {
      // Ensure Admin Fee account exists in existing data
      const hasAdminFee = accounts.some(a => a.id === 'ACCT_ADMIN_FEE');
      if (!hasAdminFee) {
        accounts.push({
          id: 'ACCT_ADMIN_FEE',
          code: 'ADMIN_FEE',
          name: 'إيرادات رسوم الإدارة',
          type: LedgerAccountType.Revenue,
          balance: 0,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        this.storage.setItem(this.ACCOUNTS_KEY, accounts);
      }
    }
  }

  /**
   * Clear all accounting data for demo reset
   */
  clearAllData(): void {
    this.storage.setItem(this.ACCOUNTS_KEY, []);
    this.storage.setItem(this.ENTRIES_KEY, []);
    // Also clear old keys used by previous implementation
    localStorage.removeItem('ledger_accounts');
    localStorage.removeItem('ledger_entries');
    this.initializeDefaultAccounts();
  }

  /**
   * Clear only entries and reset account balances to zero
   * Keeps all accounts (owners, renters, units) intact
   */
  clearEntriesOnly(): void {
    // Clear all entries
    this.storage.setItem(this.ENTRIES_KEY, []);

    // Reset all account balances to zero
    const accounts = this.storage.getItem<LedgerAccount[]>(this.ACCOUNTS_KEY) || [];
    accounts.forEach(account => {
      account.balance = 0;
      account.updatedAt = new Date();
    });
    this.storage.setItem(this.ACCOUNTS_KEY, accounts);
  }

  // Ledger Accounts
  getAllAccounts(): Observable<LedgerAccount[]> {
    const accounts = this.storage.getItem<LedgerAccount[]>(this.ACCOUNTS_KEY) || [];
    return of(accounts);
  }

  getAccountById(id: string): Observable<LedgerAccount | undefined> {
    const accounts = this.storage.getItem<LedgerAccount[]>(this.ACCOUNTS_KEY) || [];
    return of(accounts.find(a => a.id === id));
  }

  createAccount(dto: CreateLedgerAccountDto): Observable<LedgerAccount> {
    const accounts = this.storage.getItem<LedgerAccount[]>(this.ACCOUNTS_KEY) || [];

    const newAccount: LedgerAccount = {
      id: this.generateId('ACCT'),
      ...dto,
      balance: dto.balance || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    accounts.push(newAccount);
    this.storage.setItem(this.ACCOUNTS_KEY, accounts);
    return of(newAccount);
  }

  updateAccountBalance(accountId: string, balance: number): Observable<LedgerAccount> {
    const accounts = this.storage.getItem<LedgerAccount[]>(this.ACCOUNTS_KEY) || [];
    const index = accounts.findIndex(a => a.id === accountId);

    if (index === -1) {
      throw new Error('Account not found');
    }

    accounts[index].balance = balance;
    accounts[index].updatedAt = new Date();

    this.storage.setItem(this.ACCOUNTS_KEY, accounts);
    return of(accounts[index]);
  }

  deleteAccount(id: string): Observable<void> {
    const accounts = this.storage.getItem<LedgerAccount[]>(this.ACCOUNTS_KEY) || [];
    const filtered = accounts.filter(a => a.id !== id);
    this.storage.setItem(this.ACCOUNTS_KEY, filtered);
    return of(void 0);
  }

  // Ledger Entries
  getAllEntries(): Observable<LedgerEntry[]> {
    const entries = this.storage.getItem<LedgerEntry[]>(this.ENTRIES_KEY) || [];
    return of(entries);
  }

  getEntriesByAccountId(accountId: string): Observable<LedgerEntry[]> {
    return this.getAllEntries().pipe(
      map(entries => entries.filter(e => e.accountId === accountId))
    );
  }

  createEntry(dto: CreateLedgerEntryDto): Observable<LedgerEntry> {
    const entries = this.storage.getItem<LedgerEntry[]>(this.ENTRIES_KEY) || [];

    const newEntry: LedgerEntry = {
      id: this.generateId('ENTR'),
      ...dto,
      createdAt: new Date()
    };

    entries.push(newEntry);
    this.storage.setItem(this.ENTRIES_KEY, entries);

    // Update account balance
    this.updateBalance(dto.accountId, dto.debit, dto.credit);

    return of(newEntry);
  }

  private updateBalance(accountId: string, debit: number, credit: number): void {
    const accounts = this.storage.getItem<LedgerAccount[]>(this.ACCOUNTS_KEY) || [];
    const account = accounts.find(a => a.id === accountId);

    if (account) {
      account.balance += (debit - credit);
      account.updatedAt = new Date();
      this.storage.setItem(this.ACCOUNTS_KEY, accounts);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }
}
