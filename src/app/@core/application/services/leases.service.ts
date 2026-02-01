import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, throwError, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Lease, CreateLeaseDto, UpdateLeaseDto, LeaseStatus, PaymentScheduleItem, PaymentStatus, PaymentCycle, UnitStatus } from '../../domain/models';
import { LeasesRepository } from '../../data-access/interfaces';
import { LeasesLocalStorageRepository } from '../../data-access/local-storage';
import { UnitsService } from './units.service';

/**
 * Leases Application Service
 * Handles lease agreements and business rules
 */
@Injectable({
  providedIn: 'root'
})
export class LeasesService {
  private repository: LeasesRepository = inject(LeasesLocalStorageRepository);
  private unitsService = inject(UnitsService);

  getAll(): Observable<Lease[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<Lease | undefined> {
    return this.repository.getById(id);
  }

  getByUnitId(unitId: string): Observable<Lease[]> {
    return this.repository.getByUnitId(unitId);
  }

  getByRenterId(renterId: string): Observable<Lease[]> {
    return this.repository.getByRenterId(renterId);
  }

  create(dto: CreateLeaseDto): Observable<Lease> {
    // Business rule: Check if unit already has an active lease
    return this.getByUnitId(dto.unitId).pipe(
      switchMap(leases => {
        const hasActiveLease = leases.some(l => l.status === LeaseStatus.Active);
        if (hasActiveLease) {
          return throwError(() => new Error('هذه الوحدة لديها عقد إيجار نشط بالفعل'));
        }

        return this.repository.create(dto);
      })
    );
  }

  update(id: string, dto: UpdateLeaseDto): Observable<Lease> {
    return this.repository.update(id, dto);
  }

  delete(id: string): Observable<void> {
    return this.repository.delete(id);
  }

  /**
   * Generate payment schedule based on lease terms
   */
  generatePaymentSchedule(lease: Lease): PaymentScheduleItem[] {
    const schedule: PaymentScheduleItem[] = [];
    const startDate = new Date(lease.startDate);
    const endDate = new Date(lease.endDate);
    const dueDay = lease.dueDayOfMonth || 1;

    let currentDate = new Date(startDate);
    currentDate.setDate(dueDay);

    while (currentDate <= endDate) {
      const item: PaymentScheduleItem = {
        dueDate: new Date(currentDate),
        amount: lease.rentAmount,
        status: PaymentStatus.Pending
      };
      schedule.push(item);

      // Increment based on payment cycle
      switch (lease.paymentCycle) {
        case PaymentCycle.Monthly:
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case PaymentCycle.Quarterly:
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case PaymentCycle.Yearly:
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }

    return schedule;
  }

  /**
   * Activate lease - updates unit status and generates schedule
   */
  activateLease(leaseId: string): Observable<Lease> {
    return this.getById(leaseId).pipe(
      switchMap(lease => {
        if (!lease) {
          return throwError(() => new Error('Lease not found'));
        }

        if (lease.status === LeaseStatus.Active) {
          return throwError(() => new Error('العقد نشط بالفعل'));
        }

        // Generate payment schedule
        const schedule = this.generatePaymentSchedule(lease);

        // Update lease status and schedule
        return this.update(leaseId, {
          status: LeaseStatus.Active,
          paymentSchedule: schedule
        } as any).pipe(
          switchMap(updatedLease => {
            // Update unit status to Rented
            return this.unitsService.updateStatus(lease.unitId, UnitStatus.Rented).pipe(
              map(() => updatedLease)
            );
          })
        );
      })
    );
  }

  /**
   * End/cancel lease - update unit status back to available
   */
  endLease(leaseId: string, status: LeaseStatus.Expired | LeaseStatus.Cancelled): Observable<Lease> {
    return this.getById(leaseId).pipe(
      switchMap(lease => {
        if (!lease) {
          return throwError(() => new Error('Lease not found'));
        }

        return this.update(leaseId, { status }).pipe(
          switchMap(updatedLease => {
            // Update unit status to Available
            return this.unitsService.updateStatus(lease.unitId, UnitStatus.Available).pipe(
              map(() => updatedLease)
            );
          })
        );
      })
    );
  }

  /**
   * Get active leases
   */
  getActiveLeases(): Observable<Lease[]> {
    return this.getAll().pipe(
      map(leases => leases.filter(l => l.status === LeaseStatus.Active))
    );
  }

  /**
   * Get overdue payments
   */
  getOverduePayments(): Observable<{ lease: Lease; payment: PaymentScheduleItem }[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.getActiveLeases().pipe(
      map(leases => {
        const overdue: { lease: Lease; payment: PaymentScheduleItem }[] = [];

        leases.forEach(lease => {
          lease.paymentSchedule.forEach(payment => {
            const dueDate = new Date(payment.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            if (payment.status === PaymentStatus.Pending && dueDate < today) {
              overdue.push({ lease, payment });
            }
          });
        });

        return overdue;
      })
    );
  }
}
