import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Building } from '../../../@core/domain/models/building.model';
import { Unit, UnitStatus } from '../../../@core/domain/models/unit.model';
import {
  OwnerDelegation, CreateDelegationDto,
  isDelegationExpiringSoon, isDelegationExpired
} from '../../../@core/domain/models/owner-delegation.model';
import { OwnersState, OwnersActions } from '../../../@core/state/owners.state';
import { BuildingsState, LoadBuildings } from '../../../@core/state/buildings.state';
import { UnitsState, UnitsActions } from '../../../@core/state/units.state';
import { DelegationsService } from '../../../@core/application/services/delegations.service';
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
    ReactiveFormsModule,
    PageHeaderComponent,
    StatusBadgeComponent
  ],
  templateUrl: './owner-detail.component.html',
  styleUrls: ['./owner-detail.component.scss']
})
export class OwnerDetailComponent implements OnInit {
  owner: Owner | null = null;
  buildings: BuildingWithStats[] = [];
  delegations: OwnerDelegation[] = [];
  loading = true;

  // Summary stats
  totalBuildings = 0;
  totalUnits = 0;
  totalRented = 0;
  totalAvailable = 0;

  // Delegation form
  showDelegationForm = false;
  delegationForm: FormGroup;
  editingDelegationId: string | null = null;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private alertService: AlertService,
    private delegationsService: DelegationsService,
    private fb: FormBuilder
  ) {
    this.delegationForm = this.fb.group({
      buildingId: ['', Validators.required],
      delegateeName: ['', [Validators.required, Validators.minLength(3)]],
      delegateeIdNumber: [''],
      delegateePhone: ['', [Validators.pattern(/^05\d{8}$/)]],
      delegationNumber: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit() {
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new LoadBuildings());
    this.store.dispatch(new UnitsActions.LoadUnits());

    const ownerId = this.route.snapshot.paramMap.get('id');
    if (!ownerId) {
      this.router.navigate(['/app/owners']);
      return;
    }

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

    // Load delegations
    this.loadDelegations(ownerId);

    this.loading = false;
  }

  private loadDelegations(ownerId: string) {
    this.delegationsService.getByOwnerId(ownerId).subscribe(delegations => {
      this.delegations = delegations;
    });
  }

  // --- Delegation helpers ---

  isExpiringSoon(delegation: OwnerDelegation): boolean {
    return isDelegationExpiringSoon(delegation);
  }

  isExpired(delegation: OwnerDelegation): boolean {
    return isDelegationExpired(delegation);
  }

  getBuildingName(buildingId: string): string {
    const building = this.buildings.find(b => b.id === buildingId);
    return building?.name || 'غير معروف';
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-SA');
  }

  // --- Delegation CRUD ---

  openDelegationForm(delegation?: OwnerDelegation) {
    this.showDelegationForm = true;
    this.editingDelegationId = delegation?.id || null;

    if (delegation) {
      this.delegationForm.patchValue({
        ...delegation,
        startDate: new Date(delegation.startDate).toISOString().split('T')[0],
        endDate: new Date(delegation.endDate).toISOString().split('T')[0]
      });
    } else {
      this.delegationForm.reset();
    }
  }

  closeDelegationForm() {
    this.showDelegationForm = false;
    this.editingDelegationId = null;
    this.delegationForm.reset();
  }

  saveDelegation() {
    if (this.delegationForm.invalid || !this.owner) {
      this.delegationForm.markAllAsTouched();
      return;
    }

    const formValue = this.delegationForm.value;

    if (this.editingDelegationId) {
      this.delegationsService.update(this.editingDelegationId, {
        ...formValue,
        startDate: new Date(formValue.startDate),
        endDate: new Date(formValue.endDate)
      }).subscribe({
        next: () => {
          this.alertService.toastSuccess('تم تحديث الوكالة بنجاح');
          this.closeDelegationForm();
          this.loadDelegations(this.owner!.id);
        },
        error: () => this.alertService.toastError('فشل تحديث الوكالة')
      });
    } else {
      const dto: CreateDelegationDto = {
        ...formValue,
        ownerId: this.owner.id,
        startDate: new Date(formValue.startDate),
        endDate: new Date(formValue.endDate)
      };

      this.delegationsService.create(dto).subscribe({
        next: () => {
          this.alertService.toastSuccess('تم إضافة الوكالة بنجاح');
          this.closeDelegationForm();
          this.loadDelegations(this.owner!.id);
        },
        error: () => this.alertService.toastError('فشل إضافة الوكالة')
      });
    }
  }

  async deleteDelegation(delegation: OwnerDelegation) {
    const confirmed = await this.alertService.confirm({
      title: 'حذف الوكالة',
      text: `هل أنت متأكد من حذف وكالة "${delegation.delegateeName}"؟`,
      icon: 'warning'
    });

    if (confirmed) {
      this.delegationsService.delete(delegation.id).subscribe({
        next: () => {
          this.alertService.toastSuccess('تم حذف الوكالة بنجاح');
          this.loadDelegations(this.owner!.id);
        },
        error: () => this.alertService.toastError('فشل حذف الوكالة')
      });
    }
  }
}
