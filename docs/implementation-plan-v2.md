# Implementation Plan V2 - Step by Step

**Date:** 2026-04-13

---

## Phase A: Model & Data Layer Updates

### Step 1: Update Renter Model
**Files:** `renter.model.ts`, renter services, state, form, list
- Add: `idType`, `birthDate`, `maritalStatus`, `familyMemberCount`
- Remove: `email`, `address`, `status` field (keep Blacklisted logic separate)
- Update DTOs, form, list columns

### Step 2: Update Lease Model
**Files:** `lease.model.ts`, lease services, state, wizard, detail, list
- Replace `rentAmount` → `totalContractValue`
- Remove `dueDayOfMonth`
- Add: `buildingId`, `contractDuration`, `totalContractValue`, `commissionPercentage`, `rentalCommission`, `commissionDiscount`, `depositPaid`, `commissionPaid`, `createdByUserId`, `createdByUserName`, `assignedToUserId`, `assignedToUserName`, `ownerManagerName`, `renterManagerName`
- Add enums: `ContractDuration`, update `PaymentCycle` with `SemiAnnual`
- Add payment schedule auto-generation based on totalContractValue / paymentCycle
- Update status logic: Inactive until deposit + commission paid

### Step 3: Add Owner Delegation Model
**Files:** new `owner-delegation.model.ts`, owner model, services
- Create `OwnerDelegation` interface
- Add delegation CRUD to owner services/state

### Step 4: Update Inquiry Model
**Files:** `inquiry.model.ts`, inquiry services, state
- Make `unitId` optional
- Add: `preferredPaymentCycle`, `familySize`, `preferredUnitType`, `budget`

### Step 5: Add Payment Warning Model
**Files:** new fields in `lease.model.ts`
- Add `PaymentWarning` interface
- Add `warnings` array to Lease

---

## Phase B: UI Updates

### Step 6: Rebuild Lease Wizard
- Step 1: Select Building → show available units
- Step 2: Search & select renter
- Step 3: Contract duration + start date → auto end date
- Step 4: Total contract value + payment cycle (filtered by duration)
- Step 5: Commission calculation (2.5% default, adjustable)
- Step 6: Deposit amount
- Step 7: Auto-generate payment schedule
- Inactive status until deposit + commission paid

### Step 7: Update Lease Detail & List
- Show building manager names, creator, assignee
- Show inactive reason
- Add filters: unpaid deposit, unpaid commission
- Show warning indicators

### Step 8: Update Renter Form & List
- New form fields (idType, birthDate, maritalStatus, familyMemberCount)
- Remove email, address, status from form
- Conditional: show familyMemberCount only if married

### Step 9: Update Owner Detail
- Add building/unit statistics section
- Show total buildings, per-building unit stats (total, rented, vacant)

### Step 10: Update Building Form & Detail
- Ensure all model fields are in the form
- Image upload UI
- Map display button (admin only)
- Electricity meter management UI with shared meter message
- Owner manager editable by admin only

### Step 11: Update Public Page
- Add general inquiry form (not tied to unit)
- New inquiry filters in admin panel

---

## Phase C: New Features

### Step 12: Users Management Page
- Create `@features/users/` with list and detail
- Show managed owners/renters count per user
- Admin-only access

### Step 13: Owner Delegations UI
- Delegation list in owner detail
- Add/edit delegation form
- Red color for expiring within 3 months

### Step 14: Payment Warning System
- Auto-generate warnings based on overdue schedule items
- Warning display in lease detail
- Manual third warning with blacklist option

---

## Execution Order (Recommended)

1. **Step 1** - Renter Model (small, foundational)
2. **Step 2** - Lease Model (largest model change)
3. **Step 3** - Owner Delegation Model
4. **Step 4** - Inquiry Model
5. **Step 5** - Payment Warning Model
6. **Step 8** - Renter Form/List UI
7. **Step 6** - Lease Wizard rebuild
8. **Step 7** - Lease Detail/List UI
9. **Step 9** - Owner Detail stats
10. **Step 10** - Building Form/Detail
11. **Step 11** - Public Page
12. **Step 12** - Users Page
13. **Step 13** - Delegations UI
14. **Step 14** - Warning System
