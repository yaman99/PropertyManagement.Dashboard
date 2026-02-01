import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import { Lease, LeaseStatus, PaymentCycle, PaymentStatus } from '../../../@core/domain/models/lease.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { Renter } from '../../../@core/domain/models/renter.model';
import { LeasesActions, LeasesState } from '../../../@core/state/leases.state';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { RentersActions, RentersState } from '../../../@core/state/renters.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../@shared/services/alert.service';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';

@Component({
  selector: 'app-leases-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    HasPermissionDirective
  ],
  templateUrl: './leases-list.component.html',
  styleUrls: ['./leases-list.component.scss']
})
export class LeasesListComponent implements OnInit {
  leases$: Observable<Lease[]>;
  units$: Observable<Unit[]>;
  renters$: Observable<Renter[]>;
  loading$: Observable<boolean>;

  searchTerm = '';
  statusFilter: LeaseStatus | 'All' = 'All';

  Permission = Permission;
  LeaseStatus = LeaseStatus;

  filteredLeases$: Observable<Lease[]>;

  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.leases$ = this.store.select(LeasesState.leases);
    this.units$ = this.store.select(UnitsState.units);
    this.renters$ = this.store.select(RentersState.renters);
    this.loading$ = this.store.select(LeasesState.loading);

    this.filteredLeases$ = this.leases$.pipe(
      map(leases => this.filterLeases(leases))
    );
  }

  ngOnInit() {
    this.store.dispatch(new LeasesActions.LoadLeases());
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new RentersActions.LoadRenters());
  }

  filterLeases(leases: Lease[]): Lease[] {
    let filtered = leases;

    // Filter by status
    if (this.statusFilter !== 'All') {
      filtered = filtered.filter(lease => lease.status === this.statusFilter);
    }

    return filtered;
  }

  applyFilters() {
    this.filteredLeases$ = this.leases$.pipe(
      map(leases => this.filterLeases(leases))
    );
  }

  getUnitCode(unitId: string): Observable<string> {
    return this.units$.pipe(
      map(units => {
        const unit = units.find(u => u.id === unitId);
        return unit?.unitCode || 'غير معروف';
      })
    );
  }

  getRenterName(renterId: string): Observable<string> {
    return this.renters$.pipe(
      map(renters => {
        const renter = renters.find(r => r.id === renterId);
        return renter?.fullName || 'غير معروف';
      })
    );
  }

  getPaymentCycleLabel(cycle: PaymentCycle): string {
    const labels: Record<string, string> = {
      'Monthly': 'شهري',
      'Quarterly': 'ربع سنوي',
      'Yearly': 'سنوي'
    };
    return labels[cycle] || cycle;
  }

  getStatusLabel(status: LeaseStatus): string {
    const labels: Record<string, string> = {
      'Draft': 'مسودة',
      'Active': 'نشط',
      'Expired': 'منتهي',
      'Cancelled': 'ملغي'
    };
    return labels[status] || status;
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  }

  getPaymentProgress(lease: Lease): { paid: number; total: number; percentage: number } {
    const total = lease.paymentSchedule?.length || 0;
    const paid = lease.paymentSchedule?.filter(p => p.status === PaymentStatus.Paid).length || 0;
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
    return { paid, total, percentage };
  }

  async cancelLease(lease: Lease) {
    if (lease.status !== LeaseStatus.Active) {
      this.alertService.toastError('يمكن إلغاء العقود النشطة فقط');
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: 'إلغاء العقد',
      text: 'هل أنت متأكد من إلغاء هذا العقد؟ سيتم تحرير الوحدة.',
      icon: 'warning'
    });

    if (confirmed) {
      this.store.dispatch(new LeasesActions.UpdateLease(lease.id!, { status: LeaseStatus.Cancelled }))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم إلغاء العقد بنجاح');
          },
          error: (error) => {
            this.alertService.toastError('فشل إلغاء العقد: ' + error.message);
          }
        });
    }
  }

  clearFilters() {
    this.statusFilter = 'All';
    this.applyFilters();
  }
}
