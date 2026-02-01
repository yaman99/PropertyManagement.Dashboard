import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../../@shared/components/page-header/page-header.component';
import { Role, UserRole, Permission } from '../../../../@core/domain/models/auth.model';
import { AlertService } from '../../../../@shared/services/alert.service';

interface PermissionGroup {
  name: string;
  icon: string;
  permissions: {
    key: Permission;
    label: string;
    type: 'read' | 'write' | 'manage';
  }[];
}

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent
  ],
  templateUrl: './role-permissions.component.html',
  styleUrls: ['./role-permissions.component.scss']
})
export class RolePermissionsComponent implements OnInit {
  role: Role | null = null;
  roleName: UserRole | null = null;

  permissionGroups: PermissionGroup[] = [
    {
      name: 'لوحة التحكم',
      icon: '📊',
      permissions: [
        { key: Permission.DASHBOARD_READ, label: 'عرض لوحة التحكم', type: 'read' }
      ]
    },
    {
      name: 'الملاك',
      icon: '👤',
      permissions: [
        { key: Permission.OWNERS_READ, label: 'عرض الملاك', type: 'read' },
        { key: Permission.OWNERS_WRITE, label: 'إدارة الملاك', type: 'write' }
      ]
    },
    {
      name: 'الوحدات',
      icon: '🏢',
      permissions: [
        { key: Permission.UNITS_READ, label: 'عرض الوحدات', type: 'read' },
        { key: Permission.UNITS_WRITE, label: 'إدارة الوحدات', type: 'write' }
      ]
    },
    {
      name: 'المستأجرين',
      icon: '🔑',
      permissions: [
        { key: Permission.RENTERS_READ, label: 'عرض المستأجرين', type: 'read' },
        { key: Permission.RENTERS_WRITE, label: 'إدارة المستأجرين', type: 'write' }
      ]
    },
    {
      name: 'العقود',
      icon: '📄',
      permissions: [
        { key: Permission.LEASES_READ, label: 'عرض العقود', type: 'read' },
        { key: Permission.LEASES_WRITE, label: 'إدارة العقود', type: 'write' }
      ]
    },
    {
      name: 'الطلبات',
      icon: '📋',
      permissions: [
        { key: Permission.REQUESTS_READ, label: 'عرض الطلبات', type: 'read' },
        { key: Permission.REQUESTS_WRITE, label: 'إدارة الطلبات', type: 'write' }
      ]
    },
    {
      name: 'الحسابات',
      icon: '💰',
      permissions: [
        { key: Permission.ACCOUNTING_READ, label: 'عرض الحسابات', type: 'read' },
        { key: Permission.ACCOUNTING_WRITE, label: 'إدارة الحسابات', type: 'write' }
      ]
    },
    {
      name: 'الإدارة',
      icon: '⚙️',
      permissions: [
        { key: Permission.USERS_MANAGE, label: 'إدارة المستخدمين', type: 'manage' },
        { key: Permission.ROLES_MANAGE, label: 'إدارة الأدوار', type: 'manage' }
      ]
    }
  ];

  private readonly STORAGE_KEY = 'system_roles';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    const roleParam = this.route.snapshot.paramMap.get('role') as UserRole;
    if (roleParam) {
      this.roleName = roleParam;
      this.loadRole(roleParam);
    }
  }

  loadRole(roleName: UserRole) {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const roles: Role[] = JSON.parse(stored);
      this.role = roles.find(r => r.name === roleName) || null;
    }
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

  hasPermission(permission: Permission): boolean {
    return this.role?.permissions.includes(permission) || false;
  }

  togglePermission(permission: Permission) {
    if (!this.role) return;

    const index = this.role.permissions.indexOf(permission);
    if (index > -1) {
      this.role.permissions.splice(index, 1);
    } else {
      this.role.permissions.push(permission);
    }
  }

  toggleGroupPermissions(group: PermissionGroup, enable: boolean) {
    if (!this.role) return;

    group.permissions.forEach(perm => {
      const index = this.role!.permissions.indexOf(perm.key);
      if (enable && index === -1) {
        this.role!.permissions.push(perm.key);
      } else if (!enable && index > -1) {
        this.role!.permissions.splice(index, 1);
      }
    });
  }

  isGroupFullyEnabled(group: PermissionGroup): boolean {
    return group.permissions.every(p => this.hasPermission(p.key));
  }

  isGroupPartiallyEnabled(group: PermissionGroup): boolean {
    const enabled = group.permissions.filter(p => this.hasPermission(p.key)).length;
    return enabled > 0 && enabled < group.permissions.length;
  }

  getPermissionTypeClass(type: 'read' | 'write' | 'manage'): string {
    const classes = {
      'read': 'bg-secondary',
      'write': 'bg-primary',
      'manage': 'bg-danger'
    };
    return classes[type];
  }

  saveChanges() {
    if (!this.role) return;

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const roles: Role[] = JSON.parse(stored);
      const index = roles.findIndex(r => r.name === this.role!.name);
      if (index > -1) {
        roles[index] = this.role;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(roles));
        this.alertService.toastSuccess('تم حفظ الصلاحيات بنجاح');
      }
    }
  }

  resetToDefault() {
    if (!this.role || !this.roleName) return;

    const defaults = this.getDefaultPermissions(this.roleName);
    this.role.permissions = [...defaults];
    this.alertService.toastSuccess('تم إعادة تعيين الصلاحيات للإعدادات الافتراضية');
  }

  getDefaultPermissions(role: UserRole): Permission[] {
    const defaults: Record<UserRole, Permission[]> = {
      'Admin': Object.values(Permission),
      'Accountant': [
        Permission.DASHBOARD_READ,
        Permission.OWNERS_READ,
        Permission.UNITS_READ,
        Permission.RENTERS_READ,
        Permission.LEASES_READ,
        Permission.LEASES_WRITE,
        Permission.REQUESTS_READ,
        Permission.ACCOUNTING_READ,
        Permission.ACCOUNTING_WRITE
      ],
      'Owner': [
        Permission.DASHBOARD_READ,
        Permission.UNITS_READ,
        Permission.LEASES_READ,
        Permission.REQUESTS_READ,
        Permission.REQUESTS_WRITE,
        Permission.ACCOUNTING_READ
      ],
      'Renter': [
        Permission.DASHBOARD_READ,
        Permission.LEASES_READ,
        Permission.REQUESTS_READ,
        Permission.REQUESTS_WRITE
      ]
    };
    return defaults[role] || [];
  }

  goBack() {
    this.router.navigate(['/app/admin/roles']);
  }
}
