import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { LedgerAccount, LedgerAccountType, CreateLedgerAccountDto } from '../../../@core/domain/models/accounting.model';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';
import { AlertService } from '../../../@shared/services/alert.service';
import { AccountingService } from '../../../@core/application/services/accounting.service';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    HasPermissionDirective
  ],
  templateUrl: './accounts-list.component.html',
  styleUrls: ['./accounts-list.component.scss']
})
export class AccountsListComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private alertService = inject(AlertService);

  Permission = Permission;
  LedgerAccountType = LedgerAccountType;

  accounts: LedgerAccount[] = [];
  filteredAccounts: LedgerAccount[] = [];

  searchTerm = '';
  typeFilter: LedgerAccountType | 'All' = 'All';

  // For new account modal
  showNewAccountModal = false;
  newAccount: Partial<CreateLedgerAccountDto> = {
    name: '',
    type: LedgerAccountType.Asset
  };

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    this.accountingService.getAllAccounts().subscribe(accounts => {
      this.accounts = accounts;
      this.applyFilters();
    });
  }

  applyFilters() {
    let filtered = [...this.accounts];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(acc => acc.name.toLowerCase().includes(term));
    }

    if (this.typeFilter !== 'All') {
      filtered = filtered.filter(acc => acc.type === this.typeFilter);
    }

    this.filteredAccounts = filtered;
  }

  getTypeLabel(type: LedgerAccountType): string {
    const labels: Record<string, string> = {
      'Asset': 'أصول',
      'Liability': 'التزامات',
      'Revenue': 'إيرادات',
      'Expense': 'مصروفات',
      'Equity': 'حقوق ملكية'
    };
    return labels[type] || type;
  }

  getTypeClass(type: LedgerAccountType): string {
    const classes: Record<string, string> = {
      'Asset': 'bg-success',
      'Liability': 'bg-danger',
      'Revenue': 'bg-primary',
      'Expense': 'bg-warning',
      'Equity': 'bg-info'
    };
    return classes[type] || 'bg-secondary';
  }

  openNewAccountModal() {
    this.newAccount = { name: '', type: LedgerAccountType.Asset };
    this.showNewAccountModal = true;
  }

  closeNewAccountModal() {
    this.showNewAccountModal = false;
  }

  saveNewAccount() {
    if (!this.newAccount.name?.trim()) {
      this.alertService.toastWarn('يرجى إدخال اسم الحساب');
      return;
    }

    const dto: CreateLedgerAccountDto = {
      name: this.newAccount.name!.trim(),
      type: this.newAccount.type!
    };

    this.accountingService.createAccount(dto).subscribe({
      next: () => {
        this.alertService.toastSuccess('تم إضافة الحساب بنجاح');
        this.closeNewAccountModal();
        this.loadAccounts();
      },
      error: (err) => {
        this.alertService.toastError('فشل إضافة الحساب');
      }
    });
  }

  async deleteAccount(account: LedgerAccount) {
    if (account.balance !== 0) {
      this.alertService.toastError('لا يمكن حذف حساب له رصيد');
      return;
    }

    // Prevent deletion of system accounts
    if (account.id === 'ACCT_CASH' || account.id === 'ACCT_BANK') {
      this.alertService.toastError('لا يمكن حذف الحسابات الأساسية');
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: 'حذف الحساب',
      text: `هل أنت متأكد من حذف حساب "${account.name}"؟`,
      icon: 'warning'
    });

    if (confirmed) {
      this.accountingService.deleteAccount(account.id).subscribe({
        next: () => {
          this.alertService.toastSuccess('تم حذف الحساب بنجاح');
          this.loadAccounts();
        },
        error: () => {
          this.alertService.toastError('فشل حذف الحساب');
        }
      });
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.typeFilter = 'All';
    this.applyFilters();
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }
}
