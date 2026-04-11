import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Building } from '../../../@core/domain/models/building.model';
import { Unit, UnitStatus } from '../../../@core/domain/models/unit.model';
import { OwnersState, OwnersActions } from '../../../@core/state/owners.state';
import { BuildingsState, LoadBuildings } from '../../../@core/state/buildings.state';
import { UnitsState, UnitsActions } from '../../../@core/state/units.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { AlertService } from '../../../@shared/services/alert.service';

interface BuildingWithStats extends Building {
  units: Unit[];
  rentedCount: number;
  availableCount: number;
}

@Component({
  selector: 'app-owner-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    StatusBadgeComponent
  ],
  templateUrl: './owner-detail.component.html',
  styleUrls: ['./owner-detail.component.scss']
})
export class OwnerDetailComponent implements OnInit {
  owner: Owner | null = null;
  buildings: BuildingWithStats[] = [];
  loading = true;

  // Summary stats
  totalBuildings = 0;
  totalUnits = 0;
  totalRented = 0;
  totalAvailable = 0;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new LoadBuildings());
    this.store.dispatch(new UnitsActions.LoadUnits());

    const ownerId = this.route.snapshot.paramMap.get('id');
    if (!ownerId) {
      this.router.navigate(['/app/owners']);
      return;
    }

    // Wait a tick for state to load
    setTimeout(() => this.loadOwnerData(ownerId), 100);
  }

  private loadOwnerData(ownerId: string) {
    const owners = this.store.selectSnapshot(OwnersState.owners);
    this.owner = owners.find(o => o.id === ownerId) || null;

    if (!this.owner) {
      this.alertService.toastError('لم يتم العثور على المالك');
      this.router.navigate(['/app/owners']);
      return;
    }

    const allBuildings = this.store.selectSnapshot(BuildingsState.buildings);
    const allUnits = this.store.selectSnapshot(UnitsState.units);

    const ownerBuildings = allBuildings.filter(b => b.ownerId === ownerId);

    this.buildings = ownerBuildings.map(building => {
      const buildingUnits = allUnits.filter((u: Unit) => u.buildingId === building.id);
      const rentedCount = buildingUnits.filter((u: Unit) => u.status === UnitStatus.Rented).length;
      const availableCount = buildingUnits.filter((u: Unit) => u.status === UnitStatus.Available).length;

      return {
        ...building,
        units: buildingUnits,
        rentedCount,
        availableCount
      };
    });

    this.totalBuildings = this.buildings.length;
    this.totalUnits = this.buildings.reduce((sum, b) => sum + b.units.length, 0);
    this.totalRented = this.buildings.reduce((sum, b) => sum + b.rentedCount, 0);
    this.totalAvailable = this.buildings.reduce((sum, b) => sum + b.availableCount, 0);

    this.loading = false;
  }
}
