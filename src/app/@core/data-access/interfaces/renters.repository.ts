import { Observable } from 'rxjs';
import { Renter, CreateRenterDto, UpdateRenterDto } from '../../domain/models';

export interface RentersRepository {
  getAll(): Observable<Renter[]>;
  getById(id: string): Observable<Renter | undefined>;
  create(dto: CreateRenterDto): Observable<Renter>;
  update(id: string, dto: UpdateRenterDto): Observable<Renter>;
  delete(id: string): Observable<void>;
  search(query: string): Observable<Renter[]>;
}
