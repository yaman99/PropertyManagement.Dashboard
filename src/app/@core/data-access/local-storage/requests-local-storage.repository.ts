import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, CreateRequestDto, UpdateRequestDto, AddCommentDto, RequestStatus } from '../../domain/models';
import { RequestsRepository } from '../interfaces';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class RequestsLocalStorageRepository implements RequestsRepository {
  private readonly STORAGE_KEY = 'requests';

  constructor(private storage: LocalStorageService) {}

  getAll(): Observable<Request[]> {
    const requests = this.storage.getItem<Request[]>(this.STORAGE_KEY) || [];
    return of(requests);
  }

  getById(id: string): Observable<Request | undefined> {
    return this.getAll().pipe(
      map(requests => requests.find(r => r.id === id))
    );
  }

  getByRenterId(renterId: string): Observable<Request[]> {
    return this.getAll().pipe(
      map(requests => requests.filter(r => r.renterId === renterId))
    );
  }

  getByOwnerId(ownerId: string): Observable<Request[]> {
    return this.getAll().pipe(
      map(requests => requests.filter(r => r.ownerId === ownerId))
    );
  }

  create(dto: CreateRequestDto): Observable<Request> {
    const requests = this.storage.getItem<Request[]>(this.STORAGE_KEY) || [];

    const newRequest: Request = {
      id: this.generateId(),
      ...dto,
      status: RequestStatus.New,
      photos: dto.photos || [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    requests.push(newRequest);
    this.storage.setItem(this.STORAGE_KEY, requests);
    return of(newRequest);
  }

  update(id: string, dto: UpdateRequestDto): Observable<Request> {
    const requests = this.storage.getItem<Request[]>(this.STORAGE_KEY) || [];
    const index = requests.findIndex(r => r.id === id);

    if (index === -1) {
      throw new Error('Request not found');
    }

    requests[index] = {
      ...requests[index],
      ...dto,
      updatedAt: new Date()
    };

    this.storage.setItem(this.STORAGE_KEY, requests);
    return of(requests[index]);
  }

  addComment(dto: AddCommentDto): Observable<Request> {
    const requests = this.storage.getItem<Request[]>(this.STORAGE_KEY) || [];
    const index = requests.findIndex(r => r.id === dto.requestId);

    if (index === -1) {
      throw new Error('Request not found');
    }

    const newComment = {
      id: this.generateId(),
      by: dto.by,
      text: dto.text,
      at: new Date()
    };

    requests[index].comments.push(newComment);
    requests[index].updatedAt = new Date();

    this.storage.setItem(this.STORAGE_KEY, requests);
    return of(requests[index]);
  }

  delete(id: string): Observable<void> {
    const requests = this.storage.getItem<Request[]>(this.STORAGE_KEY) || [];
    const filtered = requests.filter(r => r.id !== id);
    this.storage.setItem(this.STORAGE_KEY, filtered);
    return of(void 0);
  }

  private generateId(): string {
    return `REQ${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }
}
