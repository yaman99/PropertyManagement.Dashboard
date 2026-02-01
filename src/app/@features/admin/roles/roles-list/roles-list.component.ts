import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../../@shared/components/page-header/page-header.component';
import { Role, UserRole, Permission } from '../../../../@core/domain/models/auth.model';
import { HasPermissionDirective } from '../../../../@shared/directives/has-permission.directive';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    HasPermissionDirective
  ],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.scss']
})
export class RolesListComponent implements OnInit {
  Permission = Permission;

  roles: Role[] = [];

  private readonly STORAGE_KEY = 'system_roles';

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.roles = JSON.parse(stored);
    } else {
      // Initialize default roles
      this.roles = this.getDefaultRoles();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.roles));
    }
  }

  getDefaultRoles(): Role[] {
    return [
      {
        id: 'role-admin',
        name: 'Admin',
        description: 'مدير النظام - صلاحيات كاملة',
        permissions: Object.values(Permission)
      },
      {
        id: 'role-accountant',
        name: 'Accountant',
        description: 'المحاسب - إدارة الحسابات والعقود',
        permissions: [
          Permission.DASHBOARD_READ,
          Permission.OWNERS_READ,
          Permission.UNITS_READ,
          Permission.RENTERS_READ,
          Permission.LEASES_READ,
          Permission.LEASES_WRITE,
          Permission.REQUESTS_READ,
          Permission.ACCOUNTING_READ,
          Permission.ACCOUNTING_WRITE
        ]
      },
      {
        id: 'role-owner',
        name: 'Owner',
        description: 'المالك - عرض الوحدات والعقود الخاصة به',
        permissions: [
          Permission.DASHBOARD_READ,
          Permission.UNITS_READ,
          Permission.LEASES_READ,
          Permission.REQUESTS_READ,
          Permission.REQUESTS_WRITE,
          Permission.ACCOUNTING_READ
        ]
      },
      {
        id: 'role-renter',
        name: 'Renter',
        description: 'المستأجر - عرض العقد وتقديم الطلبات',
        permissions: [
          Permission.DASHBOARD_READ,
          Permission.LEASES_READ,
          Permission.REQUESTS_READ,
          Permission.REQUESTS_WRITE
        ]
      }
    ];
  }

  getRoleIcon(role: UserRole): string {
    const icons: Record<UserRole, string> = {
      'Admin': '👑',
      'Accountant': '💼',
      'Owner': '🏠',
      'Renter': '🔑'
    };
    return icons[role] || '👤';
  }

  getRoleNameArabic(role: UserRole): string {
    const names: Record<UserRole, string> = {
      'Admin': 'مدير النظام',
      'Accountant': 'محاسب',
      'Owner': 'مالك',
      'Renter': 'مستأجر'
    };
    return names[role] || role;
  }

  getPermissionCount(role: Role): number {
    return role.permissions.length;
  }

  getTotalPermissions(): number {
    return Object.values(Permission).length;
  }
}
