import { Injectable } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Renter, CreateRenterDto } from '../domain/models/renter.model';
import { RentersService } from '../application/services/renters.service';

// Actions
export namespace RentersActions {
  export class LoadRenters {
    static readonly type = '[Renters] Load Renters';
  }

  export class CreateRenter {
    static readonly type = '[Renters] Create Renter';
    constructor(public payload: CreateRenterDto) {}
  }

  export class UpdateRenter {
    static readonly type = '[Renters] Update Renter';
    constructor(public id: string, public payload: Partial<Renter>) {}
  }

  export class DeleteRenter {
    static readonly type = '[Renters] Delete Renter';
    constructor(public id: string) {}
  }

  export class SelectRenter {
    static readonly type = '[Renters] Select Renter';
    constructor(public id: string | null) {}
  }
}

// State Model
export interface RentersStateModel {
  renters: Renter[];
  selectedRenterId: string | null;
  loading: boolean;
  error: string | null;
}

// State
@State<RentersStateModel>({
  name: 'renters',
  defaults: {
    renters: [],
    selectedRenterId: null,
    loading: false,
    error: null
  }
})
@Injectable()
export class RentersState {
  constructor(
    private rentersService: RentersService
  ) {}

  @Selector()
  static renters(state: RentersStateModel): Renter[] {
    return state.renters;
  }

  @Selector()
  static loading(state: RentersStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static error(state: RentersStateModel): string | null {
    return state.error;
  }

  @Selector()
  static selectedRenter(state: RentersStateModel): Renter | null {
    if (!state.selectedRenterId) return null;
    return state.renters.find(r => r.id === state.selectedRenterId) || null;
  }

  @Selector()
  static nonBlacklistedRenters(state: RentersStateModel): Renter[] {
    return state.renters.filter(r => !r.isBlacklisted);
  }

  @Selector()
  static blacklistedRenters(state: RentersStateModel): Renter[] {
    return state.renters.filter(r => r.isBlacklisted);
  }

  @Action(RentersActions.LoadRenters)
  loadRenters(ctx: StateContext<RentersStateModel>) {
    ctx.patchState({ loading: true, error: null });

    return this.rentersService.getAll().pipe(
      tap(renters => {
        ctx.patchState({ renters, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of([]);
      })
    );
  }

  @Action(RentersActions.CreateRenter)
  createRenter(ctx: StateContext<RentersStateModel>, action: RentersActions.CreateRenter) {
    ctx.patchState({ loading: true, error: null });

    // Account creation is handled inside RentersService.create() — no duplication here
    return this.rentersService.create(action.payload).pipe(
      tap(renter => {
        const state = ctx.getState();
        ctx.patchState({
          renters: [...state.renters, renter],
          loading: false
        });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(RentersActions.UpdateRenter)
  updateRenter(ctx: StateContext<RentersStateModel>, action: RentersActions.UpdateRenter) {
    ctx.patchState({ loading: true, error: null });

    return this.rentersService.update(action.id, action.payload).pipe(
      tap(updatedRenter => {
        if (updatedRenter) {
          const state = ctx.getState();
          const renters = state.renters.map(r =>
            r.id === action.id ? updatedRenter : r
          );
          ctx.patchState({ renters, loading: false });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(RentersActions.DeleteRenter)
  deleteRenter(ctx: StateContext<RentersStateModel>, action: RentersActions.DeleteRenter) {
    ctx.patchState({ loading: true, error: null });

    return this.rentersService.delete(action.id).pipe(
      tap(() => {
        const state = ctx.getState();
        const renters = state.renters.filter(r => r.id !== action.id);
        ctx.patchState({ renters, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(false);
      })
    );
  }

  @Action(RentersActions.SelectRenter)
  selectRenter(ctx: StateContext<RentersStateModel>, action: RentersActions.SelectRenter) {
    ctx.patchState({ selectedRenterId: action.id });
  }
}
