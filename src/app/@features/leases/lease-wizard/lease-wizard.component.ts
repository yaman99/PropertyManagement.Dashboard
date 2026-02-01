import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable, map } from 'rxjs';
import { Lease, LeaseStatus, PaymentCycle, PaymentStatus, PaymentScheduleItem } from '../../../@core/domain/models/lease.model';
import { Unit, UnitStatus } from '../../../@core/domain/models/unit.model';
import { Renter, RenterStatus } from '../../../@core/domain/models/renter.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { LeasesActions } from '../../../@core/state/leases.state';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { RentersActions, RentersState } from '../../../@core/state/renters.state';
import { OwnersActions, OwnersState } from '../../../@core/state/owners.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../@shared/services/alert.service';

interface WizardStep {
  id: number;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-lease-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent
  ],
  templateUrl: './lease-wizard.component.html',
  styleUrls: ['./lease-wizard.component.scss']
})
export class LeaseWizardComponent implements OnInit {
  currentStep = 1;
  loading = false;

  steps: WizardStep[] = [
    { id: 1, title: 'اختيار الوحدة', icon: '🏢' },
    { id: 2, title: 'اختيار المستأجر', icon: '👤' },
    { id: 3, title: 'تفاصيل العقد', icon: '📋' },
    { id: 4, title: 'المراجعة والتأكيد', icon: '✅' }
  ];

  // Data
  availableUnits$: Observable<Unit[]>;
  activeRenters$: Observable<Renter[]>;
  owners$: Observable<Owner[]>;

  selectedUnit: Unit | null = null;
  selectedRenter: Renter | null = null;

  // Forms
  leaseForm: FormGroup;

  // Payment Schedule Preview
  paymentSchedulePreview: PaymentScheduleItem[] = [];

  PaymentCycle = PaymentCycle;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private alertService: AlertService
  ) {
    this.availableUnits$ = this.store.select(UnitsState.units).pipe(
      map(units => units.filter(u => u.status === UnitStatus.Available))
    );

    this.activeRenters$ = this.store.select(RentersState.renters).pipe(
      map(renters => renters.filter(r => r.status === RenterStatus.Active))
    );

    this.owners$ = this.store.select(OwnersState.owners);

    this.leaseForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      paymentCycle: [PaymentCycle.Monthly, Validators.required],
      rentAmount: [null, [Validators.required, Validators.min(1)]],
      depositAmount: [null],
      dueDayOfMonth: [1, [Validators.min(1), Validators.max(28)]]
    });
  }

  ngOnInit() {
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new RentersActions.LoadRenters());
    this.store.dispatch(new OwnersActions.LoadOwners());

    // Update rent amount when unit is selected
    this.leaseForm.get('startDate')?.valueChanges.subscribe(() => this.updatePaymentSchedule());
    this.leaseForm.get('endDate')?.valueChanges.subscribe(() => this.updatePaymentSchedule());
    this.leaseForm.get('paymentCycle')?.valueChanges.subscribe(() => this.updatePaymentSchedule());
    this.leaseForm.get('rentAmount')?.valueChanges.subscribe(() => this.updatePaymentSchedule());
    this.leaseForm.get('dueDayOfMonth')?.valueChanges.subscribe(() => this.updatePaymentSchedule());
  }

  selectUnit(unit: Unit) {
    this.selectedUnit = unit;
    // Pre-fill rent amount from unit
    this.leaseForm.patchValue({ rentAmount: unit.rentPrice });
  }

  selectRenter(renter: Renter) {
    this.selectedRenter = renter;
  }

  nextStep() {
    if (this.canProceed()) {
      if (this.currentStep < this.steps.length) {
        this.currentStep++;

        // Generate payment schedule on step 4
        if (this.currentStep === 4) {
          this.updatePaymentSchedule();
        }
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.selectedUnit !== null;
      case 2:
        return this.selectedRenter !== null;
      case 3:
        return this.leaseForm.valid;
      default:
        return true;
    }
  }

  getOwnerName(ownerId: string): Observable<string> {
    return this.owners$.pipe(
      map(owners => {
        const owner = owners.find(o => o.id === ownerId);
        return owner?.fullName || 'غير معروف';
      })
    );
  }

  getUnitTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'Apartment': 'شقة',
      'Villa': 'فيلا',
      'Office': 'مكتب',
      'Shop': 'محل',
      'Warehouse': 'مستودع'
    };
    return labels[type] || type;
  }

  getPaymentCycleLabel(cycle: PaymentCycle): string {
    const labels: Record<string, string> = {
      'Monthly': 'شهري',
      'Quarterly': 'ربع سنوي',
      'Yearly': 'سنوي'
    };
    return labels[cycle] || cycle;
  }

  updatePaymentSchedule() {
    const { startDate, endDate, paymentCycle, rentAmount, dueDayOfMonth } = this.leaseForm.value;

    if (!startDate || !endDate || !rentAmount) {
      this.paymentSchedulePreview = [];
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const schedule: PaymentScheduleItem[] = [];

    let monthsIncrement = 1;
    switch (paymentCycle) {
      case PaymentCycle.Quarterly:
        monthsIncrement = 3;
        break;
      case PaymentCycle.Yearly:
        monthsIncrement = 12;
        break;
    }

    let current = new Date(start);
    current.setDate(dueDayOfMonth || 1);

    while (current <= end) {
      schedule.push({
        dueDate: new Date(current),
        amount: rentAmount,
        status: PaymentStatus.Pending
      });

      current.setMonth(current.getMonth() + monthsIncrement);
    }

    this.paymentSchedulePreview = schedule;
  }

  getTotalAmount(): number {
    return this.paymentSchedulePreview.reduce((sum, item) => sum + item.amount, 0);
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  }

  async createLease() {
    if (!this.selectedUnit || !this.selectedRenter || this.leaseForm.invalid) {
      this.alertService.toastError('يرجى إكمال جميع الخطوات');
      return;
    }

    if (!this.selectedUnit.ownerId) {
      this.alertService.toastError('الوحدة المحددة ليس لها مالك');
      return;
    }

    this.loading = true;

    const formValue = this.leaseForm.value;

    const leaseData: Lease = {
      id: '',
      ownerId: this.selectedUnit.ownerId,
      renterId: this.selectedRenter.id,
      unitId: this.selectedUnit.id,
      startDate: new Date(formValue.startDate),
      endDate: new Date(formValue.endDate),
      paymentCycle: formValue.paymentCycle,
      rentAmount: formValue.rentAmount,
      depositAmount: formValue.depositAmount || 0,
      dueDayOfMonth: formValue.dueDayOfMonth,
      status: LeaseStatus.Active,
      paymentSchedule: this.paymentSchedulePreview,
      renterAccountId: '', // Will be created with accounting module
      unitLedgerAccountId: this.selectedUnit.ledgerAccountId || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.store.dispatch(new LeasesActions.CreateLease(leaseData))
      .subscribe({
        next: () => {
          this.alertService.toastSuccess('تم إنشاء العقد بنجاح وتم حجز الوحدة');
          this.router.navigate(['/app/leases']);
        },
        error: (error) => {
          this.alertService.toastError('فشل إنشاء العقد: ' + error.message);
          this.loading = false;
        }
      });
  }

  cancel() {
    this.router.navigate(['/app/leases']);
  }
}
