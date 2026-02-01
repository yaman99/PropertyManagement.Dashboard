import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, map } from 'rxjs';
import { Renter, RenterStatus } from '../../../@core/domain/models/renter.model';
import { RentersActions, RentersState } from '../../../@core/state/renters.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../@shared/services/alert.service';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';

@Component({
  selector: 'app-renters-list',
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
  templateUrl: './renters-list.component.html',
  styleUrls: ['./renters-list.component.scss']
})
export class RentersListComponent implements OnInit {
  renters$: Observable<Renter[]>;
  loading$: Observable<boolean>;

  searchTerm = '';
  statusFilter: RenterStatus | 'All' = 'All';

  Permission = Permission;
  RenterStatus = RenterStatus;

  filteredRenters$: Observable<Renter[]>;

  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.renters$ = this.store.select(RentersState.renters);
    this.loading$ = this.store.select(RentersState.loading);
    this.filteredRenters$ = this.renters$;
  }

  ngOnInit() {
    this.store.dispatch(new RentersActions.LoadRenters());
    this.applyFilters();
  }

  applyFilters() {
    this.filteredRenters$ = this.renters$.pipe(
      map(renters => {
        let filtered = renters;

        // Filter by search term
        if (this.searchTerm) {
          const term = this.searchTerm.toLowerCase();
          filtered = filtered.filter(renter =>
            renter.fullName.toLowerCase().includes(term) ||
            renter.email?.toLowerCase().includes(term) ||
            renter.phone.includes(term) ||
            (renter.nationalId && renter.nationalId.includes(term))
          );
        }

        // Filter by status
        if (this.statusFilter !== 'All') {
          filtered = filtered.filter(renter => renter.status === this.statusFilter);
        }

        return filtered;
      })
    );
  }

  async deleteRenter(renter: Renter) {
    const confirmed = await this.alertService.confirm({
      title: `هل أنت متأكد من حذف المستأجر "${renter.fullName}"؟`,
      text: 'لن تتمكن من التراجع عن هذا الإجراء',
      icon: 'warning'
    });

    if (confirmed) {
      this.store.dispatch(new RentersActions.DeleteRenter(renter.id!)).subscribe({
        next: () => {
          this.alertService.toastSuccess('تم حذف المستأجر بنجاح');
        },
        error: (error) => {
          this.alertService.toastError('فشل حذف المستأجر: ' + error.message);
        }
      });
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.applyFilters();
  }
}
