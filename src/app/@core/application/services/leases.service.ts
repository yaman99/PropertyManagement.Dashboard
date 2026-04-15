import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Lease, CreateLeaseDto, UpdateLeaseDto, LeaseStatus,
  PaymentScheduleItem, PaymentStatus, UnitStatus
} from '../../domain/models';
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
        const hasActiveLease = leases.some(l =>
          l.status === LeaseStatus.Active || l.status === LeaseStatus.Inactive
        );
        if (hasActiveLease) {
          return throwError(() => new Error('هذه الوحدة لديها عقد إيجار نشط أو قيد الانتظار بالفعل'));
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
   * Activate lease - called when deposit and commission are both paid
   * Updates unit status to Rented
   */
  activateLease(leaseId: string): Observable<Lease> {
    return this.getById(leaseId).pipe(
      switchMap(lease => {
        if (!lease) {
          return throwError(() => new Error('العقد غير موجود'));
        }

        if (lease.status === LeaseStatus.Active) {
          return throwError(() => new Error('العقد نشط بالفعل'));
        }

        return this.update(leaseId, {
          depositPaid: true,
          commissionPaid: true,
          status: LeaseStatus.Active
        }).pipe(
          switchMap(updatedLease => {
            return this.unitsService.updateStatus(lease.unitId, UnitStatus.Rented).pipe(
              map(() => updatedLease)
            );
          })
        );
      })
    );
  }

  /**
   * Mark deposit as paid
   */
  markDepositPaid(leaseId: string): Observable<Lease> {
    return this.update(leaseId, { depositPaid: true });
  }

  /**
   * Mark commission as paid
   */
  markCommissionPaid(leaseId: string): Observable<Lease> {
    return this.update(leaseId, { commissionPaid: true });
  }

  /**
   * End/cancel lease - update unit status back to available
   */
  endLease(leaseId: string, status: LeaseStatus.Expired | LeaseStatus.Cancelled): Observable<Lease> {
    return this.getById(leaseId).pipe(
      switchMap(lease => {
        if (!lease) {
          return throwError(() => new Error('العقد غير موجود'));
        }

        return this.update(leaseId, { status }).pipe(
          switchMap(updatedLease => {
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
   * Get leases with unpaid deposit
   */
  getLeasesWithUnpaidDeposit(): Observable<Lease[]> {
    return this.getAll().pipe(
      map(leases => leases.filter(l => !l.depositPaid && l.status !== LeaseStatus.Cancelled))
    );
  }

  /**
   * Get leases with unpaid commission
   */
  getLeasesWithUnpaidCommission(): Observable<Lease[]> {
    return this.getAll().pipe(
      map(leases => leases.filter(l => !l.commissionPaid && l.status !== LeaseStatus.Cancelled))
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
