import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Building, BuildingStatus } from '../../../@core/domain/models/building.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { BuildingsState, CreateBuilding, UpdateBuilding, LoadBuildings } from '../../../@core/state/buildings.state';
import { OwnersState, OwnersActions } from '../../../@core/state/owners.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../@shared/services/alert.service';

@Component({
  selector: 'app-building-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent
  ],
  templateUrl: './building-form.component.html',
  styleUrls: ['./building-form.component.scss']
})
export class BuildingFormComponent implements OnInit {
  buildingForm: FormGroup;
  isEditMode = false;
  buildingId: string | null = null;
  loading = false;

  owners$: Observable<Owner[]>;
  buildingStatuses = Object.values(BuildingStatus);

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.owners$ = this.store.select(OwnersState.owners);

    this.buildingForm = this.fb.group({
      ownerId: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', Validators.required],
      city: [''],
      district: [''],
      totalFloors: [null, [Validators.min(1), Validators.max(100)]],
      yearBuilt: [null, [Validators.min(1900), Validators.max(new Date().getFullYear())]],
      status: [BuildingStatus.Active, Validators.required]
    });
  }

  ngOnInit() {
    // Load owners for dropdown
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new LoadBuildings());

    this.buildingId = this.route.snapshot.paramMap.get('id');

    if (this.buildingId) {
      this.isEditMode = true;
      this.loadBuilding(this.buildingId);
    }
  }

  loadBuilding(id: string) {
    const building = this.store.selectSnapshot(BuildingsState.buildings).find(b => b.id === id);

    if (building) {
      this.buildingForm.patchValue(building);
    } else {
      this.alertService.toastError('لم يتم العثور على المبنى');
      this.router.navigate(['/app/buildings']);
    }
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

  async onSubmit() {
    if (this.buildingForm.invalid) {
      this.buildingForm.markAllAsTouched();
      this.alertService.toastWarn('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    this.loading = true;
    const buildingData = this.buildingForm.value;

    if (this.isEditMode && this.buildingId) {
      // Update existing building
      this.store.dispatch(new UpdateBuilding({ id: this.buildingId, ...buildingData }))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم تحديث بيانات المبنى بنجاح');
            this.router.navigate(['/app/buildings']);
          },
          error: (error) => {
            this.alertService.toastError('فشل تحديث المبنى: ' + error.message);
            this.loading = false;
          }
        });
    } else {
      // Create new building
      this.store.dispatch(new CreateBuilding(buildingData))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم إضافة المبنى بنجاح');
            // Get the newly created building and redirect to units page
            const buildings = this.store.selectSnapshot(BuildingsState.buildings);
            const newBuilding = buildings[buildings.length - 1];

            // Ask if user wants to add units now
            this.alertService.confirm({
              title: 'إضافة وحدات',
              text: 'هل تريد إضافة وحدات للمبنى الآن؟',
              icon: 'question',
              confirmButtonText: 'نعم، أضف وحدات',
              cancelButtonText: 'لاحقاً'
            }).then(confirmed => {
              if (confirmed && newBuilding) {
                this.router.navigate(['/app/units'], { queryParams: { buildingId: newBuilding.id } });
              } else {
                this.router.navigate(['/app/buildings']);
              }
            });
          },
          error: (error) => {
            this.alertService.toastError('فشل إضافة المبنى: ' + error.message);
            this.loading = false;
          }
        });
    }
  }

  cancel() {
    this.router.navigate(['/app/buildings']);
  }
}
