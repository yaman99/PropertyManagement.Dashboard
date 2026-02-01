import { Observable } from 'rxjs';
import { Building, CreateBuildingDto, UpdateBuildingDto } from '../../domain/models/building.model';

/**
 * Buildings Repository Interface
 * Defines data access contract for buildings
 */
export interface BuildingsRepository {
  getAll(): Observable<Building[]>;
  getById(id: string): Observable<Building | null>;
  getByOwnerId(ownerId: string): Observable<Building[]>;
  create(dto: CreateBuildingDto): Observable<Building>;
  update(dto: UpdateBuildingDto): Observable<Building>;
  delete(id: string): Observable<void>;
}
