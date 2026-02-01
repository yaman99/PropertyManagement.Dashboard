import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Request, CreateRequestDto, UpdateRequestDto, AddCommentDto } from '../../domain/models';
import { RequestsRepository } from '../../data-access/interfaces';
import { RequestsLocalStorageRepository } from '../../data-access/local-storage';
import { map } from 'rxjs/operators';

/**
 * Requests Application Service
 */
@Injectable({
  providedIn: 'root'
})
export class RequestsService {
  private repository: RequestsRepository = inject(RequestsLocalStorageRepository);

  getAll(): Observable<Request[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<Request | undefined> {
    return this.repository.getById(id);
  }

  getByRenterId(renterId: string): Observable<Request[]> {
    return this.repository.getByRenterId(renterId);
  }

  getByOwnerId(ownerId: string): Observable<Request[]> {
    return this.repository.getByOwnerId(ownerId);
  }

  create(dto: CreateRequestDto): Observable<Request> {
    return this.repository.create(dto);
  }

  update(id: string, dto: UpdateRequestDto): Observable<Request> {
    return this.repository.update(id, dto);
  }

  addComment(dto: AddCommentDto): Observable<Request> {
    return this.repository.addComment(dto);
  }

  delete(id: string): Observable<void> {
    return this.repository.delete(id);
  }

  getByStatus(status: string): Observable<Request[]> {
    return this.getAll().pipe(
      map(requests => requests.filter(r => r.status === status))
    );
  }
}
