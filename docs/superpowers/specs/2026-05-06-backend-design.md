# PropertyManagement Backend — Architecture Design Spec
**Date:** 2026-05-06  
**Project:** Omar Almarbie Real Estate Management System  
**Author:** Architecture Session  
**Status:** Awaiting User Review

---

## Overview

A .NET 10 ASP.NET Core Web API backend for the existing Angular 21 frontend (`PropertyManagement.Dashboard`). The frontend currently uses a LocalStorage repository layer designed as a clean interface — the backend swap is a drop-in replacement of repository implementations to HTTP calls.

**Key decisions:**
| Concern | Decision |
|---|---|
| Database | SQL Server 2022 |
| Auth | JWT + Refresh Tokens (ASP.NET Core Identity) |
| File Storage | Local disk / Docker volume mount |
| Deployment | Docker containers (self-hosted) |
| Real-time | None (polling) |
| Tenancy | Single tenant (one company) |
| Architecture | Modular Monolith — Vertical Feature Slices |

---

## Repository Structure

Three top-level Git repositories:

```
PropertyManagement.Dashboard/     ← Angular 21 frontend (existing)
PropertyManagement.Backend/       ← .NET 10 Web API (this spec)
PropertyManagement.DevOps/        ← Docker, Compose, CI/CD, scripts
```

---

## Section 1 — Solution Structure

### Projects (5 total)

```
PropertyManagement.Backend/
  PropertyManagement.sln

  src/
  ├── PropertyManagement.SharedKernel/
  │     Base types only. No business logic, no EF, no HTTP.
  │     Result<T>, Error, ICommand, IQuery, BaseEntity,
  │     AggregateRoot, ValueObject, PagedResult<T>
  │
  ├── PropertyManagement.Domain/
  │     All domain entities, value objects, domain events,
  │     and repository interfaces — organized by module folder.
  │     References: SharedKernel only.
  │
  ├── PropertyManagement.Application/
  │     All CQRS commands, queries, handlers, validators, DTOs.
  │     MediatR pipeline behaviors live here.
  │     Organized by module folder.
  │     References: SharedKernel, Domain.
  │
  ├── PropertyManagement.Infrastructure/
  │     EF Core DbContext, repository implementations,
  │     file storage, background jobs, email, Unit of Work.
  │     References: SharedKernel, Domain, Application.
  │
  └── PropertyManagement.Api/
        ASP.NET Core Web API host. Thin controllers only.
        Every request dispatched through MediatR.
        Global exception middleware, response wrapper,
        Swagger, Serilog, auth middleware.
        References: Application, Infrastructure (for DI only).

  tests/
  ├── PropertyManagement.Domain.Tests/
  ├── PropertyManagement.Application.Tests/
  └── PropertyManagement.Api.Tests/
```

### Dependency Rule (strictly enforced)
```
Api → Application → Domain → SharedKernel
         ↑
   Infrastructure (implements Domain interfaces, registered in Api via DI)
```
Infrastructure is the only project that touches SQL Server and the file system. The domain never knows EF Core exists.

---

## Section 2 — SharedKernel & Cross-Cutting Concerns

### Result Pattern
Every command and query returns `Result<T>` — never throws exceptions for expected failures.

```csharp
Result<T>
  ├── IsSuccess / IsFailure
  ├── Value (T)               // populated on success
  └── Error
        ├── Code              // machine-readable e.g. "Owner.NotFound"
        ├── Message           // human-readable (Arabic or English)
        └── Type              // NotFound | Validation | Conflict | Unauthorized | Failure
```

The API layer maps `Error.Type` → HTTP status automatically. Controllers never call `return NotFound()` manually.

### CQRS Contracts
```csharp
ICommand<TResult>                    // write operations, returns Result<TResult>
IQuery<TResult>                      // read operations, returns Result<TResult>
ICommandHandler<TCommand, TResult>   // implemented by MediatR handlers
IQueryHandler<TQuery, TResult>       // implemented by MediatR handlers
```

### MediatR Pipeline Behaviors (execution order)
1. **LoggingBehavior** — logs request name, user, duration via Serilog
2. **ValidationBehavior** — runs FluentValidation, returns `Result.Failure` on errors
3. **PerformanceBehavior** — warns via Serilog if handler exceeds 500ms

### Standardized API Response Wrapper
```json
// Success
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "page": 1, "pageSize": 20, "totalCount": 150, "totalPages": 8 }
}

// Failure
{
  "success": false,
  "data": null,
  "error": {
    "code": "Lease.UnitAlreadyRented",
    "message": "الوحدة مؤجرة بالفعل ولا يمكن إنشاء عقد جديد عليها"
  }
}
```

### Global Exception Handling Middleware
Catches anything that escapes the Result pattern (infrastructure failures, unexpected exceptions). Maps to HTTP 500 with a safe generic message. Stack traces go to Serilog only — never to the client.

### Base Domain Types
```csharp
BaseEntity          // Id (Guid), CreatedAt, UpdatedAt
AggregateRoot       // extends BaseEntity, holds domain events list
ValueObject         // equality by value, not reference
```

---

## Section 3 — Domain Layer

Each module has its own folder containing: entities, value objects, domain events, enums, and repository interface. No EF, no HTTP, no MediatR.

### Module Structure
```
Domain/
├── Owners/
│     Owner                    (Aggregate Root)
│       ValueObjects/
│         BankAccount          (BankName, AccountHolderName, IBAN)
│         AgencyInfo           (AgencyNumber, ExpiryDate, FileUrl)
│       Enums/ OwnerStatus
│       Events/ OwnerCreatedEvent, OwnerUpdatedEvent
│       IOwnerRepository
│
├── Buildings/
│     Building                 (Aggregate Root)
│       ValueObjects/
│         GeoLocation          (Latitude, Longitude, MapLink)
│         BuildingDocuments    (LicenseUrl, PlanUrl, DeedUrl, OtherUrls[])
│         UnitCounts           (ApartmentCount, ShopCount, GuardRoomCount, RooftopCount, ServicedCount)
│       Enums/ BuildingStatus, MeterType
│       Events/ BuildingCreatedEvent
│       IBuildingRepository
│
├── Units/
│     Unit                     (Aggregate Root)
│       Enums/ UnitType, UnitStatus, FurnishingStatus
│       Events/ UnitStatusChangedEvent
│       IUnitRepository
│
├── Renters/
│     Renter                   (Aggregate Root)
│       ValueObjects/
│         IdentityInfo         (IdType, NationalId, IdExpiryDate)
│         CommercialInfo       (RepresentativeName, RepresentativeId, CommercialRecordExpiryDate, RepresentativeBirthDate)
│       Enums/ RenterIdType    (Identity | Residency | CommercialRecord | PremiumResidency | GCC)
│       Events/ RenterCreatedEvent, RenterBlacklistedEvent
│       IRenterRepository
│
├── Leases/
│     Lease                    (Aggregate Root)
│     PaymentScheduleItem      (Entity, owned by Lease)
│       ValueObjects/
│         CommissionBreakdown  (Net, Vat, Total)
│         LeaseWarnings        (FirstWarningAt, SecondWarningAt, FinancialLetterAt, EvictionNoticeAt)
│       Enums/ LeaseStatus, ContractDuration, PaymentCycle, PaymentStatus
│         ContractDuration: OneYear | SixMonths | ThreeMonths | Custom
│       Events/ LeaseCreatedEvent, LeaseActivatedEvent, LeaseExpiredEvent, PaymentOverdueEvent
│       ILeaseRepository
│
├── Requests/
│     MaintenanceRequest       (Aggregate Root)
│     RequestComment           (Entity, owned by Request)
│       Enums/ RequestCategory, RequestPriority, RequestStatus
│       Events/ RequestCreatedEvent, RequestStatusChangedEvent
│       IRequestRepository
│
├── Accounting/
│     LedgerAccount            (Aggregate Root)
│     LedgerEntry              (Aggregate Root, references AccountId)
│       Enums/ LedgerAccountType (Asset | Liability | Revenue | Expense | Equity)
│       Events/ RentPaymentRecordedEvent, OwnerPayoutRecordedEvent
│       ILedgerAccountRepository, ILedgerEntryRepository
│
├── Auth/
│     User                     (Aggregate Root, extends IdentityUser)
│     Role                     (extends IdentityRole)
│       Enums/ UserRole (Admin | Accountant | Owner | Renter | Employee)
│       Permission enum (13 types)
│       IUserRepository
│
└── Inquiries/
      Inquiry                  (Aggregate Root)
      Enums/ InquiryStatus
      IInquiryRepository
```

### Cross-Module Reference Rule
Modules never import each other's domain types directly. A `Lease` holds `OwnerId` (Guid) — not an `Owner` object. When the Application layer needs joined data, it makes separate repository calls in the query handler.

### Repository Interface Shape (consistent across all modules)
```csharp
public interface IOwnerRepository
{
    Task<Owner?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PagedResult<Owner>> GetAllAsync(OwnerFilter filter, PaginationParams pagination, CancellationToken ct = default);
    Task AddAsync(Owner owner, CancellationToken ct = default);
    void Update(Owner owner);
    void Delete(Owner owner);  // soft delete sets IsDeleted = true
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);
}
```

All write operations go through `IUnitOfWork.SaveChangesAsync()`. The repository never calls `SaveChanges` directly.

---

## Section 4 — Application Layer (CQRS + MediatR)

Every feature is a self-contained vertical slice inside its module folder.

### Application Structure
```
Application/
├── Common/
│     Behaviors/
│       ValidationBehavior.cs
│       LoggingBehavior.cs
│       PerformanceBehavior.cs
│     Interfaces/
│       IFileStorageService.cs
│       IEmailService.cs
│       ICurrentUserService.cs      // exposes UserId, Role, Permissions from JWT
│       IUnitOfWork.cs
│     Mappings/
│       MappingExtensions.cs        // manual mapping methods (no AutoMapper magic)
│
├── Owners/
│     Commands/
│       CreateOwner/ (Command + Handler + Validator)
│       UpdateOwner/ (Command + Handler + Validator)
│       DeleteOwner/ (Command + Handler)
│       UploadAgencyFile/ (Command + Handler)
│     Queries/
│       GetOwners/ (Query + Handler + OwnerListDto)       // search, filter, pagination
│       GetOwnerById/ (Query + Handler + OwnerDetailDto)
│
├── Buildings/
│     Commands/
│       CreateBuilding/ UpdateBuilding/ DeleteBuilding/
│       UploadBuildingDocument/         // handles license | plan | deed | other
│     Queries/
│       GetBuildings/                   // with totalUnits, availableUnits stats
│       GetBuildingById/
│       GetBuildingsWithLocation/       // for map page: lat/lng + stats
│
├── Units/
│     Commands/
│       CreateUnit/ UpdateUnit/ DeleteUnit/
│       TogglePublished/                // admin only
│     Queries/
│       GetUnits/                       // filterable by building, status, type
│       GetUnitById/
│       GetPublicUnits/                 // no auth, public listing
│       GetUnitsByBuilding/
│
├── Renters/
│     Commands/
│       CreateRenter/                   // auto username=nationalId, password=phone
│       UpdateRenter/ DeleteRenter/
│       ToggleBlacklist/
│     Queries/
│       GetRenters/ GetRenterById/
│
├── Leases/
│     Commands/
│       CreateLease/                    // full wizard data, generates payment schedule
│       UpdateLease/ TerminateLease/
│       ConfirmDeposit/                 // admin only
│       ConfirmCommission/              // admin only
│       RecordPayment/                  // admin only, marks installment paid
│       SendPaymentWarning/             // first | second | financial | eviction
│     Queries/
│       GetLeases/                      // filterable by building, owner, status
│       GetLeaseById/
│       GetLeasesByUnit/ GetLeasesByRenter/
│       GetOwnerContracts/              // enriched with owner+renter+unit+building
│       GetLatePayments/               // dashboard overdue with building filter
│
├── Requests/
│     Commands/
│       CreateRequest/ UpdateRequestStatus/
│       AddComment/ UploadRequestPhoto/
│     Queries/
│       GetRequests/ GetRequestById/
│
├── Accounting/
│     Commands/
│       RecordRentPayment/
│       RecordOwnerPayout/
│       RecordMaintenanceExpense/
│       CreateLedgerAccount/
│     Queries/
│       GetLedgerAccounts/ GetLedgerEntries/
│       GetOwnerStatement/              // full owner financial statement
│       GetDashboardStats/              // KPIs for dashboard
│
├── Auth/
│     Commands/
│       Login/                          // returns JWT + refresh token
│       RefreshToken/ Logout/ ChangePassword/
│       CreateUser/ UpdateUserRole/
│     Queries/
│       GetCurrentUser/ GetAllUsers/
│
├── Inquiries/
│     Commands/ CreateInquiry/ UpdateInquiryStatus/
│     Queries/  GetInquiries/ GetInquiryById/
│
└── Dashboard/
      Queries/
        GetDashboardStats/
        GetLatePayments/                // with optional buildingIds[] filter
```

### Command Handler Pattern
```csharp
public sealed class CreateOwnerCommandHandler
    : IRequestHandler<CreateOwnerCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(CreateOwnerCommand command, CancellationToken ct)
    {
        // 1. Business rule checks
        var exists = await _owners.ExistsWithNationalIdAsync(command.NationalId, ct);
        if (exists) return Result.Failure<Guid>(OwnerErrors.DuplicateNationalId);

        // 2. Build aggregate via factory method
        var owner = Owner.Create(command);

        // 3. Persist
        await _owners.AddAsync(owner, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        // 4. Return
        return Result.Success(owner.Id);
    }
}
```

### Query Handler Pattern (bypasses domain for performance)
```csharp
public sealed class GetOwnersQueryHandler
    : IRequestHandler<GetOwnersQuery, Result<PagedResult<OwnerListDto>>>
{
    public async Task<Result<PagedResult<OwnerListDto>>> Handle(GetOwnersQuery query, CancellationToken ct)
    {
        var result = await _db.Owners
            .Where(o => !o.IsDeleted)
            .Where(o => query.SearchTerm == null || o.FullName.Contains(query.SearchTerm))
            .Select(o => new OwnerListDto { ... })   // project, don't load full entity
            .ToPagedResultAsync(query.Pagination, ct);

        return Result.Success(result);
    }
}
```

### Validator Pattern (FluentValidation)
```csharp
public sealed class CreateOwnerCommandValidator : AbstractValidator<CreateOwnerCommand>
{
    public CreateOwnerCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().Matches(@"^05\d{8}$");
        RuleFor(x => x.NationalId).NotEmpty().Length(10);
        RuleFor(x => x.IBAN).MaximumLength(34).When(x => x.IBAN != null);
        RuleFor(x => x.AgencyExpiryDate)
            .GreaterThan(DateOnly.FromDateTime(DateTime.Today))
            .When(x => x.AgencyExpiryDate.HasValue);
    }
}
```

---

## Section 5 — Infrastructure Layer

```
Infrastructure/
├── Persistence/
│     AppDbContext.cs
│     UnitOfWork.cs
│     Migrations/
│     Configurations/                  // EF Fluent API, one file per entity
│       OwnerConfiguration.cs
│       BuildingConfiguration.cs
│       UnitConfiguration.cs
│       RenterConfiguration.cs
│       LeaseConfiguration.cs
│       PaymentScheduleItemConfiguration.cs
│       MaintenanceRequestConfiguration.cs
│       RequestCommentConfiguration.cs
│       LedgerAccountConfiguration.cs
│       LedgerEntryConfiguration.cs
│       UserConfiguration.cs
│     Repositories/
│       OwnerRepository.cs
│       BuildingRepository.cs
│       UnitRepository.cs
│       RenterRepository.cs
│       LeaseRepository.cs
│       RequestRepository.cs
│       LedgerAccountRepository.cs
│       LedgerEntryRepository.cs
│       UserRepository.cs
│       InquiryRepository.cs
│     Specifications/
│       OwnerSpecifications.cs
│       LeaseSpecifications.cs
│       UnitSpecifications.cs
│
├── FileStorage/
│     LocalFileStorageService.cs
│       SaveAsync(stream, folder, fileName) → returns relative path
│       DeleteAsync(relativePath)
│       GetFullPath(relativePath)      // maps to /uploads volume
│     FileStorageSettings.cs
│
├── Auth/
│     JwtTokenService.cs
│     RefreshTokenRepository.cs        // stores hashed tokens in DB
│     CurrentUserService.cs            // reads HttpContext claims
│     PermissionService.cs             // maps UserRole → Permission[]
│
├── Email/
│     SmtpEmailService.cs
│     Templates/
│       PaymentReminderTemplate.cs
│       LeaseExpiryTemplate.cs
│
├── BackgroundJobs/
│     JobScheduler.cs                  // registers all Hangfire recurring jobs
│     Jobs/
│       MarkOverduePaymentsJob.cs
│       ExpireLeasesJob.cs
│       PaymentWarningJob.cs
│       FileCleanupJob.cs
│       DatabaseBackupJob.cs
│
└── DependencyInjection.cs             // AddInfrastructure() extension method
```

### Database Schema

Conventions:
- PK: `UNIQUEIDENTIFIER` with default `NEWSEQUENTIALID()`
- Audit: `CreatedAt DATETIME2`, `UpdatedAt DATETIME2` on every table
- Soft delete: `IsDeleted BIT`, `DeletedAt DATETIME2` on Owners, Buildings, Units, Renters, Leases
- Money: `DECIMAL(18,2)`
- Strings: explicit `NVARCHAR(n)` lengths

```sql
[Owners]
  Id, FullName NVARCHAR(200), Phone NVARCHAR(20), Email NVARCHAR(200)
  NationalId NVARCHAR(20), Address NVARCHAR(500)
  IsIndependent BIT, IsBlacklisted BIT
  BankName NVARCHAR(100), AccountHolderName NVARCHAR(200), IBAN NVARCHAR(34)
  AgencyNumber NVARCHAR(100), AgencyExpiryDate DATE, AgencyFileUrl NVARCHAR(500)
  UserId (FK → AspNetUsers)
  IsDeleted BIT, DeletedAt DATETIME2, CreatedAt DATETIME2, UpdatedAt DATETIME2

[Buildings]
  Id, OwnerId (FK → Owners)
  Name NVARCHAR(200), Address NVARCHAR(500), City NVARCHAR(100), District NVARCHAR(100)
  TotalFloors INT, YearBuilt INT
  ImageUrl NVARCHAR(500), DeedImageUrl NVARCHAR(500)
  Latitude FLOAT, Longitude FLOAT, MapLink NVARCHAR(1000)
  WaterMeterNumber NVARCHAR(100)
  BuildingLicenseUrl NVARCHAR(500), BuildingPlanUrl NVARCHAR(500)
  RealEstateAuthorityDeedUrl NVARCHAR(500)
  OtherDocumentUrls NVARCHAR(MAX)       -- JSON array
  OwnerManagerName NVARCHAR(200)
  RenterManagerIds NVARCHAR(MAX)        -- JSON array of UserIds
  ApartmentCount INT, ShopCount INT, GuardRoomCount INT
  RooftopCount INT, ServicedApartmentCount INT
  GuardName NVARCHAR(200), GuardPhone NVARCHAR(20)
  Status NVARCHAR(50)
  IsDeleted BIT, DeletedAt DATETIME2, CreatedAt DATETIME2, UpdatedAt DATETIME2

[Units]
  Id, BuildingId (FK → Buildings), OwnerId (FK → Owners)
  UnitCode NVARCHAR(50), UnitType NVARCHAR(50), Floor INT, Area DECIMAL(10,2)
  RoomsCount INT, BathroomsCount INT
  FurnishingStatus NVARCHAR(50), Status NVARCHAR(50)
  RentPrice DECIMAL(18,2), ServiceFee DECIMAL(18,2)
  ElectricityMeterNumber NVARCHAR(100)
  IsPublished BIT DEFAULT 1
  Description NVARCHAR(MAX), ImageUrl NVARCHAR(500)
  AdditionalImages NVARCHAR(MAX)        -- JSON array
  IsDeleted BIT, DeletedAt DATETIME2, CreatedAt DATETIME2, UpdatedAt DATETIME2

[Renters]
  Id, FullName NVARCHAR(200), Phone NVARCHAR(20), Email NVARCHAR(200)
  IdType NVARCHAR(50), NationalId NVARCHAR(20), IdExpiryDate DATE
  RepresentativeName NVARCHAR(200), RepresentativeId NVARCHAR(20)
  CommercialRecordExpiryDate DATE, RepresentativeBirthDate DATE
  Nationality NVARCHAR(100), BirthDate DATE
  IsBlacklisted BIT, BlacklistReason NVARCHAR(500)
  UserId (FK → AspNetUsers)
  IsDeleted BIT, DeletedAt DATETIME2, CreatedAt DATETIME2, UpdatedAt DATETIME2

[Leases]
  Id, BuildingId (FK), OwnerId (FK), UnitId (FK), RenterId (FK)
  StartDate DATE, EndDate DATE
  ContractDuration NVARCHAR(50), PaymentCycle NVARCHAR(50)
  TotalContractValue DECIMAL(18,2), DepositAmount DECIMAL(18,2)
  CommissionPercentage DECIMAL(5,2)
  RentalCommission DECIMAL(18,2), CommissionVat DECIMAL(18,2), CommissionTotal DECIMAL(18,2)
  CommissionDiscount DECIMAL(18,2)
  DepositPaid BIT DEFAULT 0, CommissionPaid BIT DEFAULT 0
  InactiveReason NVARCHAR(500)
  Status NVARCHAR(50)
  OwnerManagerName NVARCHAR(200), RenterManagerName NVARCHAR(200)
  CreatedByUserId UNIQUEIDENTIFIER, AssignedToUserId UNIQUEIDENTIFIER
  IsDeleted BIT, DeletedAt DATETIME2, CreatedAt DATETIME2, UpdatedAt DATETIME2

[PaymentScheduleItems]
  Id, LeaseId (FK → Leases)
  DueDate DATE, Amount DECIMAL(18,2), Status NVARCHAR(50)
  PaidDate DATE, PaidAmount DECIMAL(18,2)
  WarningFirstSentAt DATETIME2, WarningSecondSentAt DATETIME2
  FinancialLetterSentAt DATETIME2, EvictionNoticeSentAt DATETIME2
  CreatedAt DATETIME2, UpdatedAt DATETIME2

[MaintenanceRequests]
  Id, CreatedByRole NVARCHAR(20)
  OwnerId UNIQUEIDENTIFIER NULL, RenterId UNIQUEIDENTIFIER NULL
  UnitId UNIQUEIDENTIFIER NULL, LeaseId UNIQUEIDENTIFIER NULL
  Category NVARCHAR(50), Priority NVARCHAR(50), Status NVARCHAR(50)
  Title NVARCHAR(300), Description NVARCHAR(MAX)
  Photos NVARCHAR(MAX)                  -- JSON array of file paths
  CreatedAt DATETIME2, UpdatedAt DATETIME2

[RequestComments]
  Id, RequestId (FK → MaintenanceRequests)
  ByUserName NVARCHAR(200), Text NVARCHAR(MAX)
  CreatedAt DATETIME2

[LedgerAccounts]
  Id, Code NVARCHAR(20), ParentId UNIQUEIDENTIFIER NULL (FK self-ref)
  Name NVARCHAR(200), Type NVARCHAR(50)
  OwnerId UNIQUEIDENTIFIER NULL, UnitId UNIQUEIDENTIFIER NULL, RenterId UNIQUEIDENTIFIER NULL
  Balance DECIMAL(18,2) DEFAULT 0, IsSystem BIT DEFAULT 0
  CreatedAt DATETIME2, UpdatedAt DATETIME2

[LedgerEntries]
  Id, TransactionId UNIQUEIDENTIFIER NULL, AccountId (FK → LedgerAccounts)
  Date DATE, Debit DECIMAL(18,2), Credit DECIMAL(18,2)
  Note NVARCHAR(500)
  ReferenceType NVARCHAR(50) NULL, ReferenceId UNIQUEIDENTIFIER NULL
  CreatedAt DATETIME2

[Inquiries]
  Id, FullName NVARCHAR(200), Phone NVARCHAR(20), Email NVARCHAR(200)
  UnitId UNIQUEIDENTIFIER NULL (FK → Units)
  Message NVARCHAR(MAX), Status NVARCHAR(50)
  CreatedAt DATETIME2, UpdatedAt DATETIME2

[RefreshTokens]
  Id, UserId (FK → AspNetUsers)
  TokenHash NVARCHAR(500)
  ExpiresAt DATETIME2, CreatedAt DATETIME2
  RevokedAt DATETIME2 NULL, IsRevoked BIT DEFAULT 0

[AspNetUsers] (extended from IdentityUser)
  + OwnerId UNIQUEIDENTIFIER NULL
  + RenterId UNIQUEIDENTIFIER NULL
  + Permissions NVARCHAR(MAX)           -- JSON array of Permission enum values
```

### Unit of Work
```csharp
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
```
One `SaveChangesAsync` per command handler. EF Core change tracking handles all pending writes in one transaction.

### Specification Pattern (for reusable predicates only)
```csharp
public static class LeaseSpecifications
{
    public static Expression<Func<Lease, bool>> IsActive()
        => l => l.Status == LeaseStatus.Active && !l.IsDeleted;

    public static Expression<Func<Lease, bool>> ExpiresWithinDays(int days)
        => l => l.EndDate <= DateTime.Today.AddDays(days) && l.Status == LeaseStatus.Active;

    public static Expression<Func<PaymentScheduleItem, bool>> IsOverdue()
        => p => p.Status == PaymentStatus.Pending && p.DueDate < DateTime.Today;
}
```

---

## Section 6 — API Layer

### Controller Structure
```
Api/
├── Controllers/
│     AuthController.cs
│     OwnersController.cs
│     BuildingsController.cs
│     UnitsController.cs
│     PublicController.cs              // no auth, public listing
│     RentersController.cs
│     LeasesController.cs
│     PaymentsController.cs
│     RequestsController.cs
│     AccountingController.cs
│     InquiriesController.cs
│     UsersController.cs
│     FilesController.cs
│     DashboardController.cs
│
├── Middleware/
│     GlobalExceptionHandlingMiddleware.cs
│     RequestLoggingMiddleware.cs
│
├── Extensions/
│     ResultExtensions.cs              // ToActionResult() maps Result<T> → IActionResult
│     ClaimsPrincipalExtensions.cs
│
├── Filters/
│     RequiresPermissionAttribute.cs   // [RequiresPermission(Permission.OWNERS_WRITE)]
│
└── Program.cs
```

### Controller Pattern (all controllers follow this)
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class OwnersController : ControllerBase
{
    private readonly ISender _sender;

    [HttpGet]
    [RequiresPermission(Permission.OWNERS_READ)]
    public async Task<IActionResult> GetAll([FromQuery] GetOwnersQuery query, CancellationToken ct)
        => (await _sender.Send(query, ct)).ToActionResult();

    [HttpPost]
    [RequiresPermission(Permission.OWNERS_WRITE)]
    public async Task<IActionResult> Create([FromBody] CreateOwnerCommand command, CancellationToken ct)
        => (await _sender.Send(command, ct)).ToActionResult();

    [HttpPut("{id:guid}")]
    [RequiresPermission(Permission.OWNERS_WRITE)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateOwnerCommand command, CancellationToken ct)
        => (await _sender.Send(command with { Id = id }, ct)).ToActionResult();

    [HttpDelete("{id:guid}")]
    [RequiresPermission(Permission.OWNERS_WRITE)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await _sender.Send(new DeleteOwnerCommand(id), ct)).ToActionResult();
}
```

### Authentication Flow (JWT + Refresh Tokens)
```
POST /api/auth/login
  → LoginCommandHandler validates credentials via ASP.NET Core Identity
  → Generates JWT (15 min expiry) containing: sub, username, role, permissions[]
  → Generates Refresh Token (7 days), stored hashed in [RefreshTokens] table
  → Returns: { accessToken, refreshToken, expiresAt, user: { id, username, role, permissions[] } }

POST /api/auth/refresh
  → Validates refresh token hash, checks not revoked/expired
  → Issues new JWT + rotated refresh token (old one revoked immediately)

POST /api/auth/logout
  → Revokes refresh token in DB

JWT Claims:
  sub (UserId), username, role, permissions[], iat, exp
```

### Permission Guard
```csharp
[RequiresPermission(Permission.OWNERS_WRITE)]
```
`RequiresPermissionAttribute` reads the `permissions` claim from the JWT. Rejects with HTTP 403 if missing. **No database call per request** — permissions are baked into the token at login time.

### File Upload Flow
```
POST /api/files/upload  (multipart/form-data)
  → Validates: max 10MB, allowed types: pdf, jpg, jpeg, png
  → Saves to /uploads/{module}/{year}/{month}/{guid}.{ext}
  → Returns: { url: "/uploads/owners/2026/05/abc123.pdf" }

All URLs stored as relative paths in DB.
Docker volume maps /uploads → host directory.
Nginx serves /uploads/* directly for reads.
```

---

## Section 7 — Background Jobs (Hangfire)

Hangfire chosen for its built-in dashboard UI at `/hangfire` (admin-only).

| Job | Schedule | What it does |
|---|---|---|
| `MarkOverduePaymentsJob` | Daily 1:00 AM | Scans `PaymentScheduleItems` where `Status=Pending AND DueDate < TODAY` → sets `Status=Overdue` |
| `ExpireLeasesJob` | Daily 2:00 AM | Finds `Leases` where `EndDate < TODAY AND Status=Active` → sets `Status=Expired`, frees unit |
| `PaymentWarningJob` | Daily 3:00 AM | Evaluates overdue items against thresholds: 15 days → 1st warning email, 30 days → 2nd warning email. Stamps `WarningFirstSentAt` / `WarningSecondSentAt` |
| `FileCleanupJob` | Weekly Sunday 4:00 AM | Scans `/uploads` directory, removes files with no matching DB reference |
| `DatabaseBackupJob` | Daily 5:00 AM | Runs `BACKUP DATABASE` via `sqlcmd`, saves to `/backups/`, keeps last 7 days, deletes older |

All jobs are idempotent — safe to re-run if they fail partway through.

---

## Section 8 — Complete API Endpoints Reference

```
AUTH
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout
  GET    /api/auth/me
  PUT    /api/auth/change-password

OWNERS
  GET    /api/owners                    ?search=&page=&pageSize=&isIndependent=
  GET    /api/owners/{id}
  POST   /api/owners
  PUT    /api/owners/{id}
  DELETE /api/owners/{id}
  POST   /api/owners/{id}/agency-file

BUILDINGS
  GET    /api/buildings                 ?search=&ownerId=&status=&page=
  GET    /api/buildings/{id}
  GET    /api/buildings/map             lat/lng + stats for all buildings
  POST   /api/buildings
  PUT    /api/buildings/{id}
  DELETE /api/buildings/{id}
  POST   /api/buildings/{id}/documents  ?type=license|plan|deed|other

UNITS
  GET    /api/units                     ?buildingId=&ownerId=&status=&type=&page=
  GET    /api/units/{id}
  POST   /api/units
  PUT    /api/units/{id}
  DELETE /api/units/{id}
  PATCH  /api/units/{id}/published      admin only

PUBLIC (no auth required)
  GET    /api/public/units              ?city=&type=&minRent=&maxRent=&page=
  GET    /api/public/units/{id}
  POST   /api/public/inquiries

RENTERS
  GET    /api/renters                   ?search=&isBlacklisted=&page=
  GET    /api/renters/{id}
  POST   /api/renters
  PUT    /api/renters/{id}
  DELETE /api/renters/{id}
  PATCH  /api/renters/{id}/blacklist

LEASES
  GET    /api/leases                    ?buildingId=&ownerId=&renterId=&status=&page=
  GET    /api/leases/{id}
  GET    /api/leases/owner-contracts    enriched: owner+renter+unit+building
  POST   /api/leases
  PUT    /api/leases/{id}
  DELETE /api/leases/{id}
  PATCH  /api/leases/{id}/confirm-deposit      admin only
  PATCH  /api/leases/{id}/confirm-commission   admin only
  PATCH  /api/leases/{id}/terminate

PAYMENTS
  GET    /api/leases/{id}/payments
  POST   /api/payments/record                   admin only
  POST   /api/payments/{itemId}/warning         ?type=first|second|financial|eviction

REQUESTS
  GET    /api/requests                  ?status=&priority=&category=&page=
  GET    /api/requests/{id}
  POST   /api/requests
  PUT    /api/requests/{id}/status
  POST   /api/requests/{id}/comments
  POST   /api/requests/{id}/photos

ACCOUNTING
  GET    /api/accounting/accounts
  POST   /api/accounting/accounts
  GET    /api/accounting/entries        ?accountId=&from=&to=&page=
  POST   /api/accounting/rent-payment
  POST   /api/accounting/owner-payout
  POST   /api/accounting/maintenance-expense
  GET    /api/accounting/owner-statement/{ownerId}

INQUIRIES
  GET    /api/inquiries                 ?status=&page=
  GET    /api/inquiries/{id}
  PATCH  /api/inquiries/{id}/status

DASHBOARD
  GET    /api/dashboard/stats
  GET    /api/dashboard/late-payments   ?buildingIds=&page=

ADMIN — USERS
  GET    /api/admin/users               ?role=&search=&page=
  GET    /api/admin/users/{id}
  POST   /api/admin/users
  PUT    /api/admin/users/{id}
  PATCH  /api/admin/users/{id}/role

FILES
  POST   /api/files/upload              multipart/form-data → { url }
  DELETE /api/files                     ?path=

HANGFIRE DASHBOARD
  GET    /hangfire                       admin-only, cookie auth
```

---

## Section 9 — Docker & DevOps

### Repository Structure
```
PropertyManagement.DevOps/
├── docker/
│     Dockerfile
│     docker-compose.yml               local dev
│     docker-compose.prod.yml          production overrides
│     .env.example                     all required env vars documented
│
├── nginx/
│     nginx.conf                       reverse proxy config
│
├── scripts/
│     deploy.sh                        pull → build → migrate → restart
│     backup-now.sh                    manual DB backup trigger
│     restore.sh                       restore from backup file
│
└── .github/
      workflows/
        ci.yml                         on PR: build + test + lint
        cd.yml                         on main merge: build image → push → deploy
```

### Docker Compose Services
```yaml
services:

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      SA_PASSWORD: ${DB_PASSWORD}
      ACCEPT_EULA: Y
    volumes:
      - sqldata:/var/opt/mssql
      - ./backups:/backups

  backend:
    build: ../PropertyManagement.Backend
    environment:
      ConnectionStrings__Default: ${CONNECTION_STRING}
      Jwt__Secret: ${JWT_SECRET}
      Jwt__ExpiryMinutes: 15
      Jwt__RefreshExpiryDays: 7
      FileStorage__BasePath: /uploads
      Hangfire__Dashboard__Enabled: true
    volumes:
      - uploads:/uploads
      - ./backups:/backups
    depends_on: [sqlserver]
    ports:
      - "8080:8080"

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ../PropertyManagement.Dashboard/dist:/usr/share/nginx/html
      - uploads:/uploads:ro             # serve uploaded files directly
    ports:
      - "80:80"
      - "443:443"
    depends_on: [backend]

volumes:
  sqldata:
  uploads:
```

### Dockerfile (multi-stage)
```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish src/PropertyManagement.Api \
    -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p /uploads /backups
EXPOSE 8080
ENTRYPOINT ["dotnet", "PropertyManagement.Api.dll"]
```

### Nginx Config
```nginx
server {
    listen 80;

    # API → backend container
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Hangfire dashboard → backend (admin only, protected by app)
    location /hangfire {
        proxy_pass http://backend:8080;
    }

    # Uploaded files → served directly by Nginx
    location /uploads/ {
        alias /uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Angular SPA → serve index.html for all other routes
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### appsettings.json Structure
```json
{
  "ConnectionStrings": {
    "Default": "Server=sqlserver;Database=PropertyManagementDb;User Id=sa;Password=...;TrustServerCertificate=true"
  },
  "Jwt": {
    "Secret": "",
    "Issuer": "PropertyManagement",
    "Audience": "PropertyManagement",
    "ExpiryMinutes": 15,
    "RefreshExpiryDays": 7
  },
  "FileStorage": {
    "BasePath": "/uploads",
    "MaxFileSizeBytes": 10485760,
    "AllowedExtensions": [".pdf", ".jpg", ".jpeg", ".png"]
  },
  "Email": {
    "SmtpHost": "",
    "SmtpPort": 587,
    "SenderEmail": "",
    "SenderName": "نظام إدارة العقارات"
  },
  "Hangfire": {
    "Dashboard": { "Enabled": true, "Path": "/hangfire" },
    "Backup": { "KeepDays": 7, "BackupPath": "/backups" }
  },
  "Serilog": {
    "MinimumLevel": "Information",
    "WriteTo": ["Console", "File"]
  }
}
```

---

## Implementation Order (suggested)

When implementation begins, build in this order to always have a working vertical slice:

1. **SharedKernel** — Result, CQRS interfaces, base types
2. **Domain** — all entities, value objects, repository interfaces (no EF yet)
3. **Infrastructure** — AppDbContext, EF configurations, migrations, UnitOfWork
4. **Auth module** — Login, JWT, permissions (needed by everything else)
5. **Owners module** — first full CRUD vertical slice end-to-end
6. **Buildings module**
7. **Units module**
8. **Renters module**
9. **Leases module** — most complex (payment schedule, commission breakdown)
10. **Requests module**
11. **Accounting module**
12. **Inquiries module**
13. **Dashboard queries**
14. **Background jobs**
15. **File upload**
16. **Docker + DevOps**

---

*End of design spec. Awaiting user review before proceeding to implementation plan.*
