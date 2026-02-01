import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { tap } from 'rxjs/operators';
import { Building } from '../domain/models/building.model';
import { BuildingsService } from '../application/services/buildings.service';

// Actions
export class LoadBuildings {
  static readonly type = '[Buildings] Load';
}

export class CreateBuilding {
  static readonly type = '[Buildings] Create';
  constructor(public payload: any) {}
}

export class UpdateBuilding {
  static readonly type = '[Buildings] Update';
  constructor(public payload: any) {}
}

export class DeleteBuilding {
  static readonly type = '[Buildings] Delete';
  constructor(public id: string) {}
}

// State Model
export interface BuildingsStateModel {
  buildings: Building[];
  loading: boolean;
  error: string | null;
}

// State
@State<BuildingsStateModel>({
  name: 'buildings',
  defaults: {
    buildings: [],
    loading: false,
    error: null
  }
})
@Injectable()
export class BuildingsState {
  private buildingsService = inject(BuildingsService);

  @Selector()
  static buildings(state: BuildingsStateModel): Building[] {
    return state.buildings;
  }

  @Selector()
  static loading(state: BuildingsStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static error(state: BuildingsStateModel): string | null {
    return state.error;
  }

  @Action(LoadBuildings)
  loadBuildings(ctx: StateContext<BuildingsStateModel>) {
    ctx.patchState({ loading: true, error: null });

    return this.buildingsService.getAll().pipe(
      tap({
        next: (buildings) => {
          ctx.patchState({
            buildings,
            loading: false
          });
        },
        error: (error) => {
          ctx.patchState({
            loading: false,
            error: error.message
          });
        }
      })
    );
  }

  @Action(CreateBuilding)
  createBuilding(ctx: StateContext<BuildingsStateModel>, action: CreateBuilding) {
    ctx.patchState({ loading: true, error: null });

    return this.buildingsService.create(action.payload).pipe(
      tap({
        next: (building) => {
          const state = ctx.getState();
          ctx.patchState({
            buildings: [...state.buildings, building],
            loading: false
          });
        },
        error: (error) => {
          ctx.patchState({
            loading: false,
            error: error.message
          });
        }
      })
    );
  }

  @Action(UpdateBuilding)
  updateBuilding(ctx: StateContext<BuildingsStateModel>, action: UpdateBuilding) {
    ctx.patchState({ loading: true, error: null });

    return this.buildingsService.update(action.payload).pipe(
      tap({
        next: (building) => {
          const state = ctx.getState();
          const buildings = state.buildings.map(b =>
            b.id === building.id ? building : b
          );
          ctx.patchState({
            buildings,
            loading: false
          });
        },
        error: (error) => {
          ctx.patchState({
            loading: false,
            error: error.message
          });
        }
      })
    );
  }

  @Action(DeleteBuilding)
  deleteBuilding(ctx: StateContext<BuildingsStateModel>, action: DeleteBuilding) {
    ctx.patchState({ loading: true, error: null });

    return this.buildingsService.delete(action.id).pipe(
      tap({
        next: () => {
          const state = ctx.getState();
          ctx.patchState({
            buildings: state.buildings.filter(b => b.id !== action.id),
            loading: false
          });
        },
        error: (error) => {
          ctx.patchState({
            loading: false,
            error: error.message
          });
        }
      })
    );
  }
}
