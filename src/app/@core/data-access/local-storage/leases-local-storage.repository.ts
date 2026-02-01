import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Lease, CreateLeaseDto, UpdateLeaseDto, LeaseStatus, PaymentStatus, PaymentCycle, PaymentScheduleItem } from '../../domain/models';
import { LeasesRepository } from '../interfaces';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class LeasesLocalStorageRepository implements LeasesRepository {
  private readonly STORAGE_KEY = 'leases';

  constructor(private storage: LocalStorageService) {}

  getAll(): Observable<Lease[]> {
    const leases = this.storage.getItem<Lease[]>(this.STORAGE_KEY) || [];
    return of(leases);
  }

  getById(id: string): Observable<Lease | undefined> {
    return this.getAll().pipe(
      map(leases => leases.find(l => l.id === id))
    );
  }

  getByUnitId(unitId: string): Observable<Lease[]> {
    return this.getAll().pipe(
      map(leases => leases.filter(l => l.unitId === unitId))
    );
  }

  getByRenterId(renterId: string): Observable<Lease[]> {
    return this.getAll().pipe(
      map(leases => leases.filter(l => l.renterId === renterId))
    );
  }

  create(dto: CreateLeaseDto): Observable<Lease> {
    const leases = this.storage.getItem<Lease[]>(this.STORAGE_KEY) || [];

    // Generate payment schedule if not provided
    const paymentSchedule = dto.paymentSchedule && dto.paymentSchedule.length > 0
      ? dto.paymentSchedule
      : this.generatePaymentSchedule(dto);

    // Extract only CreateLeaseDto properties to avoid overwriting generated values
    const newLease: Lease = {
      id: this.generateId(),
      ownerId: dto.ownerId,
      renterId: dto.renterId,
      unitId: dto.unitId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      paymentCycle: dto.paymentCycle,
      rentAmount: dto.rentAmount,
      depositAmount: dto.depositAmount || 0,
      dueDayOfMonth: dto.dueDayOfMonth || 1,
      status: LeaseStatus.Active,
      paymentSchedule: paymentSchedule,
      renterAccountId: '',
      unitLedgerAccountId: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    leases.push(newLease);
    this.storage.setItem(this.STORAGE_KEY, leases);
    return of(newLease);
  }

  update(id: string, dto: UpdateLeaseDto): Observable<Lease> {
    const leases = this.storage.getItem<Lease[]>(this.STORAGE_KEY) || [];
    const index = leases.findIndex(l => l.id === id);

    if (index === -1) {
      throw new Error('Lease not found');
    }

    leases[index] = {
      ...leases[index],
      ...dto,
      updatedAt: new Date()
    };

    this.storage.setItem(this.STORAGE_KEY, leases);
    return of(leases[index]);
  }

  delete(id: string): Observable<void> {
    const leases = this.storage.getItem<Lease[]>(this.STORAGE_KEY) || [];
    const filtered = leases.filter(l => l.id !== id);
    this.storage.setItem(this.STORAGE_KEY, filtered);
    return of(void 0);
  }

  private generateId(): string {
    return `LSE${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePaymentSchedule(dto: CreateLeaseDto): PaymentScheduleItem[] {
    const schedule: PaymentScheduleItem[] = [];
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const dueDay = dto.dueDayOfMonth || 1;

    let monthsIncrement = 1;
    switch (dto.paymentCycle) {
      case PaymentCycle.Quarterly:
        monthsIncrement = 3;
        break;
      case PaymentCycle.Yearly:
        monthsIncrement = 12;
        break;
    }

    let current = new Date(start);
    current.setDate(dueDay);

    while (current <= end) {
      schedule.push({
        dueDate: new Date(current),
        amount: dto.rentAmount,
        status: PaymentStatus.Pending
      });

      current.setMonth(current.getMonth() + monthsIncrement);
    }

    return schedule;
  }
}
