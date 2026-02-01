import { Observable } from 'rxjs';
import { User, LoginDto, LoginResponse, Role, Session } from '../../domain/models';

export interface AuthRepository {
  login(dto: LoginDto): Observable<LoginResponse>;
  logout(): Observable<void>;
  getCurrentSession(): Observable<Session | null>;
  saveSession(session: Session): Observable<void>;
  clearSession(): Observable<void>;

  // User Management
  getAllUsers(): Observable<User[]>;
  getUserById(id: string): Observable<User | undefined>;
  createUser(user: Partial<User>): Observable<User>;
  updateUser(id: string, updates: Partial<User>): Observable<User>;

  // Role Management
  getAllRoles(): Observable<Role[]>;
  updateRole(id: string, role: Partial<Role>): Observable<Role>;
}
