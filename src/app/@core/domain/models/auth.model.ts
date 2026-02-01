/**
 * Authentication and Authorization Models
 */

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];

  // Optional links to Owner/Renter
  ownerId?: string;
  renterId?: string;

  // Account Info
  isActive: boolean;
  lastLogin?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'Admin' | 'Accountant' | 'Owner' | 'Renter';

export enum Permission {
  // Owners
  OWNERS_READ = 'OWNERS.READ',
  OWNERS_WRITE = 'OWNERS.WRITE',

  // Units
  UNITS_READ = 'UNITS.READ',
  UNITS_WRITE = 'UNITS.WRITE',

  // Renters
  RENTERS_READ = 'RENTERS.READ',
  RENTERS_WRITE = 'RENTERS.WRITE',

  // Leases
  LEASES_READ = 'LEASES.READ',
  LEASES_WRITE = 'LEASES.WRITE',

  // Requests
  REQUESTS_READ = 'REQUESTS.READ',
  REQUESTS_WRITE = 'REQUESTS.WRITE',

  // Accounting
  ACCOUNTING_READ = 'ACCOUNTING.READ',
  ACCOUNTING_WRITE = 'ACCOUNTING.WRITE',

  // Users & Roles
  USERS_MANAGE = 'USERS.MANAGE',
  ROLES_MANAGE = 'ROLES.MANAGE',

  // Dashboard
  DASHBOARD_READ = 'DASHBOARD.READ'
}

export interface Role {
  id: string;
  name: UserRole;
  permissions: Permission[];
  description: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface Session {
  user: User;
  token: string;
  expiresAt: Date;
}
