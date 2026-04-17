import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import { Unit, UnitStatus, UnitType, OwnershipType } from '../../../@core/domain/models/unit.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Building } from '../../../@core/domain/models/building.model';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { OwnersActions, OwnersState } from '../../../@core/state/owners.state';
import { BuildingsState, LoadBuildings } from '../../../@core/state/buildings.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../@shared/services/alert.service';

interface BuildingWithOwner extends Building {
  ownerName?: string;
}

@Component({
  selector: 'app-unit-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent
  ],
  templateUrl: './unit-form.component.html',
  styleUrls: ['./unit-form.component.scss']
})
export class UnitFormComponent implements OnInit {
  unitForm: FormGroup;
  isEditMode = false;
  unitId: string | null = null;
  loading = false;
  preselectedBuildingId: string | null = null;

  owners$: Observable<Owner[]>;
  buildings$: Observable<BuildingWithOwner[]>;
  unitTypes = Object.values(UnitType);
  unitStatuses = Object.values(UnitStatus);
  ownershipTypes = Object.values(OwnershipType);

  selectedBuilding: BuildingWithOwner | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.owners$ = this.store.select(OwnersState.owners);

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

    this.unitForm = this.fb.group({
      ownershipType: [OwnershipType.Building, Validators.required],
      buildingId: [''],  // Required when ownershipType = building
      ownerId: [''],     // Required when ownershipType = individual
      unitCode: ['', [Validators.required, Validators.minLength(2)]],
      type: [UnitType.Apartment, Validators.required],
      status: [UnitStatus.Available, Validators.required],
      buildingName: [''], // Auto-filled from building or manual for individual
      floor: [null],
      rooms: [null, [Validators.min(0)]],
      areaSqm: [null, [Validators.min(1)]],
      rentPrice: [null, [Validators.required, Validators.min(1)]],
      isPublished: [false]
    });

    // Update validators based on ownership type
    this.unitForm.get('ownershipType')?.valueChanges.subscribe(type => {
      this.updateValidators(type);
    });
  }

  ngOnInit() {
    // Load data for dropdowns
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new LoadBuildings());

    // Check if coming from building with preselected buildingId
    this.preselectedBuildingId = this.route.snapshot.queryParamMap.get('buildingId');

    if (this.preselectedBuildingId) {
      this.unitForm.patchValue({
        ownershipType: OwnershipType.Building,
        buildingId: this.preselectedBuildingId
      });
      this.onBuildingChange();
    }

    this.unitId = this.route.snapshot.paramMap.get('id');

    if (this.unitId) {
      this.isEditMode = true;
      this.loadUnit(this.unitId);
    }

    // Initialize validators
    this.updateValidators(this.unitForm.get('ownershipType')?.value);
  }

  updateValidators(ownershipType: OwnershipType) {
    const buildingIdControl = this.unitForm.get('buildingId');
    const ownerIdControl = this.unitForm.get('ownerId');

    if (ownershipType === OwnershipType.Building) {
      buildingIdControl?.setValidators(Validators.required);
      ownerIdControl?.clearValidators();
    } else {
      buildingIdControl?.clearValidators();
      ownerIdControl?.setValidators(Validators.required);
    }

    buildingIdControl?.updateValueAndValidity();
    ownerIdControl?.updateValueAndValidity();
  }

  onBuildingChange() {
    const buildingId = this.unitForm.get('buildingId')?.value;
    if (buildingId) {
      this.buildings$.subscribe(buildings => {
        this.selectedBuilding = buildings.find(b => b.id === buildingId) || null;
        if (this.selectedBuilding) {
          this.unitForm.patchValue({
            buildingName: this.selectedBuilding.name
          });
        }
      });
    } else {
      this.selectedBuilding = null;
    }
  }

  loadUnit(id: string) {
    const unit = this.store.selectSnapshot(UnitsState.units).find(u => u.id === id);

    if (unit) {
      this.unitForm.patchValue(unit);
      if (unit.buildingId) {
        this.onBuildingChange();
      }
    } else {
      this.alertService.toastError('لم يتم العثور على الوحدة');
      this.router.navigate(['/app/units']);
    }
  }

  async onSubmit() {
    if (this.unitForm.invalid) {
      this.unitForm.markAllAsTouched();
      this.alertService.toastWarn('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    this.loading = true;
    const formValue = this.unitForm.value;

    // If building ownership, get owner from building
    let ownerId = formValue.ownerId;
    if (formValue.ownershipType === OwnershipType.Building && this.selectedBuilding) {
      ownerId = this.selectedBuilding.ownerId;
    }

    const unitData: Partial<Unit> = {
      ...formValue,
      ownerId: ownerId,
      ledgerAccountId: '', // Will be set when accounting module is implemented
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.isEditMode && this.unitId) {
      this.store.dispatch(new UnitsActions.UpdateUnit(this.unitId, unitData))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم تحديث بيانات الوحدة بنجاح');
            this.navigateBack();
          },
          error: (error) => {
            this.alertService.toastError('فشل تحديث الوحدة: ' + error.message);
            this.loading = false;
          }
        });
    } else {
      this.store.dispatch(new UnitsActions.CreateUnit(unitData as Unit))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم إضافة الوحدة بنجاح');
            this.navigateBack();
          },
          error: (error) => {
            this.alertService.toastError('فشل إضافة الوحدة: ' + error.message);
            this.loading = false;
          }
        });
    }
  }

  navigateBack() {
    if (this.preselectedBuildingId) {
      // Go back to building detail page
      this.router.navigate(['/app/buildings', this.preselectedBuildingId]);
    } else {
      this.router.navigate(['/app/units']);
    }
  }

  get breadcrumbs() {
    if (this.preselectedBuildingId) {
      return [
        { label: 'المباني', url: '/app/buildings' },
        { label: this.selectedBuilding?.name || 'المبنى', url: '/app/buildings/' + this.preselectedBuildingId },
        { label: 'إضافة وحدة' }
      ];
    }
    return [
      { label: 'الوحدات', url: '/app/units' },
      { label: this.isEditMode ? 'تعديل' : 'جديد' }
    ];
  }

  cancel() {
    this.navigateBack();
  }

  getOwnershipTypeLabel(type: OwnershipType): string {
    const labels: Record<string, string> = {
      'building': 'وحدة ضمن مبنى',
      'individual': 'وحدة مستقلة (مالك فردي)'
    };
    return labels[type] || type;
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

  getStatusLabel(status: UnitStatus): string {
    const labels: Record<string, string> = {
      'Available': 'متاح',
      'Rented': 'مؤجر',
      'Maintenance': 'صيانة',
      'Reserved': 'محجوز'
    };
    return labels[status] || status;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.unitForm.get(fieldName);

    if (control?.hasError('required')) {
      return 'هذا الحقل مطلوب';
    }
    if (control?.hasError('minlength')) {
      return `يجب أن يكون ${control.errors?.['minlength'].requiredLength} أحرف على الأقل`;
    }
    if (control?.hasError('min')) {
      return 'القيمة يجب أن تكون أكبر من صفر';
    }

    return '';
  }
}
