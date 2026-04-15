import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import {
  Lease, LeaseStatus, PaymentCycle, PaymentStatus, PaymentScheduleItem,
  WarningType, getPaymentWarningStatus
} from '../../../@core/domain/models/lease.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { Renter } from '../../../@core/domain/models/renter.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { LedgerAccount, LedgerAccountType, RecordRentPaymentDto } from '../../../@core/domain/models/accounting.model';
import { LeasesActions, LeasesState } from '../../../@core/state/leases.state';
import { UnitsState } from '../../../@core/state/units.state';
import { RentersState } from '../../../@core/state/renters.state';
import { OwnersState } from '../../../@core/state/owners.state';
import { AccountingService } from '../../../@core/application/services/accounting.service';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { AlertService } from '../../../@shared/services/alert.service';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';

@Component({
  selector: 'app-lease-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    HasPermissionDirective
  ],
  templateUrl: './lease-detail.component.html',
  styleUrls: ['./lease-detail.component.scss']
})
export class LeaseDetailComponent implements OnInit {
  lease: Lease | null = null;
  unit: Unit | null = null;
  renter: Renter | null = null;
  owner: Owner | null = null;

  // Payment modal
  showPaymentModal = false;
  selectedPayment: PaymentScheduleItem | null = null;
  selectedPaymentIndex = -1;
  paymentAmount = 0;
  paymentMethod = 'cash';
  paymentNote = '';
  adminFeePercentage = 5; // Default 5% admin fee
  isProcessingPayment = false;

  // Calculated amounts for display
  get adminFeeAmount(): number {
    return Math.round(this.paymentAmount * (this.adminFeePercentage / 100) * 100) / 100;
  }

  get ownerNetAmount(): number {
    return this.paymentAmount - this.adminFeeAmount;
  }

  // Accounts for payment recording
  cashAccount: LedgerAccount | null = null;
  renterAccount: LedgerAccount | null = null;

  Permission = Permission;
  LeaseStatus = LeaseStatus;
  PaymentStatus = PaymentStatus;
  WarningType = WarningType;
  getPaymentWarningStatus = getPaymentWarningStatus;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private accountingService: AccountingService
  ) {}

  ngOnInit() {
    const leaseId = this.route.snapshot.paramMap.get('id');

    if (leaseId) {
      this.loadLeaseDetails(leaseId);
    } else {
      this.router.navigate(['/app/leases']);
    }
  }

  loadLeaseDetails(leaseId: string) {
    const leases = this.store.selectSnapshot(LeasesState.leases);
    this.lease = leases.find(l => l.id === leaseId) || null;

    if (!this.lease) {
      this.alertService.toastError('لم يتم العثور على العقد');
      this.router.navigate(['/app/leases']);
      return;
    }

    // Load related data
    const units = this.store.selectSnapshot(UnitsState.units);
    this.unit = units.find(u => u.id === this.lease!.unitId) || null;

    const renters = this.store.selectSnapshot(RentersState.renters);
    this.renter = renters.find(r => r.id === this.lease!.renterId) || null;

    const owners = this.store.selectSnapshot(OwnersState.owners);
    this.owner = owners.find(o => o.id === this.lease!.ownerId) || null;

    // Load accounting accounts
    this.loadAccounts();
  }

  loadAccounts() {
    this.accountingService.getAllAccounts().subscribe(accounts => {
      // Find or create cash account
      this.cashAccount = accounts.find(a => a.name === 'الصندوق النقدي') || null;

      // Find renter account
      if (this.renter) {
        this.renterAccount = accounts.find(a => a.renterId === this.renter!.id) || null;
      }
    });
  }

  getPaymentCycleLabel(cycle: PaymentCycle): string {
    const labels: Record<string, string> = {
      'Monthly': 'شهري',
      'Quarterly': 'ربع سنوي',
      'SemiAnnual': 'كل 6 أشهر',
      'Annual': 'سنوي'
    };
    return labels[cycle] || cycle;
  }

  markDepositPaid() {
    if (!this.lease) return;
    this.store.dispatch(new LeasesActions.MarkDepositPaid(this.lease.id))
      .subscribe({
        next: () => {
          this.alertService.toastSuccess('تم تأكيد دفع التأمين');
          this.loadLeaseDetails(this.lease!.id);
        },
        error: () => this.alertService.toastError('فشل تأكيد الدفع')
      });
  }

  markCommissionPaid() {
    if (!this.lease) return;
    this.store.dispatch(new LeasesActions.MarkCommissionPaid(this.lease.id))
      .subscribe({
        next: () => {
          this.alertService.toastSuccess('تم تأكيد دفع العمولة');
          this.loadLeaseDetails(this.lease!.id);
        },
        error: () => this.alertService.toastError('فشل تأكيد الدفع')
      });
  }

  getPaymentStatusLabel(status: PaymentStatus): string {
    const labels: Record<string, string> = {
      'Pending': 'في الانتظار',
      'Paid': 'مدفوع',
      'Overdue': 'متأخر',
      'PartiallyPaid': 'مدفوع جزئياً'
    };
    return labels[status] || status;
  }

  getPaymentStatusClass(status: PaymentStatus): string {
    const classes: Record<string, string> = {
      'Pending': 'bg-warning text-dark',
      'Paid': 'bg-success',
      'Overdue': 'bg-danger',
      'PartiallyPaid': 'bg-info'
    };
    return classes[status] || 'bg-secondary';
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  }

  getPaymentProgress(): { paid: number; total: number; percentage: number; paidAmount: number; totalAmount: number } {
    if (!this.lease) return { paid: 0, total: 0, percentage: 0, paidAmount: 0, totalAmount: 0 };

    const total = this.lease.paymentSchedule?.length || 0;
    const paid = this.lease.paymentSchedule?.filter(p => p.status === PaymentStatus.Paid).length || 0;
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;

    const totalAmount = this.lease.paymentSchedule?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const paidAmount = this.lease.paymentSchedule?.filter(p => p.status === PaymentStatus.Paid)
      .reduce((sum, p) => sum + (p.paidAmount || p.amount), 0) || 0;

    return { paid, total, percentage, paidAmount, totalAmount };
  }

  // Open payment modal
  openPaymentModal(payment: PaymentScheduleItem, index: number) {
    this.selectedPayment = payment;
    this.selectedPaymentIndex = index;
    this.paymentAmount = payment.amount;
    this.paymentMethod = 'cash';
    this.paymentNote = '';
    this.adminFeePercentage = 5; // Default 5%
    this.showPaymentModal = true;
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedPayment = null;
    this.selectedPaymentIndex = -1;
    this.isProcessingPayment = false;
  }

  async recordPayment(payment: PaymentScheduleItem, index: number) {
    const confirmed = await this.alertService.confirm({
      title: 'تسجيل دفعة',
      text: `هل تريد تسجيل دفعة بمبلغ ${payment.amount.toLocaleString()} ر.س؟`,
      icon: 'question'
    });

    if (confirmed && this.lease) {
      // Open modal for payment details
      this.openPaymentModal(payment, index);
    }
  }

  async confirmPayment() {
    if (!this.lease || !this.selectedPayment || this.selectedPaymentIndex < 0) {
      return;
    }

    if (this.paymentAmount <= 0) {
      this.alertService.toastError('يرجى إدخال مبلغ صحيح');
      return;
    }

    this.isProcessingPayment = true;

    const payment = this.selectedPayment;
    const index = this.selectedPaymentIndex;

    // Create the DTO for accounting
    const dto: RecordRentPaymentDto = {
      leaseId: this.lease.id,
      scheduleItemIndex: index,
      receivedAmount: this.paymentAmount,
      receivedDate: new Date(),
      paymentMethod: this.paymentMethod as 'cash' | 'bank_transfer' | 'check',
      adminFeePercentage: this.adminFeePercentage
    };

    // Record accounting entries first (proper double-entry with fee allocation)
    this.accountingService.recordRentPaymentWithAllocation(
      dto,
      this.lease,
      this.renter?.fullName || '',
      this.unit?.unitCode || '',
      this.owner?.fullName || ''
    ).subscribe({
      next: (result) => {
        // Update payment schedule
        const updatedSchedule = [...this.lease!.paymentSchedule];
        updatedSchedule[index] = {
          ...payment,
          status: PaymentStatus.Paid,
          paidDate: new Date(),
          paidAmount: this.paymentAmount
        };

        // Update lease with new payment status
        this.store.dispatch(new LeasesActions.UpdateLease(this.lease!.id, {
          paymentSchedule: updatedSchedule
        } as any)).subscribe({
          next: () => {
            this.isProcessingPayment = false;
            this.alertService.toastSuccess(
              `تم تسجيل الدفعة بنجاح\nرسوم الإدارة: ${result.adminFee.toLocaleString()} ر.س\nصافي المالك: ${result.ownerNet.toLocaleString()} ر.س`
            );
            this.closePaymentModal();
            this.loadLeaseDetails(this.lease!.id);
          },
          error: (error) => {
            this.isProcessingPayment = false;
            this.alertService.toastError('فشل تسجيل الدفعة');
          }
        });
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.alertService.toastError('فشل تسجيل القيود المحاسبية');
        console.error('Failed to create accounting entries:', err);
      }
    });
  }

  async cancelLease() {
    if (this.lease?.status !== LeaseStatus.Active) {
      this.alertService.toastError('يمكن إلغاء العقود النشطة فقط');
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: 'إلغاء العقد',
      text: 'هل أنت متأكد من إلغاء هذا العقد؟ سيتم تحرير الوحدة.',
      icon: 'warning'
    });

    if (confirmed) {
      this.store.dispatch(new LeasesActions.UpdateLease(this.lease!.id, { status: LeaseStatus.Cancelled }))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم إلغاء العقد بنجاح');
            this.loadLeaseDetails(this.lease!.id);
          },
          error: (error) => {
            this.alertService.toastError('فشل إلغاء العقد');
          }
        });
    }
  }

  // --- Late Payment Warnings ---

  async sendWarning(paymentIndex: number, warningType: WarningType) {
    if (!this.lease) return;

    const warningLabels: Record<WarningType, string> = {
      [WarningType.FirstWarning]: 'الانذار الأول',
      [WarningType.SecondWarning]: 'الانذار الثاني',
      [WarningType.FinancialLetter]: 'الخطاب المالي',
      [WarningType.EvictionNotice]: 'إشعار الإخلاء'
    };

    const confirmed = await this.alertService.confirm({
      title: `إرسال ${warningLabels[warningType]}`,
      text: `هل أنت متأكد من تسجيل إرسال ${warningLabels[warningType]} للمستأجر "${this.renter?.fullName}"؟`,
      icon: 'warning'
    });

    if (!confirmed) return;

    this.store.dispatch(new LeasesActions.SendPaymentWarning(this.lease.id, paymentIndex, warningType))
      .subscribe({
        next: () => {
          this.alertService.toastSuccess(`تم تسجيل ${warningLabels[warningType]} بنجاح`);
          this.loadLeaseDetails(this.lease!.id);
        },
        error: () => this.alertService.toastError('فشل تسجيل الانذار')
      });
  }

  async blacklistRenter() {
    if (!this.renter) return;

    const confirmed = await this.alertService.confirm({
      title: `إضافة "${this.renter.fullName}" للقائمة السوداء`,
      text: 'سيتم وضع المستأجر في القائمة السوداء ولن يظهر عند إنشاء عقود جديدة.',
      icon: 'warning'
    });

    if (!confirmed) return;

    // Import RentersActions dynamically to avoid circular deps
    const { RentersActions } = await import('../../../@core/state/renters.state');
    this.store.dispatch(new RentersActions.UpdateRenter(this.renter.id!, {
      isBlacklisted: true,
      blacklistReason: `تم إدراجه في القائمة السوداء من عقد رقم ${this.lease?.id} بتاريخ ${new Date().toLocaleDateString('ar-SA')}`,
      blacklistedAt: new Date()
    })).subscribe({
      next: () => {
        this.alertService.toastSuccess('تم إضافة المستأجر للقائمة السوداء');
        this.loadLeaseDetails(this.lease!.id);
      },
      error: () => this.alertService.toastError('فشل تحديث حالة المستأجر')
    });
  }

  hasAnyWarning(lease: Lease): boolean {
    return lease.paymentSchedule?.some(p =>
      p.warningFirstSentAt || p.warningSecondSentAt || p.financialLetterSentAt || p.evictionNoticeSentAt
    ) || false;
  }

  getOverduePayments(): { item: PaymentScheduleItem; index: number }[] {
    if (!this.lease) return [];
    return this.lease.paymentSchedule
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (item.status === PaymentStatus.Paid) return false;
        const now = new Date();
        return new Date(item.dueDate) < now;
      });
  }

  goBack() {
    this.router.navigate(['/app/leases']);
  }
}
