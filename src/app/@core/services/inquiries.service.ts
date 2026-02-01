import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { InquiriesRepository } from '../repositories/inquiries.repository';
import { Inquiry, CreateInquiryDto, UpdateInquiryDto } from '../models/inquiry.model';

@Injectable({
  providedIn: 'root'
})
export class InquiriesService {
  constructor(private repository: InquiriesRepository) {}

  getAllInquiries(): Observable<Inquiry[]> {
    return this.repository.getAll();
  }

  getInquiryById(id: string): Observable<Inquiry | undefined> {
    return this.repository.getById(id);
  }

  getInquiriesByUnit(unitId: string): Observable<Inquiry[]> {
    return this.repository.getByUnitId(unitId);
  }

  createInquiry(dto: CreateInquiryDto): Observable<Inquiry> {
    return this.repository.create(dto);
  }

  updateInquiry(id: string, dto: UpdateInquiryDto): Observable<Inquiry> {
    return this.repository.update(id, dto);
  }

  deleteInquiry(id: string): Observable<void> {
    return this.repository.delete(id);
  }
}
