import { Observable } from 'rxjs';
import { LedgerAccount, LedgerEntry, CreateLedgerAccountDto, CreateLedgerEntryDto } from '../../domain/models';

export interface AccountingRepository {
  // Ledger Accounts
  getAllAccounts(): Observable<LedgerAccount[]>;
  getAccountById(id: string): Observable<LedgerAccount | undefined>;
  createAccount(dto: CreateLedgerAccountDto): Observable<LedgerAccount>;
  updateAccountBalance(accountId: string, balance: number): Observable<LedgerAccount>;
  deleteAccount(id: string): Observable<void>;

  // Ledger Entries
  getAllEntries(): Observable<LedgerEntry[]>;
  getEntriesByAccountId(accountId: string): Observable<LedgerEntry[]>;
  createEntry(dto: CreateLedgerEntryDto): Observable<LedgerEntry>;
}
