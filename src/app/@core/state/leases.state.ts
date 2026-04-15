import { Injectable } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Lease, CreateLeaseDto, UpdateLeaseDto, LeaseStatus, WarningType, applyWarningToScheduleItem } from '../domain/models/lease.model';
import { LeasesService } from '../application/services/leases.service';

// Actions
export namespace LeasesActions {
  export class LoadLeases {
    static readonly type = '[Leases] Load Leases';
  }

  export class CreateLease {
    static readonly type = '[Leases] Create Lease';
    constructor(public payload: CreateLeaseDto) {}
  }

  export class UpdateLease {
    static readonly type = '[Leases] Update Lease';
    constructor(public id: string, public payload: UpdateLeaseDto) {}
  }

  export class DeleteLease {
    static readonly type = '[Leases] Delete Lease';
    constructor(public id: string) {}
  }

  export class ActivateLease {
    static readonly type = '[Leases] Activate Lease';
    constructor(public id: string) {}
  }

  export class MarkDepositPaid {
    static readonly type = '[Leases] Mark Deposit Paid';
    constructor(public id: string) {}
  }

  export class MarkCommissionPaid {
    static readonly type = '[Leases] Mark Commission Paid';
    constructor(public id: string) {}
  }

  export class TerminateLease {
    static readonly type = '[Leases] Terminate Lease';
    constructor(public id: string) {}
  }

  export class RecordPayment {
    static readonly type = '[Leases] Record Payment';
    constructor(public leaseId: string, public entryId: string, public amountPaid: number) {}
  }

  export class SelectLease {
    static readonly type = '[Leases] Select Lease';
    constructor(public id: string | null) {}
  }

  export class SendPaymentWarning {
    static readonly type = '[Leases] Send Payment Warning';
    constructor(
      public leaseId: string,
      public paymentIndex: number,
      public warningType: WarningType
    ) {}
  }
}

// State Model
export interface LeasesStateModel {
  leases: Lease[];
  selectedLeaseId: string | null;
  loading: boolean;
  error: string | null;
}

// State
@State<LeasesStateModel>({
  name: 'leases',
  defaults: {
    leases: [],
    selectedLeaseId: null,
    loading: false,
    error: null
  }
})
@Injectable()
export class LeasesState {
  constructor(private leasesService: LeasesService) {}

  @Selector()
  static leases(state: LeasesStateModel): Lease[] {
    return state.leases;
  }

  @Selector()
  static loading(state: LeasesStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static error(state: LeasesStateModel): string | null {
    return state.error;
  }

  @Selector()
  static selectedLease(state: LeasesStateModel): Lease | null {
    if (!state.selectedLeaseId) return null;
    return state.leases.find(l => l.id === state.selectedLeaseId) || null;
  }

  @Selector()
  static activeLeases(state: LeasesStateModel): Lease[] {
    return state.leases.filter(l => l.status === LeaseStatus.Active);
  }

  @Selector()
  static inactiveLeases(state: LeasesStateModel): Lease[] {
    return state.leases.filter(l => l.status === LeaseStatus.Inactive);
  }

  @Selector()
  static unpaidDepositLeases(state: LeasesStateModel): Lease[] {
    return state.leases.filter(l => !l.depositPaid && l.status !== LeaseStatus.Cancelled);
  }

  @Selector()
  static unpaidCommissionLeases(state: LeasesStateModel): Lease[] {
    return state.leases.filter(l => !l.commissionPaid && l.status !== LeaseStatus.Cancelled);
  }

  @Action(LeasesActions.LoadLeases)
  loadLeases(ctx: StateContext<LeasesStateModel>) {
    ctx.patchState({ loading: true, error: null });

    return this.leasesService.getAll().pipe(
      tap(leases => {
        ctx.patchState({ leases, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of([]);
      })
    );
  }

  @Action(LeasesActions.CreateLease)
  createLease(ctx: StateContext<LeasesStateModel>, action: LeasesActions.CreateLease) {
    ctx.patchState({ loading: true, error: null });

    return this.leasesService.create(action.payload).pipe(
      tap(lease => {
        const state = ctx.getState();
        ctx.patchState({
          leases: [...state.leases, lease],
          loading: false
        });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(LeasesActions.UpdateLease)
  updateLease(ctx: StateContext<LeasesStateModel>, action: LeasesActions.UpdateLease) {
    ctx.patchState({ loading: true, error: null });

    return this.leasesService.update(action.id, action.payload).pipe(
      tap(updatedLease => {
        if (updatedLease) {
          const state = ctx.getState();
          const leases = state.leases.map(l =>
            l.id === action.id ? updatedLease : l
          );
          ctx.patchState({ leases, loading: false });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(LeasesActions.DeleteLease)
  deleteLease(ctx: StateContext<LeasesStateModel>, action: LeasesActions.DeleteLease) {
    ctx.patchState({ loading: true, error: null });

    return this.leasesService.delete(action.id).pipe(
      tap(() => {
        const state = ctx.getState();
        const leases = state.leases.filter(l => l.id !== action.id);
        ctx.patchState({ leases, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(false);
      })
    );
  }

  @Action(LeasesActions.ActivateLease)
  activateLease(ctx: StateContext<LeasesStateModel>, action: LeasesActions.ActivateLease) {
    ctx.patchState({ loading: true, error: null });

    return this.leasesService.activateLease(action.id).pipe(
      tap(activatedLease => {
        if (activatedLease) {
          const state = ctx.getState();
          const leases = state.leases.map(l =>
            l.id === action.id ? activatedLease : l
          );
          ctx.patchState({ leases, loading: false });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(LeasesActions.MarkDepositPaid)
  markDepositPaid(ctx: StateContext<LeasesStateModel>, action: LeasesActions.MarkDepositPaid) {
    ctx.patchState({ loading: true, error: null });

    return this.leasesService.markDepositPaid(action.id).pipe(
      tap(updatedLease => {
        if (updatedLease) {
          const state = ctx.getState();
          const leases = state.leases.map(l =>
            l.id === action.id ? updatedLease : l
          );
          ctx.patchState({ leases, loading: false });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(LeasesActions.MarkCommissionPaid)
  markCommissionPaid(ctx: StateContext<LeasesStateModel>, action: LeasesActions.MarkCommissionPaid) {
    ctx.patchState({ loading: true, error: null });

    return this.leasesService.markCommissionPaid(action.id).pipe(
      tap(updatedLease => {
        if (updatedLease) {
          const state = ctx.getState();
          const leases = state.leases.map(l =>
            l.id === action.id ? updatedLease : l
          );
          ctx.patchState({ leases, loading: false });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(LeasesActions.TerminateLease)
  terminateLease(ctx: StateContext<LeasesStateModel>, action: LeasesActions.TerminateLease) {
    ctx.patchState({ loading: true, error: null });

    return this.leasesService.endLease(action.id, LeaseStatus.Cancelled).pipe(
      tap(terminatedLease => {
        if (terminatedLease) {
          const state = ctx.getState();
          const leases = state.leases.map(l =>
            l.id === action.id ? terminatedLease : l
          );
          ctx.patchState({ leases, loading: false });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(LeasesActions.RecordPayment)
  recordPayment(ctx: StateContext<LeasesStateModel>, action: LeasesActions.RecordPayment) {
    ctx.patchState({ loading: true, error: null });

    const state = ctx.getState();
    const lease = state.leases.find(l => l.id === action.leaseId);

    if (lease) {
      const updatedSchedule = lease.paymentSchedule.map(item =>
        item.dueDate.toString() === action.entryId
          ? { ...item, paidAmount: action.amountPaid, status: 'Paid' as any, paidDate: new Date() }
          : item
      );

      const updatedLease = { ...lease, paymentSchedule: updatedSchedule };
      const updatedLeases = state.leases.map(l => l.id === action.leaseId ? updatedLease : l);

      ctx.patchState({ leases: updatedLeases, loading: false });
      return of(updatedLease);
    }

    ctx.patchState({ loading: false });
    return of(null);
  }

  @Action(LeasesActions.SendPaymentWarning)
  sendPaymentWarning(ctx: StateContext<LeasesStateModel>, action: LeasesActions.SendPaymentWarning) {
    const state = ctx.getState();
    const lease = state.leases.find(l => l.id === action.leaseId);

    if (!lease) return of(null);

    const updatedSchedule = lease.paymentSchedule.map((item, index) =>
      index === action.paymentIndex
        ? applyWarningToScheduleItem(item, action.warningType)
        : item
    );

    const updatedLease: Lease = { ...lease, paymentSchedule: updatedSchedule, updatedAt: new Date() };

    return this.leasesService.update(action.leaseId, { paymentSchedule: updatedSchedule }).pipe(
      tap(result => {
        if (result) {
          const leases = state.leases.map(l => l.id === action.leaseId ? result : l);
          ctx.patchState({ leases });
        } else {
          // Optimistic update if service returns null
          const leases = state.leases.map(l => l.id === action.leaseId ? updatedLease : l);
          ctx.patchState({ leases });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message });
        return of(null);
      })
    );
  }

  @Action(LeasesActions.SelectLease)
  selectLease(ctx: StateContext<LeasesStateModel>, action: LeasesActions.SelectLease) {
    ctx.patchState({ selectedLeaseId: action.id });
  }
}
