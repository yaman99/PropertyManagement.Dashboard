import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Building, CreateBuildingDto, UpdateBuildingDto } from '../../domain/models/building.model';
import { BuildingsLocalStorageRepository } from '../../data-access/local-storage/buildings-local-storage.repository';

/**
 * Buildings Application Service
 * Handles building-related business logic
 */
@Injectable({ providedIn: 'root' })
export class BuildingsService {
  private repository = inject(BuildingsLocalStorageRepository);

  getAll(): Observable<Building[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<Building | null> {
    return this.repository.getById(id);
  }

  getByOwnerId(ownerId: string): Observable<Building[]> {
    return this.repository.getByOwnerId(ownerId);
  }

  create(dto: CreateBuildingDto): Observable<Building> {
    return this.repository.create(dto);
  }

  update(dto: UpdateBuildingDto): Observable<Building> {
    return this.repository.update(dto);
  }

  delete(id: string): Observable<void> {
    return this.repository.delete(id);
  }

  updateUnitCount(buildingId: string, count: number): void {
    this.repository.updateUnitCount(buildingId, count);
  }
}
