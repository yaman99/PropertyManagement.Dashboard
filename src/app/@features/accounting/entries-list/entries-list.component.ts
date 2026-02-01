import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { LedgerAccount, LedgerEntry } from '../../../@core/domain/models/accounting.model';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';
import { AlertService } from '../../../@shared/services/alert.service';
import { AccountingService } from '../../../@core/application/services/accounting.service';

@Component({
  selector: 'app-entries-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    HasPermissionDirective
  ],
  templateUrl: './entries-list.component.html',
  styleUrls: ['./entries-list.component.scss']
})
export class EntriesListComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private alertService = inject(AlertService);

  Permission = Permission;

  accounts: LedgerAccount[] = [];
  entries: LedgerEntry[] = [];
  filteredEntries: LedgerEntry[] = [];

  searchTerm = '';
  accountFilter = 'All';
  dateFrom = '';
  dateTo = '';

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.accountingService.getAllAccounts().subscribe(accounts => {
      this.accounts = accounts;
    });

    this.accountingService.getAllEntries().subscribe(entries => {
      this.entries = entries;
      this.applyFilters();
    });
  }

  applyFilters() {
    let filtered = [...this.entries];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.note?.toLowerCase().includes(term) ||
        this.getAccountName(entry.accountId).toLowerCase().includes(term)
      );
    }

    if (this.accountFilter !== 'All') {
      filtered = filtered.filter(entry => entry.accountId === this.accountFilter);
    }

    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      filtered = filtered.filter(entry => new Date(entry.date) >= from);
    }

    if (this.dateTo) {
      const to = new Date(this.dateTo);
      filtered = filtered.filter(entry => new Date(entry.date) <= to);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    this.filteredEntries = filtered;
  }

  getAccountName(accountId: string): string {
    return this.accounts.find(a => a.id === accountId)?.name || 'غير معروف';
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  }

  getTotalDebit(): number {
    return this.filteredEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
  }

  getTotalCredit(): number {
    return this.filteredEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }

  clearFilters() {
    this.searchTerm = '';
    this.accountFilter = 'All';
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilters();
  }
}
