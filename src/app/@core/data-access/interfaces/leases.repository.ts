import { Observable } from 'rxjs';
import { Lease, CreateLeaseDto, UpdateLeaseDto } from '../../domain/models';

export interface LeasesRepository {
  getAll(): Observable<Lease[]>;
  getById(id: string): Observable<Lease | undefined>;
  getByUnitId(unitId: string): Observable<Lease[]>;
  getByRenterId(renterId: string): Observable<Lease[]>;
  create(dto: CreateLeaseDto): Observable<Lease>;
  update(id: string, dto: UpdateLeaseDto): Observable<Lease>;
  delete(id: string): Observable<void>;
}
