import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Building, BuildingStatus, MeterType, ElectricityMeter } from '../../../@core/domain/models/building.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { BuildingsState, CreateBuilding, UpdateBuilding, LoadBuildings } from '../../../@core/state/buildings.state';
import { OwnersState, OwnersActions } from '../../../@core/state/owners.state';
import { UnitsState } from '../../../@core/state/units.state';
import { AuthState } from '../../../@core/state/auth.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../@shared/services/alert.service';
import * as L from 'leaflet';

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
export class BuildingFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  buildingForm: FormGroup;
  isEditMode = false;
  buildingId: string | null = null;
  loading = false;

  owners$: Observable<Owner[]>;
  buildingStatuses = Object.values(BuildingStatus);
  meterTypes = Object.values(MeterType);

  // Map
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  // Image previews
  buildingImagePreview: string | null = null;
  deedImagePreview: string | null = null;

  // Units for shared meter linking
  buildingUnits: Unit[] = [];

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
      status: [BuildingStatus.Active, Validators.required],

      // New fields
      imageUrl: [''],
      deedImageUrl: [''],
      latitude: [null],
      longitude: [null],
      guardName: [''],
      guardPhone: [''],
      apartmentCount: [null, [Validators.min(0)]],
      shopCount: [null, [Validators.min(0)]],
      guardRoomCount: [null, [Validators.min(0)]],
      rooftopCount: [null, [Validators.min(0)]],
      servicedApartmentCount: [null, [Validators.min(0)]],
      ownerManagerName: [''],
      renterManagerName: [''],
      electricityMeters: this.fb.array([])
    });
  }

  get metersArray(): FormArray {
    return this.buildingForm.get('electricityMeters') as FormArray;
  }

  ngOnInit() {
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new LoadBuildings());

    this.buildingId = this.route.snapshot.paramMap.get('id');

    if (this.buildingId) {
      this.isEditMode = true;
      this.loadBuilding(this.buildingId);
      this.loadBuildingUnits(this.buildingId);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 200);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap() {
    if (!this.mapContainer?.nativeElement) return;

    // Default to Riyadh center
    const lat = this.buildingForm.get('latitude')?.value || 24.7136;
    const lng = this.buildingForm.get('longitude')?.value || 46.6753;

    this.map = L.map(this.mapContainer.nativeElement).setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // If editing and has coordinates, place marker
    if (this.buildingForm.get('latitude')?.value && this.buildingForm.get('longitude')?.value) {
      this.placeMarker(lat, lng);
    }

    // Click to place marker
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.placeMarker(e.latlng.lat, e.latlng.lng);
      this.buildingForm.patchValue({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      });
    });
  }

  private placeMarker(lat: number, lng: number) {
    if (!this.map) return;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], {
        draggable: true,
        icon: L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }).addTo(this.map);

      this.marker.on('dragend', () => {
        const pos = this.marker!.getLatLng();
        this.buildingForm.patchValue({
          latitude: pos.lat,
          longitude: pos.lng
        });
      });
    }
  }

  private loadBuildingUnits(buildingId: string) {
    const allUnits = this.store.selectSnapshot(UnitsState.units) || [];
    this.buildingUnits = allUnits.filter((u: Unit) => u.buildingId === buildingId);
  }

  loadBuilding(id: string) {
    const building = this.store.selectSnapshot(BuildingsState.buildings).find(b => b.id === id);

    if (building) {
      this.buildingForm.patchValue(building);

      // Load image previews
      if (building.imageUrl) this.buildingImagePreview = building.imageUrl;
      if (building.deedImageUrl) this.deedImagePreview = building.deedImageUrl;

      // Load meters
      if (building.electricityMeters?.length) {
        building.electricityMeters.forEach(meter => this.addMeter(meter));
      }
    } else {
      this.alertService.toastError('لم يتم العثور على المبنى');
      this.router.navigate(['/app/buildings']);
    }
  }

  // Electricity Meters Management
  addMeter(meter?: ElectricityMeter) {
    const meterGroup = this.fb.group({
      id: [meter?.id || 'MTR-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5)],
      meterNumber: [meter?.meterNumber || '', Validators.required],
      type: [meter?.type || MeterType.IndependentUnit, Validators.required],
      linkedUnitIds: [meter?.linkedUnitIds || []]
    });
    this.metersArray.push(meterGroup);
  }

  removeMeter(index: number) {
    this.metersArray.removeAt(index);
  }

  getMeterTypeLabel(type: MeterType): string {
    const labels: Record<string, string> = {
      'IndependentUnit': 'عداد وحدة مستقلة',
      'Services': 'عداد خدمات',
      'Shared': 'عداد مشترك'
    };
    return labels[type] || type;
  }

  isSharedMeter(index: number): boolean {
    return this.metersArray.at(index).get('type')?.value === MeterType.Shared;
  }

  getLinkedUnitNames(index: number): string {
    const linkedIds: string[] = this.metersArray.at(index).get('linkedUnitIds')?.value || [];
    if (!linkedIds.length) return '';
    return this.buildingUnits
      .filter(u => linkedIds.includes(u.id))
      .map(u => u.unitCode)
      .join('، ');
  }

  toggleUnitLink(meterIndex: number, unitId: string) {
    const control = this.metersArray.at(meterIndex).get('linkedUnitIds');
    const current: string[] = control?.value || [];
    if (current.includes(unitId)) {
      control?.setValue(current.filter(id => id !== unitId));
    } else {
      control?.setValue([...current, unitId]);
    }
  }

  isUnitLinked(meterIndex: number, unitId: string): boolean {
    const linkedIds: string[] = this.metersArray.at(meterIndex).get('linkedUnitIds')?.value || [];
    return linkedIds.includes(unitId);
  }

  // Image handling (base64 for localStorage demo)
  onBuildingImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileToBase64(file).then(base64 => {
      this.buildingImagePreview = base64;
      this.buildingForm.patchValue({ imageUrl: base64 });
    });
  }

  onDeedImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileToBase64(file).then(base64 => {
      this.deedImagePreview = base64;
      this.buildingForm.patchValue({ deedImageUrl: base64 });
    });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  removeImage(type: 'building' | 'deed') {
    if (type === 'building') {
      this.buildingImagePreview = null;
      this.buildingForm.patchValue({ imageUrl: '' });
    } else {
      this.deedImagePreview = null;
      this.buildingForm.patchValue({ deedImageUrl: '' });
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

    // Add current user info for audit
    const currentUser = this.store.selectSnapshot(AuthState.user);

    if (this.isEditMode && this.buildingId) {
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
      // Add audit info for new buildings
      buildingData.addedByUserId = currentUser?.id;
      buildingData.addedByUserName = currentUser?.username;

      this.store.dispatch(new CreateBuilding(buildingData))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم إضافة المبنى بنجاح');
            const buildings = this.store.selectSnapshot(BuildingsState.buildings);
            const newBuilding = buildings[buildings.length - 1];

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
