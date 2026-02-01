import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Request, RequestCategory, RequestPriority, RequestStatus, RequestComment } from '../../../@core/domain/models/request.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { Renter } from '../../../@core/domain/models/renter.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { RecordMaintenanceExpenseDto } from '../../../@core/domain/models/accounting.model';
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
  selector: 'app-request-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    HasPermissionDirective
  ],
  templateUrl: './request-detail.component.html',
  styleUrls: ['./request-detail.component.scss']
})
export class RequestDetailComponent implements OnInit {
  request: Request | null = null;
  unit: Unit | null = null;
  renter: Renter | null = null;
  owner: Owner | null = null;
  loading = true;

  newComment = '';
  newStatus: RequestStatus | null = null;

  // Expense Modal
  showExpenseModal = false;
  expenseForm = {
    amount: 0,
    description: '',
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'check'
  };
  isRecordingExpense = false;
  expenseRecorded = false;

  Permission = Permission;
  RequestStatus = RequestStatus;

  statuses = Object.values(RequestStatus);

  private readonly STORAGE_KEY = 'requests';

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private accountingService: AccountingService
  ) {}

  ngOnInit() {
    const requestId = this.route.snapshot.paramMap.get('id');
    if (requestId) {
      this.loadRequest(requestId);
    }
  }

  loadRequest(id: string) {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const requests: Request[] = stored ? JSON.parse(stored) : [];
    this.request = requests.find(r => r.id === id) || null;

    if (this.request) {
      this.newStatus = this.request.status;

      // Load related unit
      if (this.request.unitId) {
        const units = this.store.selectSnapshot(UnitsState.units);
        this.unit = units.find(u => u.id === this.request?.unitId) || null;
      }

      // Load owner - first try from unit, then from request
      const owners = this.store.selectSnapshot(OwnersState.owners);
      const ownerIdToFind = this.unit?.ownerId || this.request.ownerId;
      if (ownerIdToFind) {
        this.owner = owners.find(o => o.id === ownerIdToFind) || null;
      }

      // Load related renter
      if (this.request.renterId) {
        const renters = this.store.selectSnapshot(RentersState.renters);
        this.renter = renters.find(r => r.id === this.request?.renterId) || null;
      }

      // Check if expense was already recorded for this request
      this.checkExpenseRecorded();
    }

    this.loading = false;
  }

  checkExpenseRecorded() {
    // Check in localStorage if expense was recorded for this request
    const expenseKey = `expense_recorded_${this.request?.id}`;
    this.expenseRecorded = localStorage.getItem(expenseKey) === 'true';
  }

  getCategoryLabel(category: RequestCategory): string {
    const labels: Record<string, string> = {
      'Maintenance': 'صيانة عامة',
      'Plumbing': 'سباكة',
      'Electrical': 'كهرباء',
      'HVAC': 'تكييف',
      'Cleaning': 'نظافة',
      'Security': 'أمن',
      'Other': 'أخرى'
    };
    return labels[category] || category;
  }

  getPriorityLabel(priority: RequestPriority): string {
    const labels: Record<string, string> = {
      'Low': 'منخفضة',
      'Medium': 'متوسطة',
      'High': 'عالية',
      'Urgent': 'عاجلة'
    };
    return labels[priority] || priority;
  }

  getPriorityClass(priority: RequestPriority): string {
    const classes: Record<string, string> = {
      'Low': 'bg-secondary',
      'Medium': 'bg-info',
      'High': 'bg-warning',
      'Urgent': 'bg-danger'
    };
    return classes[priority] || 'bg-secondary';
  }

  getStatusLabel(status: RequestStatus): string {
    const labels: Record<string, string> = {
      'New': 'جديد',
      'InProgress': 'قيد التنفيذ',
      'OnHold': 'معلق',
      'Resolved': 'تم الحل',
      'Closed': 'مغلق',
      'Cancelled': 'ملغي'
    };
    return labels[status] || status;
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA') + ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  }

  updateStatus() {
    if (!this.request || !this.newStatus) return;

    const stored = localStorage.getItem(this.STORAGE_KEY);
    let requests: Request[] = stored ? JSON.parse(stored) : [];

    const index = requests.findIndex(r => r.id === this.request?.id);
    if (index !== -1) {
      requests[index].status = this.newStatus;
      requests[index].updatedAt = new Date();

      // Add system comment for status change
      const comment: RequestComment = {
        id: 'CMT-' + Date.now(),
        by: 'النظام',
        text: `تم تغيير الحالة إلى: ${this.getStatusLabel(this.newStatus)}`,
        at: new Date()
      };
      requests[index].comments = [...(requests[index].comments || []), comment];

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
      this.request = requests[index];

      this.alertService.toastSuccess('تم تحديث حالة الطلب');
    }
  }

  addComment() {
    if (!this.request || !this.newComment.trim()) return;

    const stored = localStorage.getItem(this.STORAGE_KEY);
    let requests: Request[] = stored ? JSON.parse(stored) : [];

    const index = requests.findIndex(r => r.id === this.request?.id);
    if (index !== -1) {
      const comment: RequestComment = {
        id: 'CMT-' + Date.now(),
        by: 'المدير',
        text: this.newComment.trim(),
        at: new Date()
      };

      requests[index].comments = [...(requests[index].comments || []), comment];
      requests[index].updatedAt = new Date();

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
      this.request = requests[index];
      this.newComment = '';

      this.alertService.toastSuccess('تم إضافة التعليق');
    }
  }

  goBack() {
    this.router.navigate(['/app/requests']);
  }

  // Expense Modal Methods
  openExpenseModal() {
    this.expenseForm = {
      amount: 0,
      description: `مصروفات صيانة - ${this.getCategoryLabel(this.request?.category || RequestCategory.Other)}`,
      paymentMethod: 'cash'
    };
    this.showExpenseModal = true;
  }

  closeExpenseModal() {
    this.showExpenseModal = false;
    this.expenseForm = {
      amount: 0,
      description: '',
      paymentMethod: 'cash'
    };
  }

  recordExpense() {
    if (!this.request || !this.owner || !this.unit) {
      this.alertService.toastError('بيانات غير مكتملة');
      return;
    }

    if (this.expenseForm.amount <= 0) {
      this.alertService.toastError('يرجى إدخال مبلغ صحيح');
      return;
    }

    this.isRecordingExpense = true;

    const dto: RecordMaintenanceExpenseDto = {
      unitId: this.unit.id,
      amount: this.expenseForm.amount,
      expenseDate: new Date(),
      description: this.expenseForm.description || `مصروفات طلب #${this.request.id}`,
      paymentMethod: this.expenseForm.paymentMethod
    };

    this.accountingService.recordMaintenanceExpense(
      dto,
      this.owner.id,
      this.owner.fullName,
      this.unit.unitCode
    ).subscribe({
      next: (result) => {
        if (result.success) {
          // Mark expense as recorded for this request
          const expenseKey = `expense_recorded_${this.request!.id}`;
          localStorage.setItem(expenseKey, 'true');
          this.expenseRecorded = true;

          // Add comment to request
          const stored = localStorage.getItem(this.STORAGE_KEY);
          let requests: Request[] = stored ? JSON.parse(stored) : [];
          const index = requests.findIndex(r => r.id === this.request?.id);
          if (index !== -1) {
            const comment: RequestComment = {
              id: 'CMT-' + Date.now(),
              by: 'النظام',
              text: `تم تسجيل مصروفات بمبلغ ${this.expenseForm.amount.toLocaleString()} ريال - ${this.expenseForm.description}`,
              at: new Date()
            };
            requests[index].comments = [...(requests[index].comments || []), comment];
            requests[index].updatedAt = new Date();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
            this.request = requests[index];
          }

          this.alertService.toastSuccess('تم تسجيل المصروفات بنجاح');
          this.closeExpenseModal();
        } else {
          this.alertService.toastError(result.message || 'حدث خطأ أثناء تسجيل المصروفات');
        }
        this.isRecordingExpense = false;
      },
      error: (error) => {
        console.error('Error recording expense:', error);
        this.alertService.toastError('حدث خطأ أثناء تسجيل المصروفات');
        this.isRecordingExpense = false;
      }
    });
  }

  canRecordExpense(): boolean {
    // Can record expense if: request exists, has unit, has owner, status is Resolved or Closed
    return !!(
      this.request &&
      this.unit &&
      this.owner &&
      ['Resolved', 'Closed'].includes(this.request.status) &&
      !this.expenseRecorded
    );
  }
}
