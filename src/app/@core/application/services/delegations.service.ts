import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OwnerDelegation, CreateDelegationDto, UpdateDelegationDto } from '../../domain/models';
import { DelegationsRepository } from '../../data-access/interfaces/delegations.repository';
import { DelegationsLocalStorageRepository } from '../../data-access/local-storage/delegations-local-storage.repository';

@Injectable({
  providedIn: 'root'
})
export class DelegationsService {
  private repository: DelegationsRepository = inject(DelegationsLocalStorageRepository);

  getAll(): Observable<OwnerDelegation[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<OwnerDelegation | undefined> {
    return this.repository.getById(id);
  }

  getByOwnerId(ownerId: string): Observable<OwnerDelegation[]> {
    return this.repository.getByOwnerId(ownerId);
  }

  create(dto: CreateDelegationDto): Observable<OwnerDelegation> {
    return this.repository.create(dto);
  }

  update(id: string, dto: UpdateDelegationDto): Observable<OwnerDelegation> {
    return this.repository.update(id, dto);
  }

  delete(id: string): Observable<void> {
    return this.repository.delete(id);
  }
}
