/**
 * Building Domain Model
 * Represents a property building owned by an owner
 */

export interface Building {
  id: string;
  ownerId: string;  // Required - building must have an owner

  // Building Details
  name: string;
  address: string;
  city?: string;
  district?: string;
  totalFloors?: number;
  totalUnits?: number;
  yearBuilt?: number;

  // Status
  status: BuildingStatus;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export enum BuildingStatus {
  Active = 'Active',
  UnderConstruction = 'UnderConstruction',
  UnderMaintenance = 'UnderMaintenance',
  Inactive = 'Inactive'
}

export interface CreateBuildingDto {
  ownerId: string;
  name: string;
  address: string;
  city?: string;
  district?: string;
  totalFloors?: number;
  yearBuilt?: number;
}

export interface UpdateBuildingDto {
  id: string;
  ownerId?: string;
  name?: string;
  address?: string;
  city?: string;
  district?: string;
  totalFloors?: number;
  yearBuilt?: number;
  status?: BuildingStatus;
}
