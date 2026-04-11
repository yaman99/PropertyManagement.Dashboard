# MarbaeDemo - Omar Almarbie Real Estate Management System

## What Is This Project

A comprehensive **property management system** built as an Angular 21 application for a customer (Omar Almarbie). The app manages real estate properties, buildings, owners, renters, leases, accounting, and maintenance requests.

**Current phase:** UI/UX development — building the frontend for customer approval. Backend integration comes later. Data is stored in LocalStorage via a repository pattern that allows easy swap to HTTP APIs.

## Tech Stack

- **Angular 21** (standalone components, lazy loading)
- **NGXS** for state management (7 states: Auth, Owners, Units, Renters, Leases, Buildings, Inquiries)
- **Bootstrap 5.3** with RTL support
- **SCSS** with custom theme (brand color: `#BC8545` warm gold)
- **SweetAlert2** for alerts/toasts
- **Vitest** for testing
- **Fonts:** Tajawal, Cairo (Arabic support)

## Architecture

Clean architecture with 4 layers:

```
@core/domain/models/       → 8 domain models (Owner, Unit, Building, Renter, Lease, Request, Accounting, Auth)
@core/data-access/         → Repository interfaces + LocalStorage implementations
@core/application/services → 10 business logic services
@core/state/               → NGXS state management (actions, selectors)
@features/                 → Feature modules (lazy loaded)
@shared/                   → Reusable components, directives, services
```

## Key Patterns

- **Repository pattern:** All data access goes through interfaces in `@core/data-access/interfaces/`. Current implementations use LocalStorage (`@core/data-access/local-storage/`). Swap to HTTP later without touching components or services.
- **Standalone components:** No NgModules — everything is standalone with `imports` in component decorators.
- **Lazy loading:** Routes use `loadChildren()` and `loadComponent()` for code splitting.
- **RTL-first:** Direction is RTL, text-align right, Arabic fonts. All UI must respect RTL layout.
- **Permission-based access:** 13 permission types, `authGuard` and `permissionGuard` protect routes.

## Project Structure

```
src/app/
├── @core/
│   ├── application/services/    # AuthService, OwnersService, UnitsService, etc.
│   ├── data-access/
│   │   ├── interfaces/          # Repository contracts (8 interfaces)
│   │   └── local-storage/       # LocalStorage implementations (8 repos)
│   ├── domain/models/           # Domain models, enums, DTOs
│   ├── guards/                  # authGuard, permissionGuard
│   └── state/                   # NGXS states (7 state files)
├── @features/
│   ├── accounting/              # Ledger accounts, entries, statements
│   ├── admin/                   # Roles & settings
│   ├── buildings/               # Building CRUD
│   ├── dashboard/               # Main dashboard with KPIs
│   ├── inquiries/               # Customer inquiry management
│   ├── leases/                  # Lease management with wizard
│   ├── login/                   # Authentication UI
│   ├── owners/                  # Owner CRUD
│   ├── public/                  # Public unit listing & detail pages
│   ├── renters/                 # Renter CRUD
│   ├── requests/                # Maintenance requests/complaints
│   ├── shell/                   # Main layout (sidebar + topbar)
│   └── units/                   # Unit/property CRUD
├── @shared/
│   ├── components/              # empty-state, page-header, status-badge
│   ├── directives/
│   └── services/                # AlertService (SweetAlert2 wrapper)
├── app.routes.ts                # Route definitions
├── app.config.ts                # Providers, NGXS setup, DI bindings
└── app.ts                       # Root component
```

## Routes

| Path | Component | Auth |
|------|-----------|------|
| `/` | Redirects to `/units` | No |
| `/units` | Public unit listing | No |
| `/units/:id` | Public unit detail + inquiry | No |
| `/login` | Login page | No |
| `/app/dashboard` | Dashboard | Yes |
| `/app/owners/**` | Owner management | Yes |
| `/app/buildings/**` | Building management | Yes |
| `/app/units/**` | Unit management | Yes |
| `/app/renters/**` | Renter management | Yes |
| `/app/leases/**` | Lease management | Yes |
| `/app/requests/**` | Request management | Yes |
| `/app/inquiries/**` | Inquiry management | Yes |
| `/app/accounting/**` | Accounting module | Yes |
| `/app/admin/roles/**` | Role management | Yes |
| `/app/admin/settings` | Settings | Yes |

## Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin | Admin (all permissions) |
| accountant | accountant | Accountant |
| owner1 | owner1 | Owner |
| renter1 | renter1 | Renter |

## Commands

```bash
npm start          # Dev server
npm run build      # Production build
npm test           # Run tests (Vitest)
npm run watch      # Dev build with watch
```

## Implementation Status

- **Phase 1 (DONE):** Foundation — architecture, models, services, state, auth, guards, shell layout, login, dashboard skeleton, public pages, theme/branding
- **Phase 2 (IN PROGRESS):** CRUD modules — building out list/form/detail views for each feature module

## Conventions

- All labels, text, and UI are in **Arabic**
- Brand color `#BC8545` — use CSS variables from `theme.scss`
- LocalStorage keys prefixed with `re.` (e.g., `re.owners`, `re.units`)
- Services injected via `inject()` function, not constructor injection
- Forms use `ReactiveFormsModule`
- State actions follow pattern: `Load{Entity}`, `Add{Entity}`, `Update{Entity}`, `Delete{Entity}`, `Select{Entity}`
