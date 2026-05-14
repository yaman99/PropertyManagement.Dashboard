import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Lease, LeaseStatus, PaymentStatus } from '../../../@core/domain/models/lease.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Renter } from '../../../@core/domain/models/renter.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { Building } from '../../../@core/domain/models/building.model';
import { LeasesActions, LeasesState } from '../../../@core/state/leases.state';
import { OwnersActions, OwnersState } from '../../../@core/state/owners.state';
import { RentersActions, RentersState } from '../../../@core/state/renters.state';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { LoadBuildings, BuildingsState } from '../../../@core/state/buildings.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';

interface EnrichedLease {
  lease: Lease;
  owner: Owner | undefined;
  renter: Renter | undefined;
  unit: Unit | undefined;
  building: Building | undefined;
}

@Component({
  selector: 'app-owner-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './owner-contracts.component.html',
  styleUrls: ['./owner-contracts.component.scss']
})
export class OwnerContractsComponent implements OnInit {
  enrichedLeases$: Observable<EnrichedLease[]>;

  selectedLease: EnrichedLease | null = null;
  searchTerm = '';
  filterStatus = 'all';

  LeaseStatus = LeaseStatus;

  constructor(private store: Store, private router: Router) {
    this.enrichedLeases$ = combineLatest([
      this.store.select(LeasesState.leases),
      this.store.select(OwnersState.owners),
      this.store.select(RentersState.renters),
      this.store.select(UnitsState.units),
      this.store.select(BuildingsState.buildings)
    ]).pipe(
      map(([leases, owners, renters, units, buildings]) =>
        leases.map(lease => ({
          lease,
          owner: owners.find(o => o.id === lease.ownerId),
          renter: renters.find(r => r.id === lease.renterId),
          unit: units.find(u => u.id === lease.unitId),
          building: buildings.find(b => b.id === lease.buildingId)
        }))
      )
    );
  }

  ngOnInit() {
    this.store.dispatch(new LeasesActions.LoadLeases());
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new RentersActions.LoadRenters());
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new LoadBuildings());
  }

  get filteredLeases$(): Observable<EnrichedLease[]> {
    return this.enrichedLeases$.pipe(
      map(list => list.filter(item => {
        const matchSearch = !this.searchTerm ||
          (item.owner?.fullName || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (item.renter?.fullName || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (item.building?.name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (item.unit?.unitCode || '').toLowerCase().includes(this.searchTerm.toLowerCase());

        const matchStatus = this.filterStatus === 'all' || item.lease.status === this.filterStatus;
        return matchSearch && matchStatus;
      }))
    );
  }

  openContract(item: EnrichedLease) {
    this.selectedLease = item;
  }

  closeContract() {
    this.selectedLease = null;
  }

  printContract() {
    window.print();
  }

  getStatusLabel(status: LeaseStatus): string {
    const labels: Record<string, string> = {
      'Draft': 'مسودة', 'Inactive': 'غير نشط', 'Active': 'نشط',
      'Expired': 'منتهي', 'Cancelled': 'ملغي'
    };
    return labels[status] || status;
  }

  getStatusBadge(status: LeaseStatus): string {
    const badges: Record<string, string> = {
      'Active': 'bg-success', 'Inactive': 'bg-warning text-dark',
      'Expired': 'bg-secondary', 'Cancelled': 'bg-danger', 'Draft': 'bg-light text-dark'
    };
    return badges[status] || 'bg-secondary';
  }

  getDurationLabel(duration: string): string {
    const labels: Record<string, string> = {
      'OneYear': 'سنة كاملة', 'SixMonths': 'ستة أشهر',
      'ThreeMonths': 'ثلاثة أشهر', 'Custom': 'مخصص'
    };
    return labels[duration] || duration;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  numberToWords(num: number): string {
    // Simple Arabic number-to-words for display purposes
    return num.toLocaleString('ar-SA') + ' ريال سعودي';
  }

  getPaidCount(lease: Lease): number {
    return lease.paymentSchedule?.filter(p => p.status === PaymentStatus.Paid).length || 0;
  }
}
