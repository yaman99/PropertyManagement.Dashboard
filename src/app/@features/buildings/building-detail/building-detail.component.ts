import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { combineLatest, map } from 'rxjs';
import { Building } from '../../../@core/domain/models/building.model';
import { Unit, UnitStatus, UnitType } from '../../../@core/domain/models/unit.model';
import { BuildingsState, LoadBuildings } from '../../../@core/state/buildings.state';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { OwnersState, OwnersActions } from '../../../@core/state/owners.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../@shared/services/alert.service';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';

@Component({
  selector: 'app-building-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    HasPermissionDirective
  ],
  templateUrl: './building-detail.component.html',
  styleUrls: ['./building-detail.component.scss']
})
export class BuildingDetailComponent implements OnInit {
  building: Building | null = null;
  ownerName = '';
  buildingUnits: Unit[] = [];
  loading = true;
  buildingId = '';

  Permission = Permission;
  UnitStatus = UnitStatus;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.buildingId = this.route.snapshot.paramMap.get('id') || '';

    this.store.dispatch(new LoadBuildings());
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new OwnersActions.LoadOwners());

    combineLatest([
      this.store.select(BuildingsState.buildings),
      this.store.select(OwnersState.owners),
      this.store.select(UnitsState.units)
    ]).pipe(
      map(([buildings, owners, units]) => {
        const found = buildings.find(b => b.id === this.buildingId);
        if (found) {
          this.building = found;
          this.ownerName = owners.find(o => o.id === found.ownerId)?.fullName || '';
          this.loading = false;
        }
        this.buildingUnits = units.filter(u => u.buildingId === this.buildingId);
      })
    ).subscribe();
  }

  addUnit() {
    this.router.navigate(['/app/units/new'], { queryParams: { buildingId: this.buildingId } });
  }

  async deleteUnit(unit: Unit) {
    const confirmed = await this.alertService.confirm({
      title: `حذف الوحدة "${unit.unitCode}"؟`,
      text: 'لن تتمكن من التراجع عن هذا الإجراء',
      icon: 'warning'
    });
    if (confirmed) {
      this.store.dispatch(new UnitsActions.DeleteUnit(unit.id)).subscribe({
        next: () => this.alertService.toastSuccess('تم حذف الوحدة بنجاح'),
        error: (e: any) => this.alertService.toastError('فشل الحذف: ' + e.message)
      });
    }
  }

  getUnitTypeLabel(type: UnitType): string {
    const labels: Record<string, string> = {
      'Apartment': 'شقة', 'Villa': 'فيلا', 'Office': 'مكتب',
      'Shop': 'محل', 'Warehouse': 'مستودع'
    };
    return labels[type] || type;
  }

  getUnitStatusLabel(status: UnitStatus): string {
    const labels: Record<string, string> = {
      'Available': 'متاح', 'Rented': 'مؤجر',
      'Maintenance': 'صيانة', 'Reserved': 'محجوز'
    };
    return labels[status] || status;
  }

  getStatusBadgeClass(status: UnitStatus): string {
    const classes: Record<string, string> = {
      'Available': 'bg-success', 'Rented': 'bg-primary',
      'Maintenance': 'bg-warning text-dark', 'Reserved': 'bg-info text-dark'
    };
    return classes[status] || 'bg-secondary';
  }

  getAvailableCount(): number {
    return this.buildingUnits.filter(u => u.status === UnitStatus.Available).length;
  }

  getRentedCount(): number {
    return this.buildingUnits.filter(u => u.status === UnitStatus.Rented).length;
  }
}
