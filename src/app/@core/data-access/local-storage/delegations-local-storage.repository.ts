import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { OwnerDelegation, CreateDelegationDto, UpdateDelegationDto } from '../../domain/models';
import { DelegationsRepository } from '../interfaces/delegations.repository';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class DelegationsLocalStorageRepository implements DelegationsRepository {
  private readonly STORAGE_KEY = 'delegations';

  constructor(private storage: LocalStorageService) {}

  getAll(): Observable<OwnerDelegation[]> {
    const delegations = this.storage.getItem<OwnerDelegation[]>(this.STORAGE_KEY) || [];
    return of(delegations);
  }

  getById(id: string): Observable<OwnerDelegation | undefined> {
    return this.getAll().pipe(
      map(delegations => delegations.find(d => d.id === id))
    );
  }

  getByOwnerId(ownerId: string): Observable<OwnerDelegation[]> {
    return this.getAll().pipe(
      map(delegations => delegations.filter(d => d.ownerId === ownerId))
    );
  }

  create(dto: CreateDelegationDto): Observable<OwnerDelegation> {
    const delegations = this.storage.getItem<OwnerDelegation[]>(this.STORAGE_KEY) || [];

    const newDelegation: OwnerDelegation = {
      id: this.generateId(),
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    delegations.push(newDelegation);
    this.storage.setItem(this.STORAGE_KEY, delegations);
    return of(newDelegation);
  }

  update(id: string, dto: UpdateDelegationDto): Observable<OwnerDelegation> {
    const delegations = this.storage.getItem<OwnerDelegation[]>(this.STORAGE_KEY) || [];
    const index = delegations.findIndex(d => d.id === id);

    if (index === -1) {
      throw new Error('Delegation not found');
    }

    delegations[index] = {
      ...delegations[index],
      ...dto,
      updatedAt: new Date()
    };

    this.storage.setItem(this.STORAGE_KEY, delegations);
    return of(delegations[index]);
  }

  delete(id: string): Observable<void> {
    const delegations = this.storage.getItem<OwnerDelegation[]>(this.STORAGE_KEY) || [];
    const filtered = delegations.filter(d => d.id !== id);
    this.storage.setItem(this.STORAGE_KEY, filtered);
    return of(void 0);
  }

  private generateId(): string {
    return `DLG${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }
}
