import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import { Unit, UnitStatus, UnitType } from '../../../@core/domain/models/unit.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Building } from '../../../@core/domain/models/building.model';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { OwnersActions, OwnersState } from '../../../@core/state/owners.state';
import { BuildingsState, LoadBuildings } from '../../../@core/state/buildings.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../@shared/services/alert.service';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';

@Component({
  selector: 'app-units-list',
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
  templateUrl: './units-list.component.html',
  styleUrls: ['./units-list.component.scss']
})
export class UnitsListComponent implements OnInit {
  units$: Observable<Unit[]>;
  owners$: Observable<Owner[]>;
  buildings$: Observable<Building[]>;
  loading$: Observable<boolean>;

  searchTerm = '';
  statusFilter: UnitStatus | 'All' = 'All';
  typeFilter: UnitType | 'All' = 'All';
  ownerFilter = 'All';
  buildingFilter = 'All';

  selectedBuilding: Building | null = null;

  Permission = Permission;
  UnitStatus = UnitStatus;
  UnitType = UnitType;

  filteredUnits$: Observable<Unit[]>;

  constructor(
    private store: Store,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.units$ = this.store.select(UnitsState.units);
    this.owners$ = this.store.select(OwnersState.owners);
    this.buildings$ = this.store.select(BuildingsState.buildings);
    this.loading$ = this.store.select(UnitsState.loading);

    this.filteredUnits$ = combineLatest([this.units$, this.owners$]).pipe(
      map(([units, owners]) => this.filterUnits(units, owners))
    );
  }

  ngOnInit() {
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new LoadBuildings());

    // Check for building filter in query params
    const buildingId = this.route.snapshot.queryParamMap.get('buildingId');
    if (buildingId) {
      this.buildingFilter = buildingId;
      this.buildings$.subscribe(buildings => {
        this.selectedBuilding = buildings.find(b => b.id === buildingId) || null;
      });
      this.applyFilters();
    }
  }

  filterUnits(units: Unit[], owners: Owner[]): Unit[] {
    let filtered = units;

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(unit =>
        unit.unitCode.toLowerCase().includes(term) ||
        unit.buildingName?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.statusFilter !== 'All') {
      filtered = filtered.filter(unit => unit.status === this.statusFilter);
    }

    // Filter by type
    if (this.typeFilter !== 'All') {
      filtered = filtered.filter(unit => unit.type === this.typeFilter);
    }

    // Filter by owner
    if (this.ownerFilter !== 'All') {
      filtered = filtered.filter(unit => unit.ownerId === this.ownerFilter);
    }

    // Filter by building
    if (this.buildingFilter !== 'All') {
      filtered = filtered.filter(unit => unit.buildingId === this.buildingFilter);
    }

    return filtered;
  }

  applyFilters() {
    this.filteredUnits$ = combineLatest([this.units$, this.owners$]).pipe(
      map(([units, owners]) => this.filterUnits(units, owners))
    );
  }

  getOwnerName(ownerId: string): Observable<string> {
    return this.owners$.pipe(
      map(owners => {
        const owner = owners.find(o => o.id === ownerId);
        return owner?.fullName || 'غير معروف';
      })
    );
  }

  getUnitTypeLabel(type: UnitType): string {
    const labels: Record<string, string> = {
      'Apartment': 'شقة',
      'Villa': 'فيلا',
      'Office': 'مكتب',
      'Shop': 'محل',
      'Warehouse': 'مستودع'
    };
    return labels[type] || type;
  }

  async deleteUnit(unit: Unit) {
    if (unit.status === UnitStatus.Rented) {
      this.alertService.toastError('لا يمكن حذف وحدة مؤجرة');
      return;
    }

    const confirmed = await this.alertService.confirm({
      title: `هل أنت متأكد من حذف الوحدة "${unit.unitCode}"؟`,
      text: 'لن تتمكن من التراجع عن هذا الإجراء',
      icon: 'warning'
    });

    if (confirmed) {
      this.store.dispatch(new UnitsActions.DeleteUnit(unit.id!)).subscribe({
        next: () => {
          this.alertService.toastSuccess('تم حذف الوحدة بنجاح');
        },
        error: (error) => {
          this.alertService.toastError('فشل حذف الوحدة: ' + error.message);
        }
      });
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.typeFilter = 'All';
    this.ownerFilter = 'All';
    this.buildingFilter = 'All';
    this.selectedBuilding = null;
    this.router.navigate(['/app/units']);
    this.applyFilters();
  }

  addUnitToBuilding() {
    if (this.selectedBuilding) {
      this.router.navigate(['/app/units/new'], { queryParams: { buildingId: this.selectedBuilding.id } });
    }
  }
}
