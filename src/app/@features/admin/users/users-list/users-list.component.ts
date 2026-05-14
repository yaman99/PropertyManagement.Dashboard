import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { AuthService } from '../../../../@core/application/services/auth.service';
import { User, UserRole, Permission } from '../../../../@core/domain/models/auth.model';
import { Owner } from '../../../../@core/domain/models/owner.model';
import { Renter } from '../../../../@core/domain/models/renter.model';
import { OwnersState, OwnersActions } from '../../../../@core/state/owners.state';
import { RentersState, RentersActions } from '../../../../@core/state/renters.state';
import { PageHeaderComponent } from '../../../../@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../../@shared/services/alert.service';

interface UserWithStats extends User {
  linkedOwner?: Owner;
  linkedRenter?: Renter;
  managedOwnersCount: number;
  managedRentersCount: number;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
  users: UserWithStats[] = [];
  filteredUsers: UserWithStats[] = [];
  loading = true;

  searchTerm = '';
  roleFilter: UserRole | 'All' = 'All';

  roles: { value: UserRole | 'All'; label: string }[] = [
    { value: 'All', label: 'الكل' },
    { value: 'Admin', label: 'مدير النظام' },
    { value: 'Accountant', label: 'محاسب' },
    { value: 'Owner', label: 'مالك' },
    { value: 'Renter', label: 'مستأجر' },
    { value: 'Employee', label: 'موظف' }
  ];

  // ── Add User Modal ────────────────────────────────────────────────────────
  showAddModal = false;
  addingUser = false;
  newUsername = '';
  newPassword = '';
  newRole: UserRole = 'Employee';
  newOwnerId = '';
  newRenterId = '';

  // Available owners & renters for linking
  availableOwners: Owner[] = [];
  availableRenters: Renter[] = [];

  addUserRoles: { value: UserRole; label: string; icon: string }[] = [
    { value: 'Admin',      label: 'مدير النظام',   icon: '🔑' },
    { value: 'Accountant', label: 'محاسب',          icon: '💰' },
    { value: 'Employee',   label: 'موظف',           icon: '👷' },
    { value: 'Owner',      label: 'مالك',           icon: '🏠' },
    { value: 'Renter',     label: 'مستأجر',         icon: '🔒' }
  ];

  constructor(
    private authService: AuthService,
    private store: Store,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new RentersActions.LoadRenters());

    this.authService.getAllUsers().subscribe(users => {
      const owners = this.store.selectSnapshot(OwnersState.owners);
      const renters = this.store.selectSnapshot(RentersState.renters);

      this.availableOwners = owners;
      this.availableRenters = renters;

      this.users = users.map(user => {
        const linkedOwner = user.ownerId ? owners.find(o => o.id === user.ownerId) : undefined;
        const linkedRenter = user.renterId ? renters.find(r => r.id === user.renterId) : undefined;

        const managedOwnersCount = owners.filter(o =>
          (o as any).assignedUserId === user.id || o.id === user.ownerId
        ).length;

        const managedRentersCount = renters.filter(r =>
          (r as any).assignedUserId === user.id || r.id === user.renterId
        ).length;

        return { ...user, linkedOwner, linkedRenter, managedOwnersCount, managedRentersCount };
      });

      this.filteredUsers = [...this.users];
      this.loading = false;
    });
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  applyFilters() {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm ||
        user.username.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesRole = this.roleFilter === 'All' || user.role === this.roleFilter;
      return matchesSearch && matchesRole;
    });
  }

  clearFilters() {
    this.searchTerm = '';
    this.roleFilter = 'All';
    this.applyFilters();
  }

  // ── Add User Modal ────────────────────────────────────────────────────────

  openAddModal() {
    this.newUsername = '';
    this.newPassword = '';
    this.newRole = 'Employee';
    this.newOwnerId = '';
    this.newRenterId = '';
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  get isOwnerRole(): boolean { return this.newRole === 'Owner'; }
  get isRenterRole(): boolean { return this.newRole === 'Renter'; }

  getDefaultPermissionsForRole(role: UserRole): Permission[] {
    switch (role) {
      case 'Admin':
        return Object.values(Permission);
      case 'Accountant':
        return [
          Permission.DASHBOARD_READ, Permission.OWNERS_READ, Permission.UNITS_READ,
          Permission.RENTERS_READ, Permission.LEASES_READ,
          Permission.ACCOUNTING_READ, Permission.ACCOUNTING_WRITE
        ];
      case 'Owner':
        return [
          Permission.DASHBOARD_READ, Permission.UNITS_READ,
          Permission.LEASES_READ, Permission.REQUESTS_READ, Permission.REQUESTS_WRITE
        ];
      case 'Renter':
        return [
          Permission.REQUESTS_READ, Permission.REQUESTS_WRITE, Permission.LEASES_READ
        ];
      case 'Employee':
        return [
          Permission.DASHBOARD_READ, Permission.UNITS_READ, Permission.RENTERS_READ,
          Permission.LEASES_READ, Permission.REQUESTS_READ, Permission.REQUESTS_WRITE
        ];
      default:
        return [];
    }
  }

  async submitAddUser() {
    if (!this.newUsername.trim()) {
      this.alertService.toastWarn('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!this.newPassword.trim() || this.newPassword.length < 4) {
      this.alertService.toastWarn('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    // Check username uniqueness
    const exists = this.users.some(u => u.username.toLowerCase() === this.newUsername.trim().toLowerCase());
    if (exists) {
      this.alertService.toastError('اسم المستخدم مستخدم بالفعل');
      return;
    }

    this.addingUser = true;

    const newUser: Partial<User> = {
      username: this.newUsername.trim(),
      passwordHash: this.newPassword,
      role: this.newRole,
      permissions: this.getDefaultPermissionsForRole(this.newRole),
      isActive: true,
      ownerId: this.isOwnerRole && this.newOwnerId ? this.newOwnerId : undefined,
      renterId: this.isRenterRole && this.newRenterId ? this.newRenterId : undefined
    };

    this.authService.createUser(newUser).subscribe({
      next: (created) => {
        this.addingUser = false;
        this.showAddModal = false;
        this.alertService.toastSuccess(`تم إضافة المستخدم "${created.username}" بنجاح`);
        // Reload users list
        this.loading = true;
        this.ngOnInit();
      },
      error: (err) => {
        this.addingUser = false;
        this.alertService.toastError('فشل إضافة المستخدم: ' + err.message);
      }
    });
  }

  // ── Label Helpers ─────────────────────────────────────────────────────────

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      'Admin': 'مدير النظام',
      'Accountant': 'محاسب',
      'Owner': 'مالك',
      'Renter': 'مستأجر',
      'Employee': 'موظف'
    };
    return labels[role] || role;
  }

  getRoleBadgeClass(role: UserRole): string {
    const classes: Record<UserRole, string> = {
      'Admin': 'bg-danger',
      'Accountant': 'bg-info',
      'Owner': 'bg-brand',
      'Renter': 'bg-success',
      'Employee': 'bg-secondary'
    };
    return classes[role] || 'bg-secondary';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-SA');
  }

  // Stats summary
  get totalAdmins(): number { return this.users.filter(u => u.role === 'Admin').length; }
  get totalAccountants(): number { return this.users.filter(u => u.role === 'Accountant').length; }
  get totalOwnerUsers(): number { return this.users.filter(u => u.role === 'Owner').length; }
  get totalRenterUsers(): number { return this.users.filter(u => u.role === 'Renter').length; }
  get totalEmployees(): number { return this.users.filter(u => u.role === 'Employee').length; }
}
