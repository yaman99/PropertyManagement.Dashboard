import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import { Request, RequestCategory, RequestPriority, RequestStatus } from '../../../@core/domain/models/request.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { Renter } from '../../../@core/domain/models/renter.model';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../@shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../@shared/services/alert.service';
import { HasPermissionDirective } from '../../../@shared/directives/has-permission.directive';
import { Permission } from '../../../@core/domain/models/auth.model';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { RentersActions, RentersState } from '../../../@core/state/renters.state';

interface RequestWithDetails extends Request {
  unitCode?: string;
  renterName?: string;
}

@Component({
  selector: 'app-requests-list',
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
  templateUrl: './requests-list.component.html',
  styleUrls: ['./requests-list.component.scss']
})
export class RequestsListComponent implements OnInit {
  requests: RequestWithDetails[] = [];
  filteredRequests: RequestWithDetails[] = [];
  units$: Observable<Unit[]>;
  renters$: Observable<Renter[]>;
  loading = false;

  searchTerm = '';
  statusFilter: RequestStatus | 'All' = 'All';
  categoryFilter: RequestCategory | 'All' = 'All';
  priorityFilter: RequestPriority | 'All' = 'All';

  Permission = Permission;
  RequestStatus = RequestStatus;
  RequestCategory = RequestCategory;
  RequestPriority = RequestPriority;

  private readonly STORAGE_KEY = 'requests';

  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.units$ = this.store.select(UnitsState.units);
    this.renters$ = this.store.select(RentersState.renters);
  }

  ngOnInit() {
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new RentersActions.LoadRenters());
    this.loadRequests();
  }

  loadRequests() {
    this.loading = true;
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const requests: Request[] = stored ? JSON.parse(stored) : [];

    // Enrich with unit and renter info
    combineLatest([this.units$, this.renters$]).pipe(
      map(([units, renters]) => {
        return requests.map(req => ({
          ...req,
          unitCode: units.find(u => u.id === req.unitId)?.unitCode || '-',
          renterName: renters.find(r => r.id === req.renterId)?.fullName || '-'
        }));
      })
    ).subscribe(enrichedRequests => {
      this.requests = enrichedRequests;
      this.applyFilters();
      this.loading = false;
    });
  }

  applyFilters() {
    let filtered = [...this.requests];

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        req.title.toLowerCase().includes(term) ||
        req.description?.toLowerCase().includes(term) ||
        req.unitCode?.toLowerCase().includes(term) ||
        req.renterName?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.statusFilter !== 'All') {
      filtered = filtered.filter(req => req.status === this.statusFilter);
    }

    // Filter by category
    if (this.categoryFilter !== 'All') {
      filtered = filtered.filter(req => req.category === this.categoryFilter);
    }

    // Filter by priority
    if (this.priorityFilter !== 'All') {
      filtered = filtered.filter(req => req.priority === this.priorityFilter);
    }

    this.filteredRequests = filtered;
  }

  getCategoryLabel(category: RequestCategory): string {
    const labels: Record<string, string> = {
      'Maintenance': 'صيانة عامة',
      'Plumbing': 'سباكة',
      'Electrical': 'كهرباء',
      'HVAC': 'تكييف',
      'Cleaning': 'نظافة',
      'Security': 'أمن',
      'Other': 'أخرى'
    };
    return labels[category] || category;
  }

  getPriorityLabel(priority: RequestPriority): string {
    const labels: Record<string, string> = {
      'Low': 'منخفضة',
      'Medium': 'متوسطة',
      'High': 'عالية',
      'Urgent': 'عاجلة'
    };
    return labels[priority] || priority;
  }

  getPriorityClass(priority: RequestPriority): string {
    const classes: Record<string, string> = {
      'Low': 'bg-secondary',
      'Medium': 'bg-info',
      'High': 'bg-warning',
      'Urgent': 'bg-danger'
    };
    return classes[priority] || 'bg-secondary';
  }

  getStatusLabel(status: RequestStatus): string {
    const labels: Record<string, string> = {
      'New': 'جديد',
      'InProgress': 'قيد التنفيذ',
      'OnHold': 'معلق',
      'Resolved': 'تم الحل',
      'Closed': 'مغلق',
      'Cancelled': 'ملغي'
    };
    return labels[status] || status;
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  }

  async deleteRequest(request: Request) {
    const confirmed = await this.alertService.confirm({
      title: 'حذف الطلب',
      text: `هل أنت متأكد من حذف الطلب "${request.title}"؟`,
      icon: 'warning'
    });

    if (confirmed) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      let requests: Request[] = stored ? JSON.parse(stored) : [];
      requests = requests.filter(r => r.id !== request.id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));

      this.alertService.toastSuccess('تم حذف الطلب بنجاح');
      this.loadRequests();
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.categoryFilter = 'All';
    this.priorityFilter = 'All';
    this.applyFilters();
  }
}
