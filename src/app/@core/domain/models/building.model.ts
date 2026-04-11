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

  // Images
  imageUrl?: string;        // Building photo
  deedImageUrl?: string;    // صك المبنى

  // Location (Map)
  latitude?: number;
  longitude?: number;

  // Guard Info
  guardName?: string;
  guardPhone?: string;

  // Unit Counts by Type
  apartmentCount?: number;      // عدد الشقق
  shopCount?: number;           // عدد المحلات
  guardRoomCount?: number;      // غرف الحراس
  rooftopCount?: number;        // الروف (الاسطح)
  servicedApartmentCount?: number; // الشقق المخدومة

  // Management
  ownerManagerName?: string;    // مسؤول المبنى مع المالك
  renterManagerName?: string;   // مسؤول المبنى مع المستأجرين

  // Electricity Meters
  electricityMeters?: ElectricityMeter[];

  // Status
  status: BuildingStatus;

  // Audit
  addedByUserId?: string;       // اسم اليوزر الي ضاف المبنى
  addedByUserName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElectricityMeter {
  id: string;
  meterNumber: string;
  type: MeterType;
  linkedUnitIds?: string[];  // For shared meters - which units share this meter
}

export enum MeterType {
  IndependentUnit = 'IndependentUnit',   // عداد وحدة مستقلة
  Services = 'Services',                 // عداد خدمات
  Shared = 'Shared'                      // عداد مشترك
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
  imageUrl?: string;
  deedImageUrl?: string;
  latitude?: number;
  longitude?: number;
  guardName?: string;
  guardPhone?: string;
  apartmentCount?: number;
  shopCount?: number;
  guardRoomCount?: number;
  rooftopCount?: number;
  servicedApartmentCount?: number;
  ownerManagerName?: string;
  renterManagerName?: string;
  electricityMeters?: ElectricityMeter[];
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
  imageUrl?: string;
  deedImageUrl?: string;
  latitude?: number;
  longitude?: number;
  guardName?: string;
  guardPhone?: string;
  apartmentCount?: number;
  shopCount?: number;
  guardRoomCount?: number;
  rooftopCount?: number;
  servicedApartmentCount?: number;
  ownerManagerName?: string;
  renterManagerName?: string;
  electricityMeters?: ElectricityMeter[];
  status?: BuildingStatus;
}
