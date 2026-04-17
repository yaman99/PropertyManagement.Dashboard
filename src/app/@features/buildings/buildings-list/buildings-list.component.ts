import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import { Building, BuildingStatus } from '../../../@core/domain/models/building.model';
import { AuthState } from '../../../@core/state/auth.state';
import { Owner } from '../../../@core/domain/models/owner.model';
import { BuildingsState, LoadBuildings, DeleteBuilding } from '../../../@core/state/buildings.state';
import { OwnersState, OwnersActions } from '../../../@core/state/owners.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../@shared/services/alert.service';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';

interface BuildingWithOwner extends Building {
  ownerName?: string;
}

@Component({
  selector: 'app-buildings-list',
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
  templateUrl: './buildings-list.component.html',
  styleUrls: ['./buildings-list.component.scss']
})
export class BuildingsListComponent implements OnInit {
  buildings$: Observable<BuildingWithOwner[]>;
  loading$: Observable<boolean>;

  searchTerm = '';
  statusFilter: BuildingStatus | 'All' = 'All';

  Permission = Permission;
  isAdmin = false;

  get filteredBuildings$(): Observable<BuildingWithOwner[]> {
    return this.buildings$.pipe(
      map(buildings => {
        let filtered = buildings;

        // Filter by search term
        if (this.searchTerm) {
          const term = this.searchTerm.toLowerCase();
          filtered = filtered.filter(building =>
            building.name.toLowerCase().includes(term) ||
            building.address.toLowerCase().includes(term) ||
            building.ownerName?.toLowerCase().includes(term) ||
            building.city?.toLowerCase().includes(term)
          );
        }

        // Filter by status
        if (this.statusFilter !== 'All') {
          filtered = filtered.filter(building => building.status === this.statusFilter);
        }

        return filtered;
      })
    );
  }

  constructor(
    private store: Store,
    private alertService: AlertService,
    private router: Router
  ) {
    // Combine buildings with owners to get owner names
    this.buildings$ = combineLatest([
      this.store.select(BuildingsState.buildings),
      this.store.select(OwnersState.owners)
    ]).pipe(
      map(([buildings, owners]) => {
        return buildings.map(building => ({
          ...building,
          ownerName: owners.find(o => o.id === building.ownerId)?.fullName
        }));
      })
    );
    this.loading$ = this.store.select(BuildingsState.loading);
  }

  ngOnInit() {
    this.loadData();
    const user = this.store.selectSnapshot(AuthState.user);
    this.isAdmin = user?.role === 'Admin';
  }

  loadData() {
    this.store.dispatch(new LoadBuildings());
    this.store.dispatch(new OwnersActions.LoadOwners());
  }

  getStatusLabel(status: BuildingStatus): string {
    const labels: Record<string, string> = {
      'Active': 'نشط',
      'UnderConstruction': 'تحت الإنشاء',
      'UnderMaintenance': 'تحت الصيانة',
      'Inactive': 'غير نشط'
    };
    return labels[status] || status;
  }

  async deleteBuilding(building: Building) {
    const confirmed = await this.alertService.confirm({
      title: `هل أنت متأكد من حذف المبنى "${building.name}"؟`,
      text: 'سيتم حذف جميع الوحدات المرتبطة به. لن تتمكن من التراجع عن هذا الإجراء',
      icon: 'warning'
    });

    if (confirmed) {
      this.store.dispatch(new DeleteBuilding(building.id)).subscribe({
        next: () => {
          this.alertService.toastSuccess('تم حذف المبنى بنجاح');
        },
        error: (error) => {
          this.alertService.toastError('فشل حذف المبنى: ' + error.message);
        }
      });
    }
  }

  manageUnits(building: Building) {
    // Navigate to building detail page (shows units inside the building)
    this.router.navigate(['/app/buildings', building.id]);
  }

  viewOnMap(building: Building) {
    if (building.latitude && building.longitude) {
      window.open(
        `https://www.openstreetmap.org/?mlat=${building.latitude}&mlon=${building.longitude}#map=17/${building.latitude}/${building.longitude}`,
        '_blank'
      );
    } else {
      this.alertService.toastWarn('لم يتم تحديد موقع المبنى على الخريطة');
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'All';
  }
}
