import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { AuthService } from '../../../../@core/application/services/auth.service';
import { User, UserRole } from '../../../../@core/domain/models/auth.model';
import { Owner } from '../../../../@core/domain/models/owner.model';
import { Renter } from '../../../../@core/domain/models/renter.model';
import { OwnersState, OwnersActions } from '../../../../@core/state/owners.state';
import { RentersState, RentersActions } from '../../../../@core/state/renters.state';
import { PageHeaderComponent } from '../../../../@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../@shared/components/empty-state/empty-state.component';

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
    { value: 'Renter', label: 'مستأجر' }
  ];

  constructor(
    private authService: AuthService,
    private store: Store
  ) {}

  ngOnInit() {
    this.store.dispatch(new OwnersActions.LoadOwners());
    this.store.dispatch(new RentersActions.LoadRenters());

    this.authService.getAllUsers().subscribe(users => {
      const owners = this.store.selectSnapshot(OwnersState.owners);
      const renters = this.store.selectSnapshot(RentersState.renters);

      this.users = users.map(user => {
        const linkedOwner = user.ownerId ? owners.find(o => o.id === user.ownerId) : undefined;
        const linkedRenter = user.renterId ? renters.find(r => r.id === user.renterId) : undefined;

        // Count owners assigned to this user (assignedToUserId)
        const managedOwnersCount = owners.filter(o =>
          (o as any).assignedUserId === user.id || o.id === user.ownerId
        ).length;

        // Count renters assigned to this user
        const managedRentersCount = renters.filter(r =>
          (r as any).assignedUserId === user.id || r.id === user.renterId
        ).length;

        return { ...user, linkedOwner, linkedRenter, managedOwnersCount, managedRentersCount };
      });

      this.filteredUsers = [...this.users];
      this.loading = false;
    });
  }

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

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      'Admin': 'مدير النظام',
      'Accountant': 'محاسب',
      'Owner': 'مالك',
      'Renter': 'مستأجر'
    };
    return labels[role] || role;
  }

  getRoleBadgeClass(role: UserRole): string {
    const classes: Record<UserRole, string> = {
      'Admin': 'bg-danger',
      'Accountant': 'bg-info',
      'Owner': 'bg-brand',
      'Renter': 'bg-success'
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
}
