import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OwnerStatus } from '../../../@core/domain/models/owner.model';
import { UnitStatus } from '../../../@core/domain/models/unit.model';
import { LeaseStatus, PaymentStatus } from '../../../@core/domain/models/lease.model';
import { RequestStatus } from '../../../@core/domain/models/request.model';

type Status = OwnerStatus | UnitStatus | LeaseStatus | RequestStatus | PaymentStatus | string;

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="badgeClass">
      {{ label }}
    </span>
  `,
  styles: [`
    .badge {
      font-size: 0.875rem;
      padding: 0.375rem 0.75rem;
    }
  `]
})
export class StatusBadgeComponent {
  @Input() status: Status = '';
  @Input() customLabel?: string;

  get label(): string {
    if (this.customLabel) return this.customLabel;
    return this.getStatusLabel(this.status);
  }

  get badgeClass(): string {
    return this.getStatusClass(this.status);
  }

  private getStatusLabel(status: Status): string {
    const labels: Record<string, string> = {
      // Owner statuses
      'Active': 'نشط',
      'Inactive': 'غير نشط',
      'Suspended': 'موقوف',

      // Renter statuses
      'Blacklisted': 'محظور',

      // Unit statuses
      'Available': 'متاح',
      'Rented': 'مؤجر',
      'Maintenance': 'صيانة',
      'Reserved': 'محجوز',

      // Lease statuses
      'Draft': 'مسودة',
      'Expired': 'منتهي',
      'Cancelled': 'ملغي',

      // Request statuses
      'New': 'جديد',
      'InProgress': 'قيد التنفيذ',
      'OnHold': 'معلق',
      'Resolved': 'محلول',
      'Closed': 'مغلق',

      // Payment statuses
      'Pending': 'معلق',
      'Paid': 'مدفوع',
      'PartiallyPaid': 'مدفوع جزئياً',
      'Overdue': 'متأخر'
    };

    return labels[status] || status;
  }

  private getStatusClass(status: Status): string {
    const classes: Record<string, string> = {
      // Owner statuses
      'Active': 'bg-success',
      'Inactive': 'bg-secondary',
      'Suspended': 'bg-danger',

      // Renter statuses
      'Blacklisted': 'bg-dark',

      // Unit statuses
      'Available': 'bg-success',
      'Rented': 'bg-primary',
      'Maintenance': 'bg-warning',
      'Reserved': 'bg-info',

      // Lease statuses
      'Draft': 'bg-secondary',
      'Expired': 'bg-warning',
      'Cancelled': 'bg-danger',

      // Request statuses
      'New': 'bg-info',
      'InProgress': 'bg-primary',
      'OnHold': 'bg-warning',
      'Resolved': 'bg-success',
      'Closed': 'bg-secondary',

      // Payment statuses
      'Pending': 'bg-warning',
      'Paid': 'bg-success',
      'PartiallyPaid': 'bg-info',
      'Overdue': 'bg-danger'
    };

    return classes[status] || 'bg-secondary';
  }
}
