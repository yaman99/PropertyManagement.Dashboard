import { Observable } from 'rxjs';
import { Owner, CreateOwnerDto, UpdateOwnerDto } from '../../domain/models';

/**
 * Owners Repository Interface
 * Abstraction for data access - can be implemented with LocalStorage or HttpClient
 */
export interface OwnersRepository {
  getAll(): Observable<Owner[]>;
  getById(id: string): Observable<Owner | undefined>;
  create(dto: CreateOwnerDto): Observable<Owner>;
  update(id: string, dto: UpdateOwnerDto): Observable<Owner>;
  delete(id: string): Observable<void>;
  search(query: string): Observable<Owner[]>;
}
