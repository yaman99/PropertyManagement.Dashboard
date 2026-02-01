/**
 * Unit Domain Model
 * Represents a rental property/unit
 *
 * Ownership Types:
 * - 'building': Unit belongs to a building, owner inherited from building
 * - 'individual': Standalone unit with direct owner
 */

export interface Unit {
  id: string;

  // Ownership
  ownershipType: OwnershipType;
  buildingId?: string;  // Required when ownershipType = 'building'
  ownerId?: string;     // Required when ownershipType = 'individual', computed when 'building'

  // Unit Details
  unitCode: string;
  buildingName?: string; // For display - auto-filled from building or manual for individual
  type: UnitType;
  rooms?: number;
  floor?: number;
  areaSqm?: number;

  // Financial
  rentPrice: number;

  // Status
  status: UnitStatus;
  isPublished: boolean;  // Controls visibility on public pages

  // Accounting Integration
  ledgerAccountId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export enum OwnershipType {
  Building = 'building',
  Individual = 'individual'
}

export enum UnitType {
  Apartment = 'Apartment',
  Villa = 'Villa',
  Office = 'Office',
  Shop = 'Shop',
  Warehouse = 'Warehouse'
}

export enum UnitStatus {
  Available = 'Available',
  Rented = 'Rented',
  Maintenance = 'Maintenance',
  Reserved = 'Reserved'
}

export interface CreateUnitDto {
  ownershipType: OwnershipType;
  buildingId?: string;  // Required when ownershipType = 'building'
  ownerId?: string;     // Required when ownershipType = 'individual'
  unitCode: string;
  buildingName?: string;
  type: UnitType;
  rooms?: number;
  floor?: number;
  areaSqm?: number;
  rentPrice: number;
  isPublished?: boolean;
}

export interface UpdateUnitDto extends Partial<CreateUnitDto> {
  status?: UnitStatus;
}
