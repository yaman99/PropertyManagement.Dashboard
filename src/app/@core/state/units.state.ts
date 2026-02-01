import { Injectable } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { Unit } from '../domain/models/unit.model';
import { UnitsService } from '../application/services/units.service';
import { AccountingService } from '../application/services/accounting.service';

// Actions
export namespace UnitsActions {
  export class LoadUnits {
    static readonly type = '[Units] Load Units';
  }

  export class CreateUnit {
    static readonly type = '[Units] Create Unit';
    constructor(public payload: Unit) {}
  }

  export class UpdateUnit {
    static readonly type = '[Units] Update Unit';
    constructor(public id: string, public payload: Partial<Unit>) {}
  }

  export class DeleteUnit {
    static readonly type = '[Units] Delete Unit';
    constructor(public id: string) {}
  }

  export class SelectUnit {
    static readonly type = '[Units] Select Unit';
    constructor(public id: string | null) {}
  }
}

// State Model
export interface UnitsStateModel {
  units: Unit[];
  selectedUnitId: string | null;
  loading: boolean;
  error: string | null;
}

// State
@State<UnitsStateModel>({
  name: 'units',
  defaults: {
    units: [],
    selectedUnitId: null,
    loading: false,
    error: null
  }
})
@Injectable()
export class UnitsState {
  constructor(
    private unitsService: UnitsService,
    private accountingService: AccountingService
  ) {}

  @Selector()
  static units(state: UnitsStateModel): Unit[] {
    return state.units;
  }

  @Selector()
  static loading(state: UnitsStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static error(state: UnitsStateModel): string | null {
    return state.error;
  }

  @Selector()
  static selectedUnit(state: UnitsStateModel): Unit | null {
    if (!state.selectedUnitId) return null;
    return state.units.find(u => u.id === state.selectedUnitId) || null;
  }

  @Selector()
  static availableUnits(state: UnitsStateModel): Unit[] {
    return state.units.filter(u => u.status === 'Available');
  }

  @Action(UnitsActions.LoadUnits)
  loadUnits(ctx: StateContext<UnitsStateModel>) {
    ctx.patchState({ loading: true, error: null });

    return this.unitsService.getAll().pipe(
      tap(units => {
        ctx.patchState({ units, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of([]);
      })
    );
  }

  @Action(UnitsActions.CreateUnit)
  createUnit(ctx: StateContext<UnitsStateModel>, action: UnitsActions.CreateUnit) {
    ctx.patchState({ loading: true, error: null });

    return this.unitsService.create(action.payload).pipe(
      switchMap(unit => {
        // Auto-create accounting account for unit (revenue tracking)
        return this.accountingService.createUnitAccount(unit).pipe(
          tap(() => {
            const state = ctx.getState();
            ctx.patchState({
              units: [...state.units, unit],
              loading: false
            });
          })
        );
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(UnitsActions.UpdateUnit)
  updateUnit(ctx: StateContext<UnitsStateModel>, action: UnitsActions.UpdateUnit) {
    ctx.patchState({ loading: true, error: null });

    return this.unitsService.update(action.id, action.payload).pipe(
      tap(updatedUnit => {
        if (updatedUnit) {
          const state = ctx.getState();
          const units = state.units.map(u =>
            u.id === action.id ? updatedUnit : u
          );
          ctx.patchState({ units, loading: false });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(UnitsActions.DeleteUnit)
  deleteUnit(ctx: StateContext<UnitsStateModel>, action: UnitsActions.DeleteUnit) {
    ctx.patchState({ loading: true, error: null });

    return this.unitsService.delete(action.id).pipe(
      tap(() => {
        const state = ctx.getState();
        const units = state.units.filter(u => u.id !== action.id);
        ctx.patchState({ units, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(false);
      })
    );
  }

  @Action(UnitsActions.SelectUnit)
  selectUnit(ctx: StateContext<UnitsStateModel>, action: UnitsActions.SelectUnit) {
    ctx.patchState({ selectedUnitId: action.id });
  }
}
