import { Observable } from 'rxjs';
import { Request, CreateRequestDto, UpdateRequestDto, AddCommentDto } from '../../domain/models';

export interface RequestsRepository {
  getAll(): Observable<Request[]>;
  getById(id: string): Observable<Request | undefined>;
  getByRenterId(renterId: string): Observable<Request[]>;
  getByOwnerId(ownerId: string): Observable<Request[]>;
  create(dto: CreateRequestDto): Observable<Request>;
  update(id: string, dto: UpdateRequestDto): Observable<Request>;
  addComment(dto: AddCommentDto): Observable<Request>;
  delete(id: string): Observable<void>;
}
