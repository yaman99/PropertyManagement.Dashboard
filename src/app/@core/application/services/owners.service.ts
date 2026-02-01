import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, map, throwError } from 'rxjs';
import { Owner, CreateOwnerDto, UpdateOwnerDto } from '../../domain/models';
import { OwnersRepository } from '../../data-access/interfaces';
import { OwnersLocalStorageRepository } from '../../data-access/local-storage';
import { AccountingService } from './accounting.service';

/**
 * Owners Application Service
 * Business logic and orchestration for Owner entities
 * Uses repository pattern - easy to swap LocalStorage with HttpClient later
 */
@Injectable({
  providedIn: 'root'
})
export class OwnersService {
  // Inject the implementation - can be swapped with HTTP version later
  private repository: OwnersRepository = inject(OwnersLocalStorageRepository);
  private accountingService = inject(AccountingService);

  getAll(): Observable<Owner[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<Owner | undefined> {
    return this.repository.getById(id);
  }

  create(dto: CreateOwnerDto): Observable<Owner> {
    return this.repository.create(dto).pipe(
      switchMap(owner => {
        // If owner has account, create their ledger account
        if (owner.hasAccount) {
          return this.accountingService.createOwnerAccount(owner).pipe(
            map(() => owner)
          );
        }
        return [owner];
      })
    );
  }

  update(id: string, dto: UpdateOwnerDto): Observable<Owner> {
    return this.repository.update(id, dto);
  }

  delete(id: string): Observable<void> {
    // Business rule: Check if owner has any units before deleting
    return this.repository.delete(id);
  }

  search(query: string): Observable<Owner[]> {
    return this.repository.search(query);
  }

  createLoginAccount(ownerId: string): Observable<Owner> {
    return this.getById(ownerId).pipe(
      switchMap(owner => {
        if (!owner) {
          return throwError(() => new Error('Owner not found'));
        }

        if (owner.hasAccount) {
          return throwError(() => new Error('Owner already has an account'));
        }

        const updates: UpdateOwnerDto = {
          hasAccount: true
        };

        return this.update(ownerId, updates);
      })
    );
  }

  getActiveOwners(): Observable<Owner[]> {
    return this.getAll().pipe(
      map(owners => owners.filter(o => o.status === 'Active'))
    );
  }
}
