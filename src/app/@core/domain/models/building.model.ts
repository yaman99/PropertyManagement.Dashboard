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

  // Location
  latitude?: number;
  longitude?: number;
  mapLink?: string;          // رابط الموقع من جوجل ماب

  // Guard Info
  guardName?: string;
  guardPhone?: string;

  // Unit Counts by Type
  apartmentCount?: number;      // عدد الشقق
  shopCount?: number;           // عدد المحلات
  guardRoomCount?: number;      // غرف الحراس
  rooftopCount?: number;        // الروف (الاسطح)
  servicedApartmentCount?: number; // الشقق المخدومة

  // Water Meter
  waterMeterNumber?: string;    // رقم عداد المياه

  // Documents & Attachments
  buildingLicenseUrl?: string;          // رخصة البناء
  buildingPlanUrl?: string;             // مخططات البناء
  realEstateAuthorityDeedUrl?: string;  // صك الهيئة العامة للعقار
  otherDocumentUrls?: string[];         // مستندات أخرى

  // Management
  ownerManagerName?: string;    // مسؤول المبنى مع المالك
  renterManagerIds?: string[];  // مسؤولو المبنى مع المستأجرين (multi-select from Employee users)

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
  mapLink?: string;
  guardName?: string;
  guardPhone?: string;
  apartmentCount?: number;
  shopCount?: number;
  guardRoomCount?: number;
  rooftopCount?: number;
  servicedApartmentCount?: number;
  waterMeterNumber?: string;
  buildingLicenseUrl?: string;
  buildingPlanUrl?: string;
  realEstateAuthorityDeedUrl?: string;
  otherDocumentUrls?: string[];
  ownerManagerName?: string;
  renterManagerIds?: string[];
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
  mapLink?: string;
  guardName?: string;
  guardPhone?: string;
  apartmentCount?: number;
  shopCount?: number;
  guardRoomCount?: number;
  rooftopCount?: number;
  servicedApartmentCount?: number;
  waterMeterNumber?: string;
  buildingLicenseUrl?: string;
  buildingPlanUrl?: string;
  realEstateAuthorityDeedUrl?: string;
  otherDocumentUrls?: string[];
  ownerManagerName?: string;
  renterManagerIds?: string[];
  electricityMeters?: ElectricityMeter[];
  status?: BuildingStatus;
}
