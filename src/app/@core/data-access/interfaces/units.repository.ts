import { Observable } from 'rxjs';
import { Unit, CreateUnitDto, UpdateUnitDto } from '../../domain/models';

export interface UnitsRepository {
  getAll(): Observable<Unit[]>;
  getById(id: string): Observable<Unit | undefined>;
  getByOwnerId(ownerId: string): Observable<Unit[]>;
  create(dto: CreateUnitDto): Observable<Unit>;
  update(id: string, dto: UpdateUnitDto): Observable<Unit>;
  delete(id: string): Observable<void>;
  search(query: string): Observable<Unit[]>;
}
