import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { InquiriesRepository } from './inquiries.repository';
import { Inquiry, CreateInquiryDto, UpdateInquiryDto, InquiryStatus, InquirySource } from '../models/inquiry.model';

@Injectable()
export class InquiriesLocalStorageRepository implements InquiriesRepository {
  private readonly STORAGE_KEY = 'inquiries';

  private getInquiries(): Inquiry[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveInquiries(inquiries: Inquiry[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(inquiries));
  }

  getAll(): Observable<Inquiry[]> {
    return of(this.getInquiries());
  }

  getById(id: string): Observable<Inquiry | undefined> {
    const inquiries = this.getInquiries();
    return of(inquiries.find(i => i.id === id));
  }

  getByUnitId(unitId: string): Observable<Inquiry[]> {
    const inquiries = this.getInquiries();
    return of(inquiries.filter(i => i.unitId === unitId));
  }

  create(dto: CreateInquiryDto): Observable<Inquiry> {
    const inquiries = this.getInquiries();
    const newInquiry: Inquiry = {
      id: this.generateId(),
      ...dto,
      status: InquiryStatus.New,
      source: InquirySource.Website,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    inquiries.push(newInquiry);
    this.saveInquiries(inquiries);
    return of(newInquiry);
  }

  update(id: string, dto: UpdateInquiryDto): Observable<Inquiry> {
    const inquiries = this.getInquiries();
    const index = inquiries.findIndex(i => i.id === id);

    if (index === -1) {
      throw new Error('Inquiry not found');
    }

    const updatedInquiry: Inquiry = {
      ...inquiries[index],
      ...dto,
      updatedAt: new Date().toISOString(),
      contactedAt: dto.status === InquiryStatus.Contacted && !inquiries[index].contactedAt
        ? new Date().toISOString()
        : inquiries[index].contactedAt,
      convertedAt: dto.status === InquiryStatus.Converted && !inquiries[index].convertedAt
        ? new Date().toISOString()
        : inquiries[index].convertedAt
    };

    inquiries[index] = updatedInquiry;
    this.saveInquiries(inquiries);
    return of(updatedInquiry);
  }

  delete(id: string): Observable<void> {
    const inquiries = this.getInquiries();
    const filtered = inquiries.filter(i => i.id !== id);
    this.saveInquiries(filtered);
    return of(void 0);
  }

  private generateId(): string {
    return 'INQ' + Date.now() + Math.random().toString(36).substr(2, 9);
  }
}
