/**
 * Lease Domain Model
 * Represents a rental agreement between owner, renter, and unit
 */

export interface Lease {
  id: string;

  // Relationships
  buildingId: string;
  ownerId: string;
  renterId: string;
  unitId: string;

  // Agreement Details
  startDate: Date;
  endDate: Date;
  contractDuration: ContractDuration;
  paymentCycle: PaymentCycle;
  totalContractValue: number;       // قيمة العقد الكلي (يحل محل rentAmount)
  depositAmount?: number;           // مبلغ التأمين

  // Commission (عمولة التأجير)
  commissionPercentage: number;     // نسبة العمولة (2.5% افتراضي)
  rentalCommission: number;         // مبلغ العمولة المحسوب
  commissionDiscount?: number;      // خصم على العمولة (بالريال)

  // Payment Status for Activation
  depositPaid: boolean;             // هل تم دفع التأمين
  commissionPaid: boolean;          // هل تم دفع العمولة
  inactiveReason?: string;          // سبب عدم النشاط

  // Status
  status: LeaseStatus;

  // Payment Schedule
  paymentSchedule: PaymentScheduleItem[];

  // Management Info
  ownerManagerName?: string;        // مسؤول المبنى مع المالك
  renterManagerName?: string;       // مسؤول المبنى مع المستأجر

  // User Tracking
  createdByUserId?: string;         // اليوزر الذي أنشأ العقد
  createdByUserName?: string;       // اسم منشئ العقد
  assignedToUserId?: string;        // اليوزر المسؤول عن متابعة العقد
  assignedToUserName?: string;      // اسم المسؤول

  // Accounting Integration
  renterAccountId: string;
  unitLedgerAccountId: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export enum ContractDuration {
  OneYear = 'OneYear',             // سنة
  SixMonths = 'SixMonths',        // 6 أشهر
  ThreeMonths = 'ThreeMonths'     // 3 أشهر
}

export enum PaymentCycle {
  Monthly = 'Monthly',             // شهري
  Quarterly = 'Quarterly',         // ربع سنوي (كل 3 أشهر)
  SemiAnnual = 'SemiAnnual',       // كل 6 أشهر
  Annual = 'Annual'                // سنوي / دفعة كاملة
}

export enum LeaseStatus {
  Draft = 'Draft',
  Inactive = 'Inactive',           // غير نشط - بانتظار دفع التأمين والعمولة
  Active = 'Active',
  Expired = 'Expired',
  Cancelled = 'Cancelled'
}

export interface PaymentScheduleItem {
  dueDate: Date;
  amount: number;
  status: PaymentStatus;
  paidDate?: Date;
  paidAmount?: number;

  // Late Payment Warnings (انذارات التأخر)
  warningFirstSentAt?: Date;      // تاريخ إرسال الانذار الأول (بعد 15 يوم)
  warningSecondSentAt?: Date;     // تاريخ إرسال الانذار الثاني (بعد شهر / 15 يوم من الأول)
  financialLetterSentAt?: Date;   // تاريخ إرسال الخطاب المالي (يدوي)
  evictionNoticeSentAt?: Date;    // تاريخ إرسال إشعار الإخلاء (يدوي)
}

export enum WarningType {
  FirstWarning = 'FirstWarning',       // انذار أول
  SecondWarning = 'SecondWarning',     // انذار ثاني
  FinancialLetter = 'FinancialLetter', // خطاب مالي
  EvictionNotice = 'EvictionNotice'    // إشعار إخلاء
}

// --- Helper: Get payment warning status ---
export function getPaymentWarningStatus(item: PaymentScheduleItem): {
  canSendFirst: boolean;
  canSendSecond: boolean;
  canSendFinancialLetter: boolean;
  canSendEviction: boolean;
  daysOverdue: number;
} {
  if (item.status === PaymentStatus.Paid) {
    return { canSendFirst: false, canSendSecond: false, canSendFinancialLetter: false, canSendEviction: false, daysOverdue: 0 };
  }

  const now = new Date();
  const dueDate = new Date(item.dueDate);
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  // First warning: 15 days after due date, not yet sent
  const canSendFirst = daysOverdue >= 15 && !item.warningFirstSentAt;

  // Second warning: 30 days after due date OR 15 days after first warning
  const firstWarningDate = item.warningFirstSentAt ? new Date(item.warningFirstSentAt) : null;
  const daysSinceFirst = firstWarningDate
    ? Math.floor((now.getTime() - firstWarningDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const canSendSecond = !!item.warningFirstSentAt && !item.warningSecondSentAt &&
    (daysOverdue >= 30 || daysSinceFirst >= 15);

  // Financial letter / eviction: manual, only after second warning sent
  const canSendFinancialLetter = !!item.warningSecondSentAt && !item.financialLetterSentAt;
  const canSendEviction = !!item.warningSecondSentAt && !item.evictionNoticeSentAt;

  return { canSendFirst, canSendSecond, canSendFinancialLetter, canSendEviction, daysOverdue };
}

export enum PaymentStatus {
  Pending = 'Pending',
  Paid = 'Paid',
  Overdue = 'Overdue',
  PartiallyPaid = 'PartiallyPaid'
}

// --- Helper: Get allowed payment cycles for a given contract duration ---
export function getAllowedPaymentCycles(duration: ContractDuration): PaymentCycle[] {
  switch (duration) {
    case ContractDuration.OneYear:
      return [PaymentCycle.Monthly, PaymentCycle.Quarterly, PaymentCycle.SemiAnnual, PaymentCycle.Annual];
    case ContractDuration.SixMonths:
      return [PaymentCycle.Monthly, PaymentCycle.Quarterly, PaymentCycle.SemiAnnual]; // SemiAnnual = دفعة كاملة
    case ContractDuration.ThreeMonths:
      return [PaymentCycle.Monthly, PaymentCycle.Quarterly]; // Quarterly = دفعة كاملة
    default:
      return [PaymentCycle.Monthly];
  }
}

// --- Helper: Calculate end date from start date and duration ---
export function calculateEndDate(startDate: Date, duration: ContractDuration): Date {
  const end = new Date(startDate);
  switch (duration) {
    case ContractDuration.OneYear:
      end.setFullYear(end.getFullYear() + 1);
      break;
    case ContractDuration.SixMonths:
      end.setMonth(end.getMonth() + 6);
      break;
    case ContractDuration.ThreeMonths:
      end.setMonth(end.getMonth() + 3);
      break;
  }
  // End date is one day before the anniversary
  end.setDate(end.getDate() - 1);
  return end;
}

// --- Helper: Calculate commission ---
export function calculateCommission(totalContractValue: number, commissionPercentage: number, discount: number = 0): number {
  const commission = totalContractValue * (commissionPercentage / 100);
  return Math.max(0, commission - discount);
}

// --- Helper: Generate payment schedule from total contract value ---
export function generatePaymentSchedule(
  startDate: Date,
  totalContractValue: number,
  paymentCycle: PaymentCycle,
  contractDuration: ContractDuration
): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];

  let totalMonths: number;
  switch (contractDuration) {
    case ContractDuration.OneYear: totalMonths = 12; break;
    case ContractDuration.SixMonths: totalMonths = 6; break;
    case ContractDuration.ThreeMonths: totalMonths = 3; break;
    default: totalMonths = 12;
  }

  let monthsPerPayment: number;
  switch (paymentCycle) {
    case PaymentCycle.Monthly: monthsPerPayment = 1; break;
    case PaymentCycle.Quarterly: monthsPerPayment = 3; break;
    case PaymentCycle.SemiAnnual: monthsPerPayment = 6; break;
    case PaymentCycle.Annual: monthsPerPayment = 12; break;
    default: monthsPerPayment = 1;
  }

  const numberOfPayments = Math.ceil(totalMonths / monthsPerPayment);
  const paymentAmount = Math.round((totalContractValue / numberOfPayments) * 100) / 100;

  // Handle rounding: last payment gets the remainder
  let remaining = totalContractValue;

  for (let i = 0; i < numberOfPayments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (i * monthsPerPayment));

    const isLast = i === numberOfPayments - 1;
    const amount = isLast ? remaining : paymentAmount;
    remaining -= paymentAmount;

    schedule.push({
      dueDate,
      amount: Math.round(amount * 100) / 100,
      status: PaymentStatus.Pending
    });
  }

  return schedule;
}

// --- DTOs ---

export interface CreateLeaseDto {
  buildingId: string;
  ownerId: string;
  renterId: string;
  unitId: string;
  startDate: Date;
  contractDuration: ContractDuration;
  paymentCycle: PaymentCycle;
  totalContractValue: number;
  depositAmount?: number;
  commissionPercentage: number;
  commissionDiscount?: number;
  createdByUserId?: string;
  createdByUserName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  ownerManagerName?: string;
  renterManagerName?: string;
}

export interface UpdateLeaseDto {
  status?: LeaseStatus;
  depositPaid?: boolean;
  commissionPaid?: boolean;
  assignedToUserId?: string;
  assignedToUserName?: string;
  totalContractValue?: number;
  paymentCycle?: PaymentCycle;
  paymentSchedule?: PaymentScheduleItem[];
}

// --- Helper: Send warning on a payment item ---
export function applyWarningToScheduleItem(
  item: PaymentScheduleItem,
  warningType: WarningType
): PaymentScheduleItem {
  const now = new Date();
  switch (warningType) {
    case WarningType.FirstWarning:
      return { ...item, warningFirstSentAt: now };
    case WarningType.SecondWarning:
      return { ...item, warningSecondSentAt: now };
    case WarningType.FinancialLetter:
      return { ...item, financialLetterSentAt: now };
    case WarningType.EvictionNotice:
      return { ...item, evictionNoticeSentAt: now };
    default:
      return item;
  }
}
