import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Unit, CreateUnitDto, UpdateUnitDto, UnitStatus } from '../../domain/models';
import { UnitsRepository } from '../interfaces';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class UnitsLocalStorageRepository implements UnitsRepository {
  private readonly STORAGE_KEY = 'units';

  constructor(private storage: LocalStorageService) {}

  getAll(): Observable<Unit[]> {
    const units = this.storage.getItem<Unit[]>(this.STORAGE_KEY) || [];
    // Ensure backward compatibility: add isPublished to existing units
    const unitsWithPublishFlag = units.map(unit => ({
      ...unit,
      isPublished: unit.isPublished ?? false
    }));
    return of(unitsWithPublishFlag);
  }

  getById(id: string): Observable<Unit | undefined> {
    return this.getAll().pipe(
      map(units => units.find(u => u.id === id))
    );
  }

  getByOwnerId(ownerId: string): Observable<Unit[]> {
    return this.getAll().pipe(
      map(units => units.filter(u => u.ownerId === ownerId))
    );
  }

  create(dto: CreateUnitDto): Observable<Unit> {
    const units = this.storage.getItem<Unit[]>(this.STORAGE_KEY) || [];

    const newUnit: Unit = {
      id: this.generateId(),
      ...dto,
      status: UnitStatus.Available,
      isPublished: dto.isPublished ?? false,
      ledgerAccountId: '', // Will be set by accounting service
      createdAt: new Date(),
      updatedAt: new Date()
    };

    units.push(newUnit);
    this.storage.setItem(this.STORAGE_KEY, units);
    return of(newUnit);
  }

  update(id: string, dto: UpdateUnitDto): Observable<Unit> {
    const units = this.storage.getItem<Unit[]>(this.STORAGE_KEY) || [];
    const index = units.findIndex(u => u.id === id);

    if (index === -1) {
      throw new Error('Unit not found');
    }

    units[index] = {
      ...units[index],
      ...dto,
      updatedAt: new Date()
    };

    this.storage.setItem(this.STORAGE_KEY, units);
    return of(units[index]);
  }

  delete(id: string): Observable<void> {
    const units = this.storage.getItem<Unit[]>(this.STORAGE_KEY) || [];
    const filtered = units.filter(u => u.id !== id);
    this.storage.setItem(this.STORAGE_KEY, filtered);
    return of(void 0);
  }

  search(query: string): Observable<Unit[]> {
    return this.getAll().pipe(
      map(units => units.filter(u =>
        u.unitCode.toLowerCase().includes(query.toLowerCase()) ||
        u.buildingName?.toLowerCase().includes(query.toLowerCase())
      ))
    );
  }

  private generateId(): string {
    return `UNIT${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }
}
