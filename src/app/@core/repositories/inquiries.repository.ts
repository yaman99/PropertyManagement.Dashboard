import { Observable } from 'rxjs';
import { Inquiry, CreateInquiryDto, UpdateInquiryDto } from '../models/inquiry.model';

export abstract class InquiriesRepository {
  abstract getAll(): Observable<Inquiry[]>;
  abstract getById(id: string): Observable<Inquiry | undefined>;
  abstract getByUnitId(unitId: string): Observable<Inquiry[]>;
  abstract create(dto: CreateInquiryDto): Observable<Inquiry>;
  abstract update(id: string, dto: UpdateInquiryDto): Observable<Inquiry>;
  abstract delete(id: string): Observable<void>;
}
