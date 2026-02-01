import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, map, throwError } from 'rxjs';
import { Renter, CreateRenterDto, UpdateRenterDto } from '../../domain/models';
import { RentersRepository } from '../../data-access/interfaces';
import { RentersLocalStorageRepository } from '../../data-access/local-storage';
import { AccountingService } from './accounting.service';

/**
 * Renters Application Service
 */
@Injectable({
  providedIn: 'root'
})
export class RentersService {
  private repository: RentersRepository = inject(RentersLocalStorageRepository);
  private accountingService = inject(AccountingService);

  getAll(): Observable<Renter[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<Renter | undefined> {
    return this.repository.getById(id);
  }

  create(dto: CreateRenterDto): Observable<Renter> {
    return this.repository.create(dto).pipe(
      switchMap(renter => {
        // Create ledger account for renter if they have a login account
        if (renter.hasAccount) {
          return this.accountingService.createRenterAccount(renter).pipe(
            map(() => renter)
          );
        }
        return [renter];
      })
    );
  }

  update(id: string, dto: UpdateRenterDto): Observable<Renter> {
    return this.repository.update(id, dto);
  }

  delete(id: string): Observable<void> {
    return this.repository.delete(id);
  }

  search(query: string): Observable<Renter[]> {
    return this.repository.search(query);
  }

  getActiveRenters(): Observable<Renter[]> {
    return this.getAll().pipe(
      map(renters => renters.filter(r => r.status === 'Active'))
    );
  }
}
