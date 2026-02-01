# Omar Almarbie Real Estate - Property Management System

## Project Overview

This is a **demo Real Estate / Property Management web application** built with Angular 21, featuring:

- ✅ RTL (Right-to-Left) layout for Arabic interface
- ✅ Modern, responsive design with Bootstrap 5
- ✅ Brand color palette with custom theming
- ✅ NGXS state management
- ✅ LocalStorage data layer (architected for easy migration to .NET Web API)
- ✅ SweetAlert2 for all alerts and confirmations
- ✅ Role-based access control with permissions
- ✅ Comprehensive business logic for real estate management

---

## 🏗️ Architecture

### Folder Structure

```
src/app/
├── @core/                    # Core business logic and infrastructure
│   ├── domain/
│   │   └── models/          # Domain entities and interfaces
│   ├── data-access/
│   │   ├── interfaces/      # Repository interfaces
│   │   └── local-storage/   # LocalStorage implementations
│   ├── application/
│   │   └── services/        # Business logic services
│   ├── state/               # NGXS state management
│   └── guards/              # Auth and permission guards
│
├── @shared/                  # Shared components, directives, services
│   ├── services/
│   │   └── alert.service.ts # SweetAlert2 wrapper
│   ├── components/          # Reusable UI components
│   └── directives/          # Custom directives
│
├── @features/               # Feature modules (NgModules)
│   ├── login/              # Login page (standalone)
│   ├── shell/              # Main layout shell
│   ├── dashboard/          # Dashboard
│   ├── owners/             # Owners management (TODO)
│   ├── units/              # Units management (TODO)
│   ├── renters/            # Renters management (TODO)
│   ├── leases/             # Lease agreements (TODO)
│   ├── requests/           # Complaints/Requests (TODO)
│   └── accounting/         # Accounting module (TODO)
│
├── app.config.ts           # Application configuration
├── app.routes.ts           # Route definitions
└── app.ts                  # Root component
```

---

## 🎨 Branding & Theme

### Color Palette

**Primary Brand Colors:**
```scss
--brand-primary-100: #F4B77F
--brand-primary-200: #EAAD6C
--brand-primary-300: #D8A15F
--brand-primary-400: #BC8545  // Main brand color
--brand-primary-500: #AA783D
--brand-primary-600: #976B37
--brand-primary-700: #855D30
```

**Surface Colors:**
```scss
--surface-white: #FFFFFF
--surface-100: #FFF9F0    // Page background
--surface-200: #FFF3E3    // Card background
--surface-300: #FFF0D9
--surface-400: #FFE6C0
```

### Typography

- **Preferred font:** "Mirsal" (paid, not included)
- **Fallback fonts:** "Tajawal", "Cairo", system-ui
- Font is applied globally via CSS variables

### Logo

- Path: `/assets/branding/logo.svg`
- ⚠️ **Placeholder only** - You need to provide the actual logo file
- Rules: No shadows, no stretching, use brand colors only

---

## 🔐 Authentication & Authorization

### Demo Accounts

| Role | Username | Password | Permissions |
|------|----------|----------|-------------|
| Admin | `admin` | `admin` | All permissions |
| Accountant | `accountant` | `accountant` | Accounting, view-only for others |
| Owner | `owner1` | `owner1` | View units, leases, requests |
| Renter | `renter1` | `renter1` | View own lease, create requests |

### Permission System

Permissions are enum-based:
- `OWNERS.READ`, `OWNERS.WRITE`
- `UNITS.READ`, `UNITS.WRITE`
- `RENTERS.READ`, `RENTERS.WRITE`
- `LEASES.READ`, `LEASES.WRITE`
- `REQUESTS.READ`, `REQUESTS.WRITE`
- `ACCOUNTING.READ`, `ACCOUNTING.WRITE`
- `USERS.MANAGE`, `ROLES.MANAGE`
- `DASHBOARD.READ`

Guards:
- **authGuard**: Protects routes that require login
- **permissionGuard**: Protects routes based on specific permissions

---

## 💾 Data Layer Architecture

### Repository Pattern

All data access goes through **repository interfaces**:

```typescript
// Interface (abstraction)
export interface OwnersRepository {
  getAll(): Observable<Owner[]>;
  getById(id: string): Observable<Owner | undefined>;
  create(dto: CreateOwnerDto): Observable<Owner>;
  update(id: string, dto: UpdateOwnerDto): Observable<Owner>;
  delete(id: string): Observable<void>;
}

// LocalStorage implementation
@Injectable()
export class OwnersLocalStorageRepository implements OwnersRepository {
  // Implementation using LocalStorage
}

// Future: HTTP implementation
@Injectable()
export class OwnersHttpRepository implements OwnersRepository {
  // Implementation using HttpClient
}
```

### Migration Path: LocalStorage → .NET Web API

**Current State:**
- All repositories use `LocalStorage`
- Data keys: `re.owners`, `re.units`, `re.renters`, etc.
- Storage versioning: `re.storageVersion = 1`

**To Switch to API:**
1. Create HTTP repository implementations
2. Update service injection in `app.config.ts` to use HTTP repos
3. **No changes needed** in components or business logic!

Example:
```typescript
// Before (LocalStorage)
providers: [
  { provide: OwnersRepository, useClass: OwnersLocalStorageRepository }
]

// After (HTTP)
providers: [
  { provide: OwnersRepository, useClass: OwnersHttpRepository }
]
```

---

## 📦 Domain Models

### Owner
- Personal info (name, phone, email, national ID)
- Status: Active | Inactive | Suspended
- Optional login account with temp password
- Linked to units

### Unit
- Property details (code, building, type, rooms, floor, area)
- Rent price
- Status: Available | Rented | Maintenance | Reserved
- Auto-generated ledger account
- Linked to owner

### Renter
- Personal info (name, phone, email, national ID, nationality)
- Status: Active | Inactive | Blacklisted
- Optional login account
- Linked to leases

### Lease
- Agreement between owner, renter, and unit
- Start/end dates, payment cycle (Monthly/Quarterly/Yearly)
- Auto-generated payment schedule
- Status: Draft | Active | Expired | Cancelled
- Business rule: One active lease per unit

### Request/Complaint
- Created by Admin, Owner, or Renter
- Category, priority, status
- Photo uploads (base64 for demo)
- Comments/workflow

### Accounting
- Ledger accounts (hierarchical)
- Ledger entries (double-entry bookkeeping)
- Automatic account creation for owners, units, renters

---

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### First Run

1. Navigate to `http://localhost:4200`
2. You'll be redirected to the login page
3. Use one of the demo accounts (see Authentication section)
4. After login, you'll see the dashboard

---

## 🛠️ Development Roadmap

### ✅ Completed (Phase 1)
- [x] Project setup and dependencies
- [x] Theme and branding (RTL, Bootstrap 5)
- [x] Core architecture (models, repositories, services)
- [x] NGXS state management (Auth state)
- [x] AlertService (SweetAlert2 wrapper)
- [x] Login page with demo accounts
- [x] Shell layout with RTL sidebar
- [x] Dashboard skeleton
- [x] Auth guards and permission guards
- [x] LocalStorage repositories for all entities

### 🚧 TODO (Phase 2 - CRUD Modules)
- [ ] Owners Module (list, create/edit, account management)
- [ ] Units Module (list, create/edit, ledger integration)
- [ ] Renters Module (list, create/edit, account management)
- [ ] Leases Wizard (multi-step, payment schedule)
- [ ] Requests Module (photo upload, workflow)
- [ ] Accounting Module (chart of accounts, ledger views)
- [ ] Roles & Permissions admin UI
- [ ] Demo data seeding service

### 🔮 Future Enhancements
- [ ] .NET Web API backend
- [ ] Real-time notifications
- [ ] Advanced reporting and analytics
- [ ] File attachments (cloud storage)
- [ ] Email/SMS integration
- [ ] Mobile app (Ionic/React Native)

---

## 📝 Implementation Notes

### SweetAlert2 Usage

**Never call `Swal` directly!** Always use `AlertService`:

```typescript
// ✅ Correct
await this.alertService.toastSuccess('تم الحفظ بنجاح');
await this.alertService.toastError('حدث خطأ');
const confirmed = await this.alertService.confirm({
  title: 'تأكيد الحذف',
  text: 'هل أنت متأكد؟'
});

// ❌ Wrong
Swal.fire('Success', 'Saved!', 'success');
```

### Business Rules

1. **Unit cannot have multiple active leases**
   - Enforced in `LeasesService.create()`

2. **Activating a lease:**
   - Sets lease status to `Active`
   - Generates payment schedule
   - Updates unit status to `Rented`

3. **Ending/cancelling a lease:**
   - Updates lease status to `Expired` or `Cancelled`
   - Sets unit status back to `Available`

4. **Creating a unit:**
   - Automatically creates a ledger account
   - Links account ID to unit

### Payment Schedule Generation

The `LeasesService.generatePaymentSchedule()` creates payment items based on:
- Payment cycle (Monthly/Quarterly/Yearly)
- Start and end dates
- Due day of month
- Rent amount

---

## 🎯 Key Features Implemented

1. **RTL Layout:** Full right-to-left support with sidebar on the right
2. **Bootstrap 5 Integration:** Custom theme with brand colors
3. **NGXS State:** Centralized state management
4. **Repository Pattern:** Easy to swap LocalStorage with HTTP
5. **Alert System:** Consistent SweetAlert2 usage across the app
6. **Guards:** Authentication and permission-based route protection
7. **Typing:** Full TypeScript with strict typing
8. **Modular Architecture:** Clean separation of concerns

---

## 📄 License

This is a demo project for Omar Almarbie Real Estate. All rights reserved.

---

## 👥 Support

For questions or issues, please contact the development team.

---

**Built with ❤️ using Angular 21, Bootstrap 5, and NGXS**
