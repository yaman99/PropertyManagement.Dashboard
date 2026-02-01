import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Owner, CreateOwnerDto, UpdateOwnerDto, OwnerStatus } from '../../domain/models';
import { OwnersRepository } from '../interfaces';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class OwnersLocalStorageRepository implements OwnersRepository {
  private readonly STORAGE_KEY = 'owners';

  constructor(private storage: LocalStorageService) {}

  getAll(): Observable<Owner[]> {
    const owners = this.storage.getItem<Owner[]>(this.STORAGE_KEY) || [];
    return of(owners);
  }

  getById(id: string): Observable<Owner | undefined> {
    return this.getAll().pipe(
      map(owners => owners.find(o => o.id === id))
    );
  }

  create(dto: CreateOwnerDto): Observable<Owner> {
    const owners = this.storage.getItem<Owner[]>(this.STORAGE_KEY) || [];

    const newOwner: Owner = {
      id: this.generateId(),
      ...dto,
      status: OwnerStatus.Active,
      role: 'Owner',
      username: dto.hasAccount ? this.generateUsername(dto.fullName) : undefined,
      tempPassword: dto.hasAccount ? this.generateTempPassword() : undefined,
      tempPasswordSentAt: dto.hasAccount ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    owners.push(newOwner);
    this.storage.setItem(this.STORAGE_KEY, owners);
    return of(newOwner);
  }

  update(id: string, dto: UpdateOwnerDto): Observable<Owner> {
    const owners = this.storage.getItem<Owner[]>(this.STORAGE_KEY) || [];
    const index = owners.findIndex(o => o.id === id);

    if (index === -1) {
      throw new Error('Owner not found');
    }

    owners[index] = {
      ...owners[index],
      ...dto,
      updatedAt: new Date()
    };

    this.storage.setItem(this.STORAGE_KEY, owners);
    return of(owners[index]);
  }

  delete(id: string): Observable<void> {
    const owners = this.storage.getItem<Owner[]>(this.STORAGE_KEY) || [];
    const filtered = owners.filter(o => o.id !== id);
    this.storage.setItem(this.STORAGE_KEY, filtered);
    return of(void 0);
  }

  search(query: string): Observable<Owner[]> {
    return this.getAll().pipe(
      map(owners => owners.filter(o =>
        o.fullName.toLowerCase().includes(query.toLowerCase()) ||
        o.email.toLowerCase().includes(query.toLowerCase()) ||
        o.phone.includes(query)
      ))
    );
  }

  private generateId(): string {
    return `OWN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUsername(fullName: string): string {
    const base = fullName.toLowerCase().replace(/\s+/g, '.');
    return `${base}.${Math.random().toString(36).substr(2, 4)}`;
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).substr(2, 10);
  }
}
