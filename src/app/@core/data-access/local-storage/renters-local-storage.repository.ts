import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Renter, CreateRenterDto, UpdateRenterDto, RenterStatus } from '../../domain/models';
import { RentersRepository } from '../interfaces';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class RentersLocalStorageRepository implements RentersRepository {
  private readonly STORAGE_KEY = 'renters';

  constructor(private storage: LocalStorageService) {}

  getAll(): Observable<Renter[]> {
    const renters = this.storage.getItem<Renter[]>(this.STORAGE_KEY) || [];
    return of(renters);
  }

  getById(id: string): Observable<Renter | undefined> {
    return this.getAll().pipe(
      map(renters => renters.find(r => r.id === id))
    );
  }

  create(dto: CreateRenterDto): Observable<Renter> {
    const renters = this.storage.getItem<Renter[]>(this.STORAGE_KEY) || [];

    const newRenter: Renter = {
      id: this.generateId(),
      ...dto,
      status: RenterStatus.Active,
      role: 'Renter',
      username: dto.hasAccount ? this.generateUsername(dto.fullName) : undefined,
      tempPassword: dto.hasAccount ? this.generateTempPassword() : undefined,
      tempPasswordSentAt: dto.hasAccount ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    renters.push(newRenter);
    this.storage.setItem(this.STORAGE_KEY, renters);
    return of(newRenter);
  }

  update(id: string, dto: UpdateRenterDto): Observable<Renter> {
    const renters = this.storage.getItem<Renter[]>(this.STORAGE_KEY) || [];
    const index = renters.findIndex(r => r.id === id);

    if (index === -1) {
      throw new Error('Renter not found');
    }

    renters[index] = {
      ...renters[index],
      ...dto,
      updatedAt: new Date()
    };

    this.storage.setItem(this.STORAGE_KEY, renters);
    return of(renters[index]);
  }

  delete(id: string): Observable<void> {
    const renters = this.storage.getItem<Renter[]>(this.STORAGE_KEY) || [];
    const filtered = renters.filter(r => r.id !== id);
    this.storage.setItem(this.STORAGE_KEY, filtered);
    return of(void 0);
  }

  search(query: string): Observable<Renter[]> {
    return this.getAll().pipe(
      map(renters => renters.filter(r =>
        r.fullName.toLowerCase().includes(query.toLowerCase()) ||
        r.email.toLowerCase().includes(query.toLowerCase()) ||
        r.phone.includes(query)
      ))
    );
  }

  private generateId(): string {
    return `RNT${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUsername(fullName: string): string {
    const base = fullName.toLowerCase().replace(/\s+/g, '.');
    return `${base}.${Math.random().toString(36).substr(2, 4)}`;
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).substr(2, 10);
  }
}
