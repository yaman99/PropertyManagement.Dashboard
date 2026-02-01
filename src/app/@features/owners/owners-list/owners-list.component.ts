import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Owner, OwnerStatus } from '../../../@core/domain/models/owner.model';
import { OwnersActions, OwnersState } from '../../../@core/state/owners.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../@shared/services/alert.service';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';

@Component({
  selector: 'app-owners-list',
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
  templateUrl: './owners-list.component.html',
  styleUrls: ['./owners-list.component.scss']
})
export class OwnersListComponent implements OnInit {
  owners$: Observable<Owner[]>;
  loading$: Observable<boolean>;

  searchTerm = '';
  statusFilter: OwnerStatus | 'All' = 'All';

  Permission = Permission;

  get filteredOwners$(): Observable<Owner[]> {
    return new Observable(observer => {
      this.owners$.subscribe(owners => {
        let filtered = owners;

        // Filter by search term
        if (this.searchTerm) {
          const term = this.searchTerm.toLowerCase();
          filtered = filtered.filter(owner =>
            owner.fullName.toLowerCase().includes(term) ||
            owner.email?.toLowerCase().includes(term) ||
            owner.phone.includes(term) ||
            (owner.nationalId && owner.nationalId.includes(term))
          );
        }

        // Filter by status
        if (this.statusFilter !== 'All') {
          filtered = filtered.filter(owner => owner.status === this.statusFilter);
        }

        observer.next(filtered);
      });
    });
  }

  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.owners$ = this.store.select(OwnersState.owners);
    this.loading$ = this.store.select(OwnersState.loading);
  }

  ngOnInit() {
    this.loadOwners();
  }

  loadOwners() {
    this.store.dispatch(new OwnersActions.LoadOwners());
  }

  async deleteOwner(owner: Owner) {
    const confirmed = await this.alertService.confirm({
      title: `هل أنت متأكد من حذف المالك "${owner.fullName}"؟`,
      text: 'لن تتمكن من التراجع عن هذا الإجراء',
      icon: 'warning'
    });

    if (confirmed) {
      this.store.dispatch(new OwnersActions.DeleteOwner(owner.id!)).subscribe({
        next: () => {
          this.alertService.toastSuccess('تم حذف المالك بنجاح');
        },
        error: (error) => {
          this.alertService.toastError('فشل حذف المالك: ' + error.message);
        }
      });
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'All';
  }
}
