import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable, combineLatest } from 'rxjs';
import { Unit, UnitStatus } from '../../@core/domain/models/unit.model';
import { Owner } from '../../@core/domain/models/owner.model';
import { Renter } from '../../@core/domain/models/renter.model';
import { Lease, LeaseStatus, PaymentStatus } from '../../@core/domain/models/lease.model';
import { Request, RequestStatus } from '../../@core/domain/models/request.model';
import { UnitsActions, UnitsState } from '../../@core/state/units.state';
import { OwnersActions, OwnersState } from '../../@core/state/owners.state';
import { RentersActions, RentersState } from '../../@core/state/renters.state';
import { LeasesActions, LeasesState } from '../../@core/state/leases.state';

interface DashboardStats {
  totalUnits: number;
  rentedUnits: number;
  availableUnits: number;
  totalOwners: number;
  totalRenters: number;
  activeLeases: number;
  pendingPayments: number;
  overduePayments: number;
  newRequests: number;
  totalRevenue: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  units$: Observable<Unit[]>;
  owners$: Observable<Owner[]>;
  renters$: Observable<Renter[]>;
  leases$: Observable<Lease[]>;

  stats: DashboardStats = {
    totalUnits: 0,
    rentedUnits: 0,
    availableUnits: 0,
    totalOwners: 0,
    totalRenters: 0,
    activeLeases: 0,
    pendingPayments: 0,
    overduePayments: 0,
    newRequests: 0,
    totalRevenue: 0
  };

  recentRequests: Request[] = [];
  upcomingPayments: { lease: Lease; payment: any; renter?: Renter; unit?: Unit }[] = [];

  constructor(private store: Store) {
    this.units$ = this.store.select(UnitsState.units);
    this.owners$ = this.store.select(OwnersState.owners);
    this.renters$ = this.store.select(RentersState.renters);
    this.leases$ = this.store.select(LeasesState.leases);
  }

  ngOnInit() {
    // Load all data
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new RentersActions.LoadRenters());
    this.store.dispatch(new LeasesActions.LoadLeases());

    // Calculate stats
    combineLatest([this.units$, this.owners$, this.renters$, this.leases$]).subscribe(
      ([units, owners, renters, leases]) => {
        this.calculateStats(units, owners, renters, leases);
        this.loadUpcomingPayments(leases, renters, units);
      }
    );

    this.loadRecentRequests();
  }

  calculateStats(units: Unit[], owners: Owner[], renters: Renter[], leases: Lease[]) {
    this.stats.totalUnits = units.length;
    this.stats.rentedUnits = units.filter(u => u.status === UnitStatus.Rented).length;
    this.stats.availableUnits = units.filter(u => u.status === UnitStatus.Available).length;
    this.stats.totalOwners = owners.length;
    this.stats.totalRenters = renters.length;
    this.stats.activeLeases = leases.filter(l => l.status === LeaseStatus.Active).length;

    // Calculate payments from active leases
    let pending = 0;
    let overdue = 0;
    let revenue = 0;

    leases.forEach(lease => {
      if (lease.paymentSchedule) {
        lease.paymentSchedule.forEach(p => {
          if (p.status === PaymentStatus.Pending) pending++;
          if (p.status === PaymentStatus.Overdue) overdue++;
          if (p.status === PaymentStatus.Paid) revenue += p.paidAmount || p.amount;
        });
      }
    });

    this.stats.pendingPayments = pending;
    this.stats.overduePayments = overdue;
    this.stats.totalRevenue = revenue;
  }

  loadRecentRequests() {
    const stored = localStorage.getItem('requests');
    const requests: Request[] = stored ? JSON.parse(stored) : [];
    this.recentRequests = requests.slice(0, 5);
    this.stats.newRequests = requests.filter(r => r.status === RequestStatus.New).length;
  }

  loadUpcomingPayments(leases: Lease[], renters: Renter[], units: Unit[]) {
    this.upcomingPayments = [];
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    leases.forEach(lease => {
      if (lease.status === LeaseStatus.Active && lease.paymentSchedule) {
        const upcomingPayment = lease.paymentSchedule.find(p => {
          const dueDate = new Date(p.dueDate);
          return p.status === PaymentStatus.Pending && dueDate >= today && dueDate <= nextMonth;
        });

        if (upcomingPayment) {
          this.upcomingPayments.push({
            lease,
            payment: upcomingPayment,
            renter: renters.find(r => r.id === lease.renterId),
            unit: units.find(u => u.id === lease.unitId)
          });
        }
      }
    });
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  }

  getRequestStatusClass(status: RequestStatus): string {
    const classes: Record<string, string> = {
      'New': 'bg-info',
      'InProgress': 'bg-primary',
      'OnHold': 'bg-warning',
      'Resolved': 'bg-success',
      'Closed': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
  }

  getRequestStatusLabel(status: RequestStatus): string {
    const labels: Record<string, string> = {
      'New': 'جديد',
      'InProgress': 'قيد التنفيذ',
      'OnHold': 'معلق',
      'Resolved': 'تم الحل',
      'Closed': 'مغلق'
    };
    return labels[status] || status;
  }
}
