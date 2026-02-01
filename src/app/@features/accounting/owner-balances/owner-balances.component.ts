import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';
import { AccountingService } from '../../../@core/application/services/accounting.service';
import { OwnersService } from '../../../@core/application/services/owners.service';
import { AlertService } from '../../../@shared/services/alert.service';
import { LedgerAccount, LedgerEntry, PayOwnerDto } from '../../../@core/domain/models/accounting.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { forkJoin } from 'rxjs';

interface OwnerBalance {
  owner: Owner;
  account: LedgerAccount | undefined;
  balance: number;
}

@Component({
  selector: 'app-owner-balances',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    HasPermissionDirective
  ],
  templateUrl: './owner-balances.component.html',
  styleUrls: ['./owner-balances.component.scss']
})
export class OwnerBalancesComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private ownersService = inject(OwnersService);
  private alertService = inject(AlertService);

  Permission = Permission;

  ownerBalances: OwnerBalance[] = [];
  totalOwed = 0;
  isLoading = true;

  // Pay Owner Modal
  showPayModal = false;
  selectedOwner: OwnerBalance | null = null;
  paymentForm = {
    amount: 0,
    paymentMethod: 'bank_transfer' as 'cash' | 'bank_transfer' | 'check',
    note: ''
  };
  isProcessing = false;

  // Transaction History Modal
  showHistoryModal = false;
  historyOwner: OwnerBalance | null = null;
  transactions: LedgerEntry[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;

    forkJoin({
      owners: this.ownersService.getAll(),
      accounts: this.accountingService.getAllAccounts()
    }).subscribe(({ owners, accounts }) => {
      this.ownerBalances = owners.map(owner => {
        const account = accounts.find(a => a.ownerId === owner.id && a.type === 'Liability');
        // For Liability accounts, balance is stored as negative (credits increase liability)
        // We use absolute value for display - positive means we owe the owner
        const rawBalance = account?.balance || 0;
        return {
          owner,
          account,
          balance: Math.abs(rawBalance) // Convert to positive for display
        };
      }).filter(ob => ob.account); // Only show owners with accounts

      this.totalOwed = this.ownerBalances.reduce((sum, ob) => sum + ob.balance, 0);
      this.isLoading = false;
    });
  }

  openPayModal(ownerBalance: OwnerBalance) {
    this.selectedOwner = ownerBalance;
    this.paymentForm = {
      amount: ownerBalance.balance, // Default to full balance (already positive)
      paymentMethod: 'bank_transfer',
      note: ''
    };
    this.showPayModal = true;
  }

  closePayModal() {
    this.showPayModal = false;
    this.selectedOwner = null;
  }

  async submitPayment() {
    if (!this.selectedOwner || this.paymentForm.amount <= 0) {
      this.alertService.toastError('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (this.paymentForm.amount > this.selectedOwner.balance) {
      this.alertService.toastError('المبلغ أكبر من الرصيد المتاح');
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: 'تأكيد الصرف',
      text: `هل تريد صرف مبلغ ${this.paymentForm.amount.toLocaleString()} ر.س للمالك ${this.selectedOwner.owner.fullName}؟`,
      icon: 'question',
      confirmButtonText: 'نعم، صرف'
    });

    if (!confirmed) return;

    this.isProcessing = true;

    const dto: PayOwnerDto = {
      ownerId: this.selectedOwner.owner.id,
      amount: this.paymentForm.amount,
      payoutDate: new Date(),
      paymentMethod: this.paymentForm.paymentMethod,
      note: this.paymentForm.note
    };

    this.accountingService.payOwner(dto, this.selectedOwner.owner.fullName).subscribe({
      next: (result) => {
        this.isProcessing = false;
        if (result.success) {
          this.alertService.toastSuccess(result.message);
          this.closePayModal();
          this.loadData();
        } else {
          this.alertService.toastError(result.message);
        }
      },
      error: (err) => {
        this.isProcessing = false;
        this.alertService.toastError('حدث خطأ أثناء صرف المبلغ');
        console.error(err);
      }
    });
  }

  openHistoryModal(ownerBalance: OwnerBalance) {
    this.historyOwner = ownerBalance;
    this.transactions = [];
    this.showHistoryModal = true;

    if (ownerBalance.owner.id) {
      this.accountingService.getOwnerTransactions(ownerBalance.owner.id).subscribe(entries => {
        this.transactions = entries;
      });
    }
  }

  closeHistoryModal() {
    this.showHistoryModal = false;
    this.historyOwner = null;
    this.transactions = [];
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-SA');
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'cash': 'نقدي',
      'bank_transfer': 'تحويل بنكي',
      'check': 'شيك'
    };
    return labels[method] || method;
  }
}
