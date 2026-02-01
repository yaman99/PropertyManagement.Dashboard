# Omar Almarbie Real Estate - Quick Start Guide

## 🚀 Running the Application

### Start Development Server
```bash
npm start
```

The app will open at `http://localhost:4200`

### Login
You'll be redirected to the login page. Use one of these demo accounts:

| Role | Username | Password |
|------|----------|----------|
| 👤 **Admin** | admin | admin |
| 💼 **Accountant** | accountant | accountant |
| 🏠 **Owner** | owner1 | owner1 |
| 🔑 **Renter** | renter1 | renter1 |

### After Login
- You'll see the dashboard with placeholder KPI cards
- Navigate using the RTL sidebar on the right
- The sidebar includes placeholders for all modules

---

## 📦 What's Included

### ✅ Complete & Working
1. **Login System** - Full authentication with session persistence
2. **RTL Layout** - Arabic-friendly right-to-left interface
3. **Dashboard** - Skeleton with stat cards (ready for data)
4. **Navigation** - Sidebar with all module links
5. **Theme** - Brand colors, Bootstrap 5, custom styling
6. **State Management** - NGXS with Auth state
7. **Alerts** - SweetAlert2 integration for toasts and confirmations
8. **Guards** - Route protection with auth and permissions
9. **Architecture** - Repository pattern, services, models

### 📝 Ready to Implement (Phase 2)
- Owners CRUD module
- Units CRUD module
- Renters CRUD module
- Leases wizard module
- Requests/Complaints module
- Accounting module
- Admin modules

---

## 🗂️ Project Files Overview

### Core Architecture

**Domain Models** (`@core/domain/models/`)
- `owner.model.ts` - Owner entity and DTOs
- `unit.model.ts` - Unit/property entity
- `renter.model.ts` - Renter/tenant entity
- `lease.model.ts` - Lease agreement entity
- `request.model.ts` - Complaints/requests entity
- `accounting.model.ts` - Ledger accounts and entries
- `auth.model.ts` - Users, roles, permissions

**Repositories** (`@core/data-access/`)
- `interfaces/` - Repository interfaces (abstractions)
- `local-storage/` - LocalStorage implementations
  - Easy to swap with HTTP implementations later

**Services** (`@core/application/services/`)
- `auth.service.ts` - Authentication and authorization
- `owners.service.ts` - Owner business logic
- `units.service.ts` - Unit business logic
- `renters.service.ts` - Renter business logic
- `leases.service.ts` - Lease business logic
- `requests.service.ts` - Request/complaint business logic
- `accounting.service.ts` - Accounting and ledger logic

**State Management** (`@core/state/`)
- `auth.state.ts` - NGXS auth state with actions and selectors

**Guards** (`@core/guards/`)
- `auth.guard.ts` - Protect authenticated routes
- `permission.guard.ts` - Protect routes by permission

### Shared Resources

**Services** (`@shared/services/`)
- `alert.service.ts` - SweetAlert2 wrapper
  - `toastSuccess()`, `toastError()`, `toastWarn()`, `toastInfo()`
  - `confirm()` - confirmation dialogs
  - `showCredentialsModal()` - display username/password with copy

### Features

**Login** (`@features/login/`)
- Standalone component
- Form validation
- Demo account hints

**Shell** (`@features/shell/`)
- Main layout with RTL sidebar
- Top navigation bar
- User menu with logout
- Route outlet for child routes

**Dashboard** (`@features/dashboard/`)
- KPI cards skeleton
- Ready for integration with data

---

## 🎨 Theme & Branding

### Colors
- Primary: `#BC8545` (brand gold)
- Page background: `#FFF9F0` (warm cream)
- Card background: `#FFF3E3` (subtle cream)
- Text headings: `#855D30` (dark gold)

### Fonts
- Primary: Tajawal, Cairo (Arabic support)
- Fallback: system-ui

### Logo
- Location: `/assets/branding/logo.svg`
- Current: SVG placeholder
- Replace with actual logo file

---

## 💾 Data Storage

### Current: LocalStorage
All data is stored in browser LocalStorage with keys:
- `re.storageVersion` - Version control
- `re.owners` - Owners array
- `re.units` - Units array
- `re.renters` - Renters array
- `re.leases` - Leases array
- `re.requests` - Requests array
- `re.ledger.accounts` - Ledger accounts
- `re.ledger.entries` - Ledger entries
- `re.users` - Users array
- `re.roles` - Roles array
- `re.session` - Current session (persisted by NGXS)

### Future: .NET Web API
To switch from LocalStorage to HTTP:
1. Create HTTP repository implementations
2. Update dependency injection in `app.config.ts`
3. **No changes needed in components or business logic!**

---

## 🔐 Security & Permissions

### Permission Enum
```typescript
enum Permission {
  OWNERS_READ, OWNERS_WRITE,
  UNITS_READ, UNITS_WRITE,
  RENTERS_READ, RENTERS_WRITE,
  LEASES_READ, LEASES_WRITE,
  REQUESTS_READ, REQUESTS_WRITE,
  ACCOUNTING_READ, ACCOUNTING_WRITE,
  USERS_MANAGE, ROLES_MANAGE,
  DASHBOARD_READ
}
```

### Using Guards
```typescript
// Route with auth guard
{
  path: 'app',
  canActivate: [authGuard],
  children: [...]
}

// Route with permission guard
{
  path: 'admin',
  canActivate: [permissionGuard([Permission.USERS_MANAGE])],
  component: AdminComponent
}
```

---

## 🔧 Development Guidelines

### Always Use AlertService
```typescript
// ✅ Correct
this.alertService.toastSuccess('تم الحفظ');
const confirmed = await this.alertService.confirm({...});

// ❌ Wrong
Swal.fire('Success!');
alert('Saved!');
```

### Use Repository Pattern
```typescript
// ✅ Correct - Use services
this.ownersService.getAll().subscribe(...);

// ❌ Wrong - Don't access repos directly from components
this.ownersRepo.getAll().subscribe(...);
```

### NGXS State Management
```typescript
// Dispatch actions
this.store.dispatch(new OwnersActions.LoadOwners());

// Select data
this.owners$ = this.store.select(OwnersState.owners);

// Use in template
<div *ngFor="let owner of owners$ | async">
```

---

## 📊 Business Rules (Implemented in Services)

1. **Units:**
   - Cannot have multiple active leases
   - Auto-create ledger account on creation

2. **Leases:**
   - Activating a lease → unit status becomes "Rented"
   - Ending a lease → unit status becomes "Available"
   - Payment schedule auto-generated based on cycle

3. **Owners/Renters:**
   - Can have optional login accounts
   - Temp password generated on account creation

---

## 📝 Next Steps for Development

### Phase 2: Implement CRUD Modules

1. **Start with Owners Module:**
   - Create NGXS state (`owners.state.ts`)
   - Create list component
   - Create form component
   - Wire up with AlertService
   - Test create/edit/delete

2. **Add Shared Components:**
   - PageHeader component
   - StatusBadge component
   - EmptyState component
   - Permission directive (`*appHasPermission`)

3. **Continue with Other Modules:**
   - Units (similar to Owners)
   - Renters (similar to Owners)
   - Leases (wizard with multiple steps)
   - Requests (with photo upload)
   - Accounting (tree view + forms)

4. **Enhance Dashboard:**
   - Connect to NGXS states
   - Calculate real KPIs
   - Show recent activity

---

## 🐛 Troubleshooting

### Build Errors
If you see TypeScript errors:
```bash
npm run build
```
Check error messages and fix imports.

### Runtime Errors
Check browser console. Common issues:
- Missing NGXS state registration
- Incorrect import paths
- Missing providers

### Sass Warnings
The deprecation warnings about `@import` are non-critical. They'll be addressed in Dart Sass 3.0.

---

## 📚 Resources

- [Angular Documentation](https://angular.dev)
- [Bootstrap 5 RTL](https://getbootstrap.com/docs/5.0/getting-started/rtl/)
- [NGXS Documentation](https://www.ngxs.io)
- [SweetAlert2 Documentation](https://sweetalert2.github.io)

---

## 🎯 Current Status

✅ **Phase 1 Complete:**
- Core architecture
- Authentication & guards
- Theme & branding
- Login & dashboard
- Repository pattern
- State management foundation

📝 **Phase 2 In Progress:**
- CRUD modules implementation
- Shared components
- Enhanced dashboard
- Admin features

---

**Happy Coding! 🚀**

For questions or issues, refer to:
- `PROJECT_DOCUMENTATION.md` - Full technical documentation
- `IMPLEMENTATION_STATUS.md` - Detailed status and next steps
