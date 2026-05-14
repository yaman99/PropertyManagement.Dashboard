import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Building, BuildingStatus, MeterType, ElectricityMeter } from '../../../@core/domain/models/building.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { User } from '../../../@core/domain/models/auth.model';
import { BuildingsState, CreateBuilding, UpdateBuilding, LoadBuildings } from '../../../@core/state/buildings.state';
import { OwnersState, OwnersActions } from '../../../@core/state/owners.state';
import { UnitsState } from '../../../@core/state/units.state';
import { AuthState } from '../../../@core/state/auth.state';
import { AuthService } from '../../../@core/application/services/auth.service';
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

  // Employee users for renter manager selection
  employeeUsers: User[] = [];

  // Map
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  // Image previews
  buildingImagePreview: string | null = null;
  deedImagePreview: string | null = null;

  // Document file previews & names
  buildingLicenseFile: { name: string; url: string } | null = null;
  buildingPlanFile: { name: string; url: string } | null = null;
  realEstateAuthorityDeedFile: { name: string; url: string } | null = null;
  otherDocumentFiles: { name: string; url: string }[] = [];

  // Units for shared meter linking
  buildingUnits: Unit[] = [];

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService,
    private authService: AuthService
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

      // Images
      imageUrl: [''],
      deedImageUrl: [''],

      // Location
      latitude: [null],
      longitude: [null],
      mapLink: [''],

      // Guard
      guardName: [''],
      guardPhone: [''],

      // Unit counts
      apartmentCount: [null, [Validators.min(0)]],
      shopCount: [null, [Validators.min(0)]],
      guardRoomCount: [null, [Validators.min(0)]],
      rooftopCount: [null, [Validators.min(0)]],
      servicedApartmentCount: [null, [Validators.min(0)]],

      // Water meter
      waterMeterNumber: [''],

      // Documents
      buildingLicenseUrl: [''],
      buildingPlanUrl: [''],
      realEstateAuthorityDeedUrl: [''],
      otherDocumentUrls: [[]],

      // Management
      ownerManagerName: [''],
      renterManagerIds: [[]],

      // Electricity meters
      electricityMeters: this.fb.array([])
    });
  }

  get metersArray(): FormArray {
    return this.buildingForm.get('electricityMeters') as FormArray;
  }

  get selectedRenterManagerIds(): string[] {
    return this.buildingForm.get('renterManagerIds')?.value || [];
  }

  ngOnInit() {
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new LoadBuildings());

    // Load employee users for manager selection
    this.authService.getAllUsers().pipe(
      map(users => users.filter(u => u.role === 'Employee' && u.isActive))
    ).subscribe(employees => {
      this.employeeUsers = employees;
    });

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

    const lat = this.buildingForm.get('latitude')?.value || 21.5433;
    const lng = this.buildingForm.get('longitude')?.value || 39.1728; // Default: Jeddah

    this.map = L.map(this.mapContainer.nativeElement).setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    if (this.buildingForm.get('latitude')?.value && this.buildingForm.get('longitude')?.value) {
      this.placeMarker(lat, lng);
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.placeMarker(e.latlng.lat, e.latlng.lng);
      this.buildingForm.patchValue({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
  }

  // ─── Google Maps Link → Coordinates ────────────────────────────────────────

  onMapLinkInput(event: Event) {
    const url = (event.target as HTMLInputElement).value;
    if (!url) return;
    const coords = this.parseGoogleMapsLink(url);
    if (coords) {
      this.buildingForm.patchValue({ latitude: coords.lat, longitude: coords.lng });
      if (this.map) {
        this.map.setView([coords.lat, coords.lng], 16);
        this.placeMarker(coords.lat, coords.lng);
      }
    }
  }

  private parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
    try {
      const patterns = [
        /[?&]q=([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/,
        /@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/,
        /\/maps\/place\/[^/]+\/@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/,
        /\!3d([+-]?\d+\.?\d*)\!4d([+-]?\d+\.?\d*)/,
        /ll=([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/
      ];
      for (const pat of patterns) {
        const match = url.match(pat);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          // Basic sanity check for valid coordinates
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lat, lng };
          }
        }
      }
    } catch { }
    return null;
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
        this.buildingForm.patchValue({ latitude: pos.lat, longitude: pos.lng });
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

      if (building.imageUrl) this.buildingImagePreview = building.imageUrl;
      if (building.deedImageUrl) this.deedImagePreview = building.deedImageUrl;

      if (building.buildingLicenseUrl) this.buildingLicenseFile = { name: 'رخصة البناء', url: building.buildingLicenseUrl };
      if (building.buildingPlanUrl) this.buildingPlanFile = { name: 'مخططات البناء', url: building.buildingPlanUrl };
      if (building.realEstateAuthorityDeedUrl) this.realEstateAuthorityDeedFile = { name: 'صك الهيئة', url: building.realEstateAuthorityDeedUrl };

      if (building.electricityMeters?.length) {
        building.electricityMeters.forEach(meter => this.addMeter(meter));
      }
    } else {
      this.alertService.toastError('لم يتم العثور على المبنى');
      this.router.navigate(['/app/buildings']);
    }
  }

  // ─── Renter Manager Multi-select ───────────────────────────────────────────

  isManagerSelected(userId: string): boolean {
    return this.selectedRenterManagerIds.includes(userId);
  }

  toggleManager(userId: string) {
    const current = [...this.selectedRenterManagerIds];
    const idx = current.indexOf(userId);
    if (idx === -1) {
      current.push(userId);
    } else {
      current.splice(idx, 1);
    }
    this.buildingForm.patchValue({ renterManagerIds: current });
  }

  getManagerNames(): string {
    if (!this.selectedRenterManagerIds.length) return '-';
    return this.selectedRenterManagerIds
      .map(id => this.employeeUsers.find(u => u.id === id)?.username || id)
      .join('، ');
  }

  // ─── Electricity Meters ────────────────────────────────────────────────────

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
    return this.buildingUnits.filter(u => linkedIds.includes(u.id)).map(u => u.unitCode).join('، ');
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

  // ─── Image Handling ────────────────────────────────────────────────────────

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

  removeImage(type: 'building' | 'deed') {
    if (type === 'building') {
      this.buildingImagePreview = null;
      this.buildingForm.patchValue({ imageUrl: '' });
    } else {
      this.deedImagePreview = null;
      this.buildingForm.patchValue({ deedImageUrl: '' });
    }
  }

  // ─── Document File Handling ─────────────────────────────────────────────────

  onDocumentSelected(event: Event, docType: 'license' | 'plan' | 'deed') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.fileToBase64(file).then(base64 => {
      if (docType === 'license') {
        this.buildingLicenseFile = { name: file.name, url: base64 };
        this.buildingForm.patchValue({ buildingLicenseUrl: base64 });
      } else if (docType === 'plan') {
        this.buildingPlanFile = { name: file.name, url: base64 };
        this.buildingForm.patchValue({ buildingPlanUrl: base64 });
      } else {
        this.realEstateAuthorityDeedFile = { name: file.name, url: base64 };
        this.buildingForm.patchValue({ realEstateAuthorityDeedUrl: base64 });
      }
    });
  }

  removeDocument(docType: 'license' | 'plan' | 'deed') {
    if (docType === 'license') {
      this.buildingLicenseFile = null;
      this.buildingForm.patchValue({ buildingLicenseUrl: '' });
    } else if (docType === 'plan') {
      this.buildingPlanFile = null;
      this.buildingForm.patchValue({ buildingPlanUrl: '' });
    } else {
      this.realEstateAuthorityDeedFile = null;
      this.buildingForm.patchValue({ realEstateAuthorityDeedUrl: '' });
    }
  }

  onOtherDocumentSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    Array.from(files).forEach(file => {
      this.fileToBase64(file).then(base64 => {
        this.otherDocumentFiles.push({ name: file.name, url: base64 });
        const urls = this.otherDocumentFiles.map(f => f.url);
        this.buildingForm.patchValue({ otherDocumentUrls: urls });
      });
    });
  }

  removeOtherDocument(index: number) {
    this.otherDocumentFiles.splice(index, 1);
    this.buildingForm.patchValue({ otherDocumentUrls: this.otherDocumentFiles.map(f => f.url) });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  getStatusLabel(status: BuildingStatus): string {
    const labels: Record<string, string> = {
      'Active': 'نشط', 'UnderConstruction': 'تحت الإنشاء',
      'UnderMaintenance': 'تحت الصيانة', 'Inactive': 'غير نشط'
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
                this.router.navigate(['/app/buildings', newBuilding.id]);
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
