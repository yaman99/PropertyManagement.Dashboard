import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Building, BuildingStatus, CreateBuildingDto, UpdateBuildingDto } from '../../domain/models/building.model';
import { BuildingsRepository } from '../interfaces/buildings.repository';

/**
 * Buildings LocalStorage Repository
 * Implements data access using browser localStorage for demo purposes
 */
@Injectable({ providedIn: 'root' })
export class BuildingsLocalStorageRepository implements BuildingsRepository {
  private readonly STORAGE_KEY = 'marbae_buildings';

  getAll(): Observable<Building[]> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    const buildings: Building[] = data ? JSON.parse(data) : [];
    return of(buildings);
  }

  getById(id: string): Observable<Building | null> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    const buildings: Building[] = data ? JSON.parse(data) : [];
    return of(buildings.find(b => b.id === id) || null);
  }

  getByOwnerId(ownerId: string): Observable<Building[]> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    const buildings: Building[] = data ? JSON.parse(data) : [];
    return of(buildings.filter(b => b.ownerId === ownerId));
  }

  create(dto: CreateBuildingDto): Observable<Building> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    const buildings: Building[] = data ? JSON.parse(data) : [];

    const newBuilding: Building = {
      id: 'BLD-' + Date.now(),
      ownerId: dto.ownerId,
      name: dto.name,
      address: dto.address,
      city: dto.city,
      district: dto.district,
      totalFloors: dto.totalFloors,
      totalUnits: 0,
      yearBuilt: dto.yearBuilt,
      status: BuildingStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    buildings.push(newBuilding);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(buildings));

    return of(newBuilding);
  }

  update(dto: UpdateBuildingDto): Observable<Building> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    let buildings: Building[] = data ? JSON.parse(data) : [];

    const index = buildings.findIndex(b => b.id === dto.id);
    if (index === -1) {
      throw new Error('Building not found');
    }

    buildings[index] = {
      ...buildings[index],
      ...dto,
      updatedAt: new Date()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(buildings));
    return of(buildings[index]);
  }

  delete(id: string): Observable<void> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    let buildings: Building[] = data ? JSON.parse(data) : [];

    buildings = buildings.filter(b => b.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(buildings));

    return of(void 0);
  }

  // Helper to update unit count
  updateUnitCount(buildingId: string, count: number): void {
    const data = localStorage.getItem(this.STORAGE_KEY);
    let buildings: Building[] = data ? JSON.parse(data) : [];

    const index = buildings.findIndex(b => b.id === buildingId);
    if (index !== -1) {
      buildings[index].totalUnits = count;
      buildings[index].updatedAt = new Date();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(buildings));
    }
  }
}
