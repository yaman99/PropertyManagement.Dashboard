import { Injectable } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { Owner } from '../domain/models/owner.model';
import { OwnersService } from '../application/services/owners.service';
import { AccountingService } from '../application/services/accounting.service';

// Actions
export namespace OwnersActions {
  export class LoadOwners {
    static readonly type = '[Owners] Load Owners';
  }

  export class CreateOwner {
    static readonly type = '[Owners] Create Owner';
    constructor(public payload: Owner) {}
  }

  export class UpdateOwner {
    static readonly type = '[Owners] Update Owner';
    constructor(public id: string, public payload: Partial<Owner>) {}
  }

  export class DeleteOwner {
    static readonly type = '[Owners] Delete Owner';
    constructor(public id: string) {}
  }

  export class SelectOwner {
    static readonly type = '[Owners] Select Owner';
    constructor(public id: string | null) {}
  }
}

// State Model
export interface OwnersStateModel {
  owners: Owner[];
  selectedOwnerId: string | null;
  loading: boolean;
  error: string | null;
}

// State
@State<OwnersStateModel>({
  name: 'owners',
  defaults: {
    owners: [],
    selectedOwnerId: null,
    loading: false,
    error: null
  }
})
@Injectable()
export class OwnersState {
  constructor(
    private ownersService: OwnersService,
    private accountingService: AccountingService
  ) {}

  @Selector()
  static owners(state: OwnersStateModel): Owner[] {
    return state.owners;
  }

  @Selector()
  static loading(state: OwnersStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static error(state: OwnersStateModel): string | null {
    return state.error;
  }

  @Selector()
  static selectedOwner(state: OwnersStateModel): Owner | null {
    if (!state.selectedOwnerId) return null;
    return state.owners.find(o => o.id === state.selectedOwnerId) || null;
  }

  @Action(OwnersActions.LoadOwners)
  loadOwners(ctx: StateContext<OwnersStateModel>) {
    ctx.patchState({ loading: true, error: null });

    return this.ownersService.getAll().pipe(
      tap(owners => {
        ctx.patchState({ owners, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of([]);
      })
    );
  }

  @Action(OwnersActions.CreateOwner)
  createOwner(ctx: StateContext<OwnersStateModel>, action: OwnersActions.CreateOwner) {
    ctx.patchState({ loading: true, error: null });

    return this.ownersService.create(action.payload).pipe(
      switchMap(owner => {
        // Auto-create accounting account for owner
        return this.accountingService.createOwnerAccount(owner).pipe(
          tap(() => {
            const state = ctx.getState();
            ctx.patchState({
              owners: [...state.owners, owner],
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

  @Action(OwnersActions.UpdateOwner)
  updateOwner(ctx: StateContext<OwnersStateModel>, action: OwnersActions.UpdateOwner) {
    ctx.patchState({ loading: true, error: null });

    return this.ownersService.update(action.id, action.payload).pipe(
      tap(updatedOwner => {
        if (updatedOwner) {
          const state = ctx.getState();
          const owners = state.owners.map(o =>
            o.id === action.id ? updatedOwner : o
          );
          ctx.patchState({ owners, loading: false });
        }
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(null);
      })
    );
  }

  @Action(OwnersActions.DeleteOwner)
  deleteOwner(ctx: StateContext<OwnersStateModel>, action: OwnersActions.DeleteOwner) {
    ctx.patchState({ loading: true, error: null });

    return this.ownersService.delete(action.id).pipe(
      tap(() => {
        const state = ctx.getState();
        const owners = state.owners.filter(o => o.id !== action.id);
        ctx.patchState({ owners, loading: false });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return of(false);
      })
    );
  }

  @Action(OwnersActions.SelectOwner)
  selectOwner(ctx: StateContext<OwnersStateModel>, action: OwnersActions.SelectOwner) {
    ctx.patchState({ selectedOwnerId: action.id });
  }
}
