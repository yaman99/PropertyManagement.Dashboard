import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { LedgerAccount, LedgerAccountType, LedgerEntry } from '../../../@core/domain/models/accounting.model';
import { LeaseStatus, PaymentStatus } from '../../../@core/domain/models/lease.model';
import { RequestStatus } from '../../../@core/domain/models/request.model';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';
import { AccountingService } from '../../../@core/application/services/accounting.service';
import { AlertService } from '../../../@shared/services/alert.service';
import { LeasesService } from '../../../@core/application/services/leases.service';
import { RequestsService } from '../../../@core/application/services/requests.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-accounting-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    HasPermissionDirective
  ],
  templateUrl: './accounting-dashboard.component.html',
  styleUrls: ['./accounting-dashboard.component.scss']
})
export class AccountingDashboardComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private alertService = inject(AlertService);
  private leasesService = inject(LeasesService);
  private requestsService = inject(RequestsService);

  Permission = Permission;

  accounts: LedgerAccount[] = [];
  entries: LedgerEntry[] = [];

  // Summary stats
  totalAssets = 0;
  totalLiabilities = 0;
  totalRevenue = 0;
  totalExpenses = 0;
  netBalance = 0;

  // Trust Accounting KPIs
  totalOwedToOwners = 0;
  overduePaymentsCount = 0;
  openRequestsCount = 0;
  adminFeeRevenue = 0;

  recentEntries: LedgerEntry[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Load accounts from service
    this.accountingService.getAllAccounts().subscribe(accounts => {
      this.accounts = accounts;
      this.calculateSummary();
    });

    // Load entries from service
    this.accountingService.getAllEntries().subscribe(entries => {
      this.entries = entries;
      // Sort by date descending and take last 10
      this.recentEntries = [...entries]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
    });

    // Load KPIs
    this.loadKPIs();
  }

  loadKPIs() {
    // Load total owed to owners
    this.accountingService.getTotalOwedToOwners().subscribe(total => {
      this.totalOwedToOwners = total;
    });

    // Load admin fee revenue
    this.accountingService.getAdminFeeRevenue().subscribe(total => {
      this.adminFeeRevenue = total;
    });

    // Load overdue payments count
    this.leasesService.getAll().subscribe(leases => {
      const today = new Date();
      let overdueCount = 0;
      leases.forEach(lease => {
        if (lease.status === LeaseStatus.Active && lease.paymentSchedule) {
          lease.paymentSchedule.forEach(payment => {
            if (payment.status === PaymentStatus.Pending && new Date(payment.dueDate) < today) {
              overdueCount++;
            }
          });
        }
      });
      this.overduePaymentsCount = overdueCount;
    });

    // Load open requests count
    this.requestsService.getAll().subscribe(requests => {
      this.openRequestsCount = requests.filter(r =>
        r.status === RequestStatus.New || r.status === RequestStatus.InProgress
      ).length;
    });
  }

  calculateSummary() {
    this.totalAssets = this.accounts
      .filter(a => a.type === LedgerAccountType.Asset)
      .reduce((sum, a) => sum + a.balance, 0);

    // Liability and Revenue accounts store balance as negative (credit-positive)
    // Use Math.abs() for display
    this.totalLiabilities = Math.abs(this.accounts
      .filter(a => a.type === LedgerAccountType.Liability)
      .reduce((sum, a) => sum + a.balance, 0));

    this.totalRevenue = Math.abs(this.accounts
      .filter(a => a.type === LedgerAccountType.Revenue)
      .reduce((sum, a) => sum + a.balance, 0));

    this.totalExpenses = this.accounts
      .filter(a => a.type === LedgerAccountType.Expense)
      .reduce((sum, a) => sum + a.balance, 0);

    // Net balance: Assets - Liabilities (both as positive numbers now)
    this.netBalance = this.totalAssets - this.totalLiabilities;
  }

  getAccountName(accountId: string): string {
    return this.accounts.find(a => a.id === accountId)?.name || 'غير معروف';
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }

  async resetData() {
    const confirmed = await this.alertService.confirm({
      title: 'إعادة تعيين البيانات',
      text: 'سيتم حذف جميع الحسابات والقيود. هل أنت متأكد؟',
      icon: 'warning'
    });

    if (confirmed) {
      this.accountingService.clearAllData();
      this.alertService.toastSuccess('تم إعادة تعيين البيانات بنجاح');
      this.loadData();
    }
  }

  async clearEntries() {
    const confirmed = await this.alertService.confirm({
      title: 'مسح القيود فقط',
      text: 'سيتم حذف جميع القيود وتصفير الأرصدة مع الإبقاء على الحسابات. هل أنت متأكد؟',
      icon: 'question'
    });

    if (confirmed) {
      this.accountingService.clearEntriesOnly();
      this.alertService.toastSuccess('تم مسح القيود وتصفير الأرصدة بنجاح');
      this.loadData();
    }
  }
}
