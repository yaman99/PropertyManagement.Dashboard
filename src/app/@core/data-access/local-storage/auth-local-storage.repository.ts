import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { User, LoginDto, LoginResponse, Role, Session, Permission, UserRole } from '../../domain/models';
import { AuthRepository } from '../interfaces';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthLocalStorageRepository implements AuthRepository {
  private readonly USERS_KEY = 'users';
  private readonly ROLES_KEY = 'roles';
  private readonly SESSION_KEY = 'session';

  constructor(private storage: LocalStorageService) {
    this.initializeDefaultData();
  }

  private initializeDefaultData(): void {
    // Initialize default users if not exists
    const users = this.storage.getItem<User[]>(this.USERS_KEY);
    if (!users || users.length === 0) {
      this.seedDefaultUsers();
    }

    // Initialize default roles if not exists
    const roles = this.storage.getItem<Role[]>(this.ROLES_KEY);
    if (!roles || roles.length === 0) {
      this.seedDefaultRoles();
    }
  }

  private seedDefaultUsers(): void {
    const defaultUsers: User[] = [
      {
        id: 'USR001',
        username: 'admin',
        passwordHash: 'admin', // In production, this would be hashed
        role: 'Admin',
        permissions: Object.values(Permission),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'USR002',
        username: 'accountant',
        passwordHash: 'accountant',
        role: 'Accountant',
        permissions: [
          Permission.DASHBOARD_READ,
          Permission.OWNERS_READ,
          Permission.UNITS_READ,
          Permission.RENTERS_READ,
          Permission.LEASES_READ,
          Permission.ACCOUNTING_READ,
          Permission.ACCOUNTING_WRITE
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'USR003',
        username: 'owner1',
        passwordHash: 'owner1',
        role: 'Owner',
        permissions: [
          Permission.DASHBOARD_READ,
          Permission.UNITS_READ,
          Permission.LEASES_READ,
          Permission.REQUESTS_READ,
          Permission.REQUESTS_WRITE
        ],
        ownerId: 'DEMO_OWNER_1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'USR004',
        username: 'renter1',
        passwordHash: 'renter1',
        role: 'Renter',
        permissions: [
          Permission.REQUESTS_READ,
          Permission.REQUESTS_WRITE,
          Permission.LEASES_READ
        ],
        renterId: 'DEMO_RENTER_1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.storage.setItem(this.USERS_KEY, defaultUsers);
  }

  private seedDefaultRoles(): void {
    const defaultRoles: Role[] = [
      {
        id: 'ROLE001',
        name: 'Admin',
        permissions: Object.values(Permission),
        description: 'Full system access'
      },
      {
        id: 'ROLE002',
        name: 'Accountant',
        permissions: [
          Permission.DASHBOARD_READ,
          Permission.OWNERS_READ,
          Permission.UNITS_READ,
          Permission.RENTERS_READ,
          Permission.LEASES_READ,
          Permission.ACCOUNTING_READ,
          Permission.ACCOUNTING_WRITE
        ],
        description: 'Accounting and financial access'
      },
      {
        id: 'ROLE003',
        name: 'Owner',
        permissions: [
          Permission.DASHBOARD_READ,
          Permission.UNITS_READ,
          Permission.LEASES_READ,
          Permission.REQUESTS_READ,
          Permission.REQUESTS_WRITE
        ],
        description: 'Property owner access'
      },
      {
        id: 'ROLE004',
        name: 'Renter',
        permissions: [
          Permission.REQUESTS_READ,
          Permission.REQUESTS_WRITE,
          Permission.LEASES_READ
        ],
        description: 'Tenant access'
      }
    ];

    this.storage.setItem(this.ROLES_KEY, defaultRoles);
  }

  login(dto: LoginDto): Observable<LoginResponse> {
    const users = this.storage.getItem<User[]>(this.USERS_KEY) || [];
    const user = users.find(
      u => u.username === dto.username && u.passwordHash === dto.password && u.isActive
    );

    if (!user) {
      return throwError(() => new Error('بيانات الدخول غير صحيحة'));
    }

    // Update last login
    user.lastLogin = new Date();
    this.storage.setItem(this.USERS_KEY, users);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8); // 8 hours session

    const response: LoginResponse = {
      user,
      token: this.generateToken(),
      expiresAt
    };

    return of(response);
  }

  logout(): Observable<void> {
    this.storage.removeItem(this.SESSION_KEY);
    return of(void 0);
  }

  getCurrentSession(): Observable<Session | null> {
    const session = this.storage.getItem<Session>(this.SESSION_KEY);

    // Check if session is expired
    if (session && new Date(session.expiresAt) < new Date()) {
      this.storage.removeItem(this.SESSION_KEY);
      return of(null);
    }

    return of(session);
  }

  saveSession(session: Session): Observable<void> {
    this.storage.setItem(this.SESSION_KEY, session);
    return of(void 0);
  }

  clearSession(): Observable<void> {
    this.storage.removeItem(this.SESSION_KEY);
    return of(void 0);
  }

  // User Management
  getAllUsers(): Observable<User[]> {
    const users = this.storage.getItem<User[]>(this.USERS_KEY) || [];
    return of(users);
  }

  getUserById(id: string): Observable<User | undefined> {
    return this.getAllUsers().pipe(
      map(users => users.find(u => u.id === id))
    );
  }

  createUser(user: Partial<User>): Observable<User> {
    const users = this.storage.getItem<User[]>(this.USERS_KEY) || [];

    const newUser: User = {
      id: this.generateId(),
      username: user.username!,
      passwordHash: user.passwordHash || 'temp123',
      role: user.role!,
      permissions: user.permissions || [],
      isActive: user.isActive ?? true,
      ownerId: user.ownerId,
      renterId: user.renterId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.push(newUser);
    this.storage.setItem(this.USERS_KEY, users);
    return of(newUser);
  }

  updateUser(id: string, updates: Partial<User>): Observable<User> {
    const users = this.storage.getItem<User[]>(this.USERS_KEY) || [];
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
      throw new Error('User not found');
    }

    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date()
    };

    this.storage.setItem(this.USERS_KEY, users);
    return of(users[index]);
  }

  // Role Management
  getAllRoles(): Observable<Role[]> {
    const roles = this.storage.getItem<Role[]>(this.ROLES_KEY) || [];
    return of(roles);
  }

  updateRole(id: string, role: Partial<Role>): Observable<Role> {
    const roles = this.storage.getItem<Role[]>(this.ROLES_KEY) || [];
    const index = roles.findIndex(r => r.id === id);

    if (index === -1) {
      throw new Error('Role not found');
    }

    roles[index] = {
      ...roles[index],
      ...role
    };

    this.storage.setItem(this.ROLES_KEY, roles);
    return of(roles[index]);
  }

  private generateToken(): string {
    return btoa(`${Date.now()}.${Math.random()}`);
  }

  private generateId(): string {
    return `USR${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  }
}
