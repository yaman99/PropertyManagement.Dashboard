import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import { Building } from '../../../@core/domain/models/building.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { LoadBuildings, BuildingsState } from '../../../@core/state/buildings.state';
import { OwnersActions, OwnersState } from '../../../@core/state/owners.state';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { Router } from '@angular/router';
import * as L from 'leaflet';

interface BuildingWithStats {
  building: Building;
  ownerName?: string;
  totalUnits: number;
  availableUnits: number;
}

@Component({
  selector: 'app-buildings-map',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './buildings-map.component.html',
  styleUrls: ['./buildings-map.component.scss']
})
export class BuildingsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];

  selectedBuilding: BuildingWithStats | null = null;

  buildingsWithStats$: Observable<BuildingWithStats[]>;

  constructor(private store: Store, private router: Router) {
    this.buildingsWithStats$ = combineLatest([
      this.store.select(BuildingsState.buildings),
      this.store.select(OwnersState.owners),
      this.store.select(UnitsState.units)
    ]).pipe(
      map(([buildings, owners, units]) =>
        buildings.map(b => ({
          building: b,
          ownerName: owners.find(o => o.id === b.ownerId)?.fullName,
          totalUnits: units.filter(u => u.buildingId === b.id).length,
          availableUnits: units.filter(u => u.buildingId === b.id && u.status === 'Available').length
        }))
      )
    );
  }

  ngOnInit() {
    this.store.dispatch(new LoadBuildings());
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new UnitsActions.LoadUnits());
  }

  ngAfterViewInit() {
    setTimeout(() => this.initMap(), 300);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap() {
    if (!this.mapContainer?.nativeElement) return;

    this.map = L.map(this.mapContainer.nativeElement).setView([21.5433, 39.1728], 12); // Jeddah

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Load buildings and place markers
    this.buildingsWithStats$.subscribe(items => {
      this.clearMarkers();
      items.forEach(item => this.addMarker(item));
    });
  }

  private clearMarkers() {
    this.markers.forEach(m => m.remove());
    this.markers = [];
  }

  private addMarker(item: BuildingWithStats) {
    const b = item.building;
    if (!this.map) return;

    let lat = b.latitude;
    let lng = b.longitude;

    // Try to parse Google Maps link if no lat/lng
    if ((!lat || !lng) && b.mapLink) {
      const coords = this.parseGoogleMapsLink(b.mapLink);
      if (coords) { lat = coords.lat; lng = coords.lng; }
    }

    if (!lat || !lng) return; // No location available

    const icon = L.divIcon({
      html: `<div class="map-marker-icon"><i class="bi bi-building-fill"></i><span class="marker-label">${b.name}</span></div>`,
      className: '',
      iconSize: [52, 52],
      iconAnchor: [26, 52]
    });

    const marker = L.marker([lat, lng], { icon })
      .addTo(this.map!)
      .bindPopup(this.buildPopupHtml(item), { maxWidth: 280 });

    marker.on('click', () => {
      this.selectedBuilding = item;
    });

    this.markers.push(marker);
  }

  private buildPopupHtml(item: BuildingWithStats): string {
    const b = item.building;
    return `
      <div dir="rtl" style="font-family:Cairo,Tajawal,sans-serif; min-width:200px;">
        <h6 class="fw-bold mb-1" style="color:#BC8545">${b.name}</h6>
        <p class="mb-1 small text-muted">${b.address}</p>
        ${item.ownerName ? `<p class="mb-1 small"><strong>المالك:</strong> ${item.ownerName}</p>` : ''}
        <div class="d-flex gap-2 mt-2">
          <span class="badge bg-secondary">${item.totalUnits} وحدة</span>
          <span class="badge bg-success">${item.availableUnits} متاح</span>
        </div>
        ${b.mapLink ? `<a href="${b.mapLink}" target="_blank" class="btn btn-sm btn-outline-secondary mt-2 w-100">
          <i class="bi bi-map me-1"></i> فتح في جوجل ماب
        </a>` : ''}
      </div>`;
  }

  private parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
    try {
      // Handles formats like:
      // https://maps.google.com/?q=24.7136,46.6753
      // https://www.google.com/maps/@24.7136,46.6753,17z
      const patterns = [
        /[?&]q=([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/,
        /@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/,
        /\/maps\/place\/[^/]+\/@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/
      ];
      for (const pat of patterns) {
        const match = url.match(pat);
        if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      }
    } catch { }
    return null;
  }

  selectBuilding(item: BuildingWithStats) {
    this.selectedBuilding = item;
    // Pan map to building
    const b = item.building;
    if (this.map && b.latitude && b.longitude) {
      this.map.flyTo([b.latitude, b.longitude], 16);
    }
  }

  goToBuilding(buildingId: string) {
    this.router.navigate(['/app/buildings', buildingId]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'Active': 'نشط', 'UnderConstruction': 'تحت الإنشاء',
      'UnderMaintenance': 'تحت الصيانة', 'Inactive': 'غير نشط'
    };
    return labels[status] || status;
  }
}
