import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, map } from 'rxjs';
import { Unit, CreateUnitDto, UpdateUnitDto, UnitStatus } from '../../domain/models';
import { UnitsRepository } from '../../data-access/interfaces';
import { UnitsLocalStorageRepository } from '../../data-access/local-storage';
import { AccountingService } from './accounting.service';

/**
 * Units Application Service
 */
@Injectable({
  providedIn: 'root'
})
export class UnitsService {
  private repository: UnitsRepository = inject(UnitsLocalStorageRepository);
  private accountingService = inject(AccountingService);

  getAll(): Observable<Unit[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<Unit | undefined> {
    return this.repository.getById(id);
  }

  getByOwnerId(ownerId: string): Observable<Unit[]> {
    return this.repository.getByOwnerId(ownerId);
  }

  create(dto: CreateUnitDto): Observable<Unit> {
    return this.repository.create(dto).pipe(
      switchMap(unit => {
        // Auto-create ledger account for unit
        return this.accountingService.createUnitAccount(unit).pipe(
          switchMap(account => {
            // Update unit with ledger account ID
            return this.repository.update(unit.id, {
              ...dto,
              ledgerAccountId: account.id
            } as UpdateUnitDto);
          })
        );
      })
    );
  }

  update(id: string, dto: UpdateUnitDto): Observable<Unit> {
    return this.repository.update(id, dto);
  }

  delete(id: string): Observable<void> {
    return this.repository.delete(id);
  }

  search(query: string): Observable<Unit[]> {
    return this.repository.search(query);
  }

  getAvailableUnits(): Observable<Unit[]> {
    return this.getAll().pipe(
      map(units => units.filter(u => u.status === UnitStatus.Available))
    );
  }

  updateStatus(unitId: string, status: UnitStatus): Observable<Unit> {
    return this.repository.update(unitId, { status });
  }
}
