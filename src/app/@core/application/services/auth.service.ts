import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { User, LoginDto, LoginResponse, Role, Session, Permission } from '../../domain/models';
import { AuthRepository } from '../../data-access/interfaces';
import { AuthLocalStorageRepository } from '../../data-access/local-storage';

/**
 * Auth Application Service
 * Handles authentication and authorization
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private repository: AuthRepository = inject(AuthLocalStorageRepository);

  login(dto: LoginDto): Observable<LoginResponse> {
    return this.repository.login(dto).pipe(
      switchMap(response => {
        // Save session
        const session: Session = {
          user: response.user,
          token: response.token,
          expiresAt: response.expiresAt
        };
        return this.repository.saveSession(session).pipe(
          map(() => response)
        );
      })
    );
  }

  logout(): Observable<void> {
    return this.repository.clearSession();
  }

  getCurrentSession(): Observable<Session | null> {
    return this.repository.getCurrentSession();
  }

  getCurrentUser(): Observable<User | null> {
    return this.getCurrentSession().pipe(
      map(session => session?.user || null)
    );
  }

  isAuthenticated(): Observable<boolean> {
    return this.getCurrentSession().pipe(
      map(session => session !== null)
    );
  }

  hasPermission(permission: Permission): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map(user => user?.permissions.includes(permission) || false)
    );
  }

  hasAnyPermission(permissions: Permission[]): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map(user => {
        if (!user) return false;
        return permissions.some(p => user.permissions.includes(p));
      })
    );
  }

  hasAllPermissions(permissions: Permission[]): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map(user => {
        if (!user) return false;
        return permissions.every(p => user.permissions.includes(p));
      })
    );
  }

  // User Management
  getAllUsers(): Observable<User[]> {
    return this.repository.getAllUsers();
  }

  getUserById(id: string): Observable<User | undefined> {
    return this.repository.getUserById(id);
  }

  createUser(user: Partial<User>): Observable<User> {
    return this.repository.createUser(user);
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    return this.repository.updateUser(id, updates);
  }

  // Role Management
  getAllRoles(): Observable<Role[]> {
    return this.repository.getAllRoles();
  }

  updateRole(id: string, role: Partial<Role>): Observable<Role> {
    return this.repository.updateRole(id, role);
  }
}
