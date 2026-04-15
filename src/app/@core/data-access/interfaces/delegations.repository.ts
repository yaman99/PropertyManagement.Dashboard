import { Observable } from 'rxjs';
import { OwnerDelegation, CreateDelegationDto, UpdateDelegationDto } from '../../domain/models';

export interface DelegationsRepository {
  getAll(): Observable<OwnerDelegation[]>;
  getById(id: string): Observable<OwnerDelegation | undefined>;
  getByOwnerId(ownerId: string): Observable<OwnerDelegation[]>;
  create(dto: CreateDelegationDto): Observable<OwnerDelegation>;
  update(id: string, dto: UpdateDelegationDto): Observable<OwnerDelegation>;
  delete(id: string): Observable<void>;
}
