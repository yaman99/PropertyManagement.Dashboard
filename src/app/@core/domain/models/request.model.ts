/**
 * Request/Complaint Domain Model
 * Represents maintenance requests and complaints
 */

export interface Request {
  id: string;

  // Creator Info
  createdByRole: 'Admin' | 'Owner' | 'Renter';
  ownerId?: string;
  renterId?: string;
  unitId?: string;
  leaseId?: string;

  // Request Details
  category: RequestCategory;
  priority: RequestPriority;
  status: RequestStatus;
  title: string;
  description: string;

  // Attachments
  photos: string[]; // base64 encoded for demo

  // Comments/Updates
  comments: RequestComment[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export enum RequestCategory {
  Maintenance = 'Maintenance',
  Plumbing = 'Plumbing',
  Electrical = 'Electrical',
  HVAC = 'HVAC',
  Cleaning = 'Cleaning',
  Security = 'Security',
  Other = 'Other'
}

export enum RequestPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent'
}

export enum RequestStatus {
  New = 'New',
  InProgress = 'InProgress',
  OnHold = 'OnHold',
  Resolved = 'Resolved',
  Closed = 'Closed',
  Cancelled = 'Cancelled'
}

export interface RequestComment {
  id: string;
  by: string;
  text: string;
  at: Date;
}

export interface CreateRequestDto {
  createdByRole: 'Admin' | 'Owner' | 'Renter';
  ownerId?: string;
  renterId?: string;
  unitId?: string;
  leaseId?: string;
  category: RequestCategory;
  priority: RequestPriority;
  title: string;
  description: string;
  photos?: string[];
}

export interface UpdateRequestDto {
  status?: RequestStatus;
  priority?: RequestPriority;
  category?: RequestCategory;
}

export interface AddCommentDto {
  requestId: string;
  by: string;
  text: string;
}
