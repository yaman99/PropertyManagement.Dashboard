import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { tap, catchError } from 'rxjs/operators';
import { User, Session, Permission } from '../domain/models';
import { AuthService } from '../application/services';
import { throwError } from 'rxjs';

// Actions
export namespace AuthActions {
  export class Login {
    static readonly type = '[Auth] Login';
    constructor(public username: string, public password: string) {}
  }

  export class Logout {
    static readonly type = '[Auth] Logout';
  }

  export class CheckSession {
    static readonly type = '[Auth] Check Session';
  }

  export class ClearError {
    static readonly type = '[Auth] Clear Error';
  }
}

// State Model
export interface AuthStateModel {
  user: User | null;
  token: string | null;
  expiresAt: Date | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// State
@State<AuthStateModel>({
  name: 'auth',
  defaults: {
    user: null,
    token: null,
    expiresAt: null,
    isAuthenticated: false,
    loading: false,
    error: null
  }
})
@Injectable()
export class AuthState {
  private authService = inject(AuthService);

  // Selectors
  @Selector()
  static user(state: AuthStateModel): User | null {
    return state.user;
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return state.isAuthenticated;
  }

  @Selector()
  static loading(state: AuthStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static error(state: AuthStateModel): string | null {
    return state.error;
  }

  @Selector()
  static hasPermission(state: AuthStateModel) {
    return (permission: Permission) => {
      return state.user?.permissions.includes(permission) || false;
    };
  }

  @Selector()
  static userRole(state: AuthStateModel): string | null {
    return state.user?.role || null;
  }

  // Actions
  @Action(AuthActions.Login)
  login(ctx: StateContext<AuthStateModel>, action: AuthActions.Login) {
    ctx.patchState({ loading: true, error: null });

    return this.authService.login({
      username: action.username,
      password: action.password
    }).pipe(
      tap(response => {
        ctx.patchState({
          user: response.user,
          token: response.token,
          expiresAt: response.expiresAt,
          isAuthenticated: true,
          loading: false,
          error: null
        });
      }),
      catchError(error => {
        ctx.patchState({
          loading: false,
          error: error.message || 'فشل تسجيل الدخول'
        });
        return throwError(() => error);
      })
    );
  }

  @Action(AuthActions.Logout)
  logout(ctx: StateContext<AuthStateModel>) {
    return this.authService.logout().pipe(
      tap(() => {
        ctx.setState({
          user: null,
          token: null,
          expiresAt: null,
          isAuthenticated: false,
          loading: false,
          error: null
        });
      })
    );
  }

  @Action(AuthActions.CheckSession)
  checkSession(ctx: StateContext<AuthStateModel>) {
    return this.authService.getCurrentSession().pipe(
      tap(session => {
        if (session) {
          ctx.patchState({
            user: session.user,
            token: session.token,
            expiresAt: session.expiresAt,
            isAuthenticated: true
          });
        } else {
          ctx.patchState({
            isAuthenticated: false
          });
        }
      })
    );
  }

  @Action(AuthActions.ClearError)
  clearError(ctx: StateContext<AuthStateModel>) {
    ctx.patchState({ error: null });
  }
}
