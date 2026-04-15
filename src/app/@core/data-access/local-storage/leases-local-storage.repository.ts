import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Lease, CreateLeaseDto, UpdateLeaseDto, LeaseStatus,
  generatePaymentSchedule, calculateEndDate, calculateCommission
} from '../../domain/models';
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

    const startDate = new Date(dto.startDate);
    const endDate = calculateEndDate(startDate, dto.contractDuration);
    const rentalCommission = calculateCommission(
      dto.totalContractValue,
      dto.commissionPercentage,
      dto.commissionDiscount || 0
    );
    const paymentSchedule = generatePaymentSchedule(
      startDate,
      dto.totalContractValue,
      dto.paymentCycle,
      dto.contractDuration
    );

    const newLease: Lease = {
      id: this.generateId(),
      buildingId: dto.buildingId,
      ownerId: dto.ownerId,
      renterId: dto.renterId,
      unitId: dto.unitId,
      startDate,
      endDate,
      contractDuration: dto.contractDuration,
      paymentCycle: dto.paymentCycle,
      totalContractValue: dto.totalContractValue,
      depositAmount: dto.depositAmount || 0,
      commissionPercentage: dto.commissionPercentage,
      rentalCommission,
      commissionDiscount: dto.commissionDiscount || 0,
      depositPaid: false,
      commissionPaid: false,
      inactiveReason: 'بانتظار دفع التأمين وعمولة التأجير',
      status: LeaseStatus.Inactive,
      paymentSchedule,
      ownerManagerName: dto.ownerManagerName,
      renterManagerName: dto.renterManagerName,
      createdByUserId: dto.createdByUserId,
      createdByUserName: dto.createdByUserName,
      assignedToUserId: dto.assignedToUserId,
      assignedToUserName: dto.assignedToUserName,
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

    const updated = {
      ...leases[index],
      ...dto,
      updatedAt: new Date()
    };

    // Auto-activate if both deposit and commission are paid
    if (updated.depositPaid && updated.commissionPaid && updated.status === LeaseStatus.Inactive) {
      updated.status = LeaseStatus.Active;
      updated.inactiveReason = undefined;
    }

    // Update inactive reason
    if (updated.status === LeaseStatus.Inactive) {
      const reasons: string[] = [];
      if (!updated.depositPaid) reasons.push('لم يتم دفع التأمين');
      if (!updated.commissionPaid) reasons.push('لم يتم دفع عمولة التأجير');
      updated.inactiveReason = reasons.join(' و ');
    }

    leases[index] = updated;
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
}
