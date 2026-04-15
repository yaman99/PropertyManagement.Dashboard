import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, map } from 'rxjs';
import {
  ContractDuration, PaymentCycle, CreateLeaseDto,
  getAllowedPaymentCycles, calculateEndDate, calculateCommission,
  generatePaymentSchedule, PaymentScheduleItem
} from '../../../@core/domain/models/lease.model';
import { Unit, UnitStatus } from '../../../@core/domain/models/unit.model';
import { Building } from '../../../@core/domain/models/building.model';
import { Renter } from '../../../@core/domain/models/renter.model';
import { Owner } from '../../../@core/domain/models/owner.model';
import { LeasesActions } from '../../../@core/state/leases.state';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { RentersActions, RentersState } from '../../../@core/state/renters.state';
import { OwnersActions, OwnersState } from '../../../@core/state/owners.state';
import { LoadBuildings, BuildingsState } from '../../../@core/state/buildings.state';
import { AuthState } from '../../../@core/state/auth.state';
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
    FormsModule,
    PageHeaderComponent
  ],
  templateUrl: './lease-wizard.component.html',
  styleUrls: ['./lease-wizard.component.scss']
})
export class LeaseWizardComponent implements OnInit {
  currentStep = 1;
  loading = false;

  steps: WizardStep[] = [
    { id: 1, title: 'اختيار المبنى والوحدة', icon: 'bi-building' },
    { id: 2, title: 'اختيار المستأجر', icon: 'bi-person' },
    { id: 3, title: 'تفاصيل العقد', icon: 'bi-file-earmark-text' },
    { id: 4, title: 'المراجعة والتأكيد', icon: 'bi-check-circle' }
  ];

  // Data
  buildings$: Observable<Building[]>;
  allUnits$: Observable<Unit[]>;
  availableRenters$: Observable<Renter[]>;
  owners$: Observable<Owner[]>;

  // Building-filtered units
  filteredUnits: Unit[] = [];

  selectedBuilding: Building | null = null;
  selectedUnit: Unit | null = null;
  selectedRenter: Renter | null = null;

  // Renter search
  renterSearchTerm = '';

  // Forms
  leaseForm: FormGroup;

  // Payment Schedule Preview
  paymentSchedulePreview: PaymentScheduleItem[] = [];

  // Allowed payment cycles (updates based on duration)
  allowedPaymentCycles: { value: PaymentCycle; label: string }[] = [];

  // Computed values
  calculatedEndDate = '';
  calculatedCommission = 0;
  paymentPerInstallment = 0;

  ContractDuration = ContractDuration;
  PaymentCycle = PaymentCycle;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private alertService: AlertService
  ) {
    this.buildings$ = this.store.select(BuildingsState.buildings);
    this.allUnits$ = this.store.select(UnitsState.units);
    this.availableRenters$ = this.store.select(RentersState.nonBlacklistedRenters);
    this.owners$ = this.store.select(OwnersState.owners);

    this.leaseForm = this.fb.group({
      contractDuration: [ContractDuration.OneYear, Validators.required],
      startDate: ['', Validators.required],
      paymentCycle: [PaymentCycle.Monthly, Validators.required],
      totalContractValue: [null, [Validators.required, Validators.min(1)]],
      depositAmount: [null],
      commissionPercentage: [2.5, [Validators.required, Validators.min(0)]],
      commissionDiscount: [0, [Validators.min(0)]],
      assignedToUserId: [''],
      assignedToUserName: ['']
    });
  }

  ngOnInit() {
    this.store.dispatch(new LoadBuildings());
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new RentersActions.LoadRenters());
    this.store.dispatch(new OwnersActions.LoadOwners());

    // Update allowed payment cycles when duration changes
    this.leaseForm.get('contractDuration')?.valueChanges.subscribe(duration => {
      this.updateAllowedPaymentCycles(duration);
      this.updateEndDate();
      this.updatePaymentSchedule();
    });

    this.leaseForm.get('startDate')?.valueChanges.subscribe(() => {
      this.updateEndDate();
      this.updatePaymentSchedule();
    });

    this.leaseForm.get('paymentCycle')?.valueChanges.subscribe(() => this.updatePaymentSchedule());
    this.leaseForm.get('totalContractValue')?.valueChanges.subscribe(() => {
      this.updateCommission();
      this.updatePaymentSchedule();
    });
    this.leaseForm.get('commissionPercentage')?.valueChanges.subscribe(() => this.updateCommission());
    this.leaseForm.get('commissionDiscount')?.valueChanges.subscribe(() => this.updateCommission());

    // Initialize allowed payment cycles
    this.updateAllowedPaymentCycles(ContractDuration.OneYear);
  }

  // --- Step 1: Building & Unit Selection ---

  selectBuilding(building: Building) {
    this.selectedBuilding = building;
    this.selectedUnit = null;

    // Filter available units for this building
    this.allUnits$.pipe(
      map(units => units.filter(u =>
        u.buildingId === building.id && u.status === UnitStatus.Available
      ))
    ).subscribe(units => {
      this.filteredUnits = units;
    });
  }

  selectUnit(unit: Unit) {
    this.selectedUnit = unit;
    // Pre-fill total contract value from unit rent price (annual)
    if (unit.rentPrice) {
      this.leaseForm.patchValue({ totalContractValue: unit.rentPrice * 12 });
    }
  }

  // --- Step 2: Renter Selection ---

  get filteredRenters$(): Observable<Renter[]> {
    return this.availableRenters$.pipe(
      map(renters => {
        if (!this.renterSearchTerm) return renters;
        const term = this.renterSearchTerm.toLowerCase();
        return renters.filter(r =>
          r.fullName.toLowerCase().includes(term) ||
          r.phone.includes(term) ||
          (r.nationalId && r.nationalId.includes(term))
        );
      })
    );
  }

  selectRenter(renter: Renter) {
    this.selectedRenter = renter;
  }

  // --- Step 3: Contract Details ---

  updateAllowedPaymentCycles(duration: ContractDuration) {
    const allowed = getAllowedPaymentCycles(duration);
    this.allowedPaymentCycles = allowed.map(cycle => ({
      value: cycle,
      label: this.getPaymentCycleLabel(cycle)
    }));

    // Reset to first allowed if current not in list
    const currentCycle = this.leaseForm.get('paymentCycle')?.value;
    if (!allowed.includes(currentCycle)) {
      this.leaseForm.patchValue({ paymentCycle: allowed[0] });
    }
  }

  updateEndDate() {
    const startDate = this.leaseForm.get('startDate')?.value;
    const duration = this.leaseForm.get('contractDuration')?.value;

    if (startDate && duration) {
      const endDate = calculateEndDate(new Date(startDate), duration);
      this.calculatedEndDate = endDate.toISOString().split('T')[0];
    }
  }

  updateCommission() {
    const totalValue = this.leaseForm.get('totalContractValue')?.value || 0;
    const percentage = this.leaseForm.get('commissionPercentage')?.value || 0;
    const discount = this.leaseForm.get('commissionDiscount')?.value || 0;
    this.calculatedCommission = calculateCommission(totalValue, percentage, discount);
  }

  updatePaymentSchedule() {
    const { startDate, totalContractValue, paymentCycle, contractDuration } = this.leaseForm.value;

    if (!startDate || !totalContractValue) {
      this.paymentSchedulePreview = [];
      this.paymentPerInstallment = 0;
      return;
    }

    this.paymentSchedulePreview = generatePaymentSchedule(
      new Date(startDate),
      totalContractValue,
      paymentCycle,
      contractDuration
    );

    this.paymentPerInstallment = this.paymentSchedulePreview.length > 0
      ? this.paymentSchedulePreview[0].amount
      : 0;
  }

  // --- Step 4: Review & Create ---

  nextStep() {
    if (this.canProceed()) {
      if (this.currentStep < this.steps.length) {
        this.currentStep++;
        if (this.currentStep === 4) {
          this.updatePaymentSchedule();
          this.updateCommission();
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
        return this.selectedBuilding !== null && this.selectedUnit !== null;
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
      'Quarterly': 'ربع سنوي (كل 3 أشهر)',
      'SemiAnnual': 'كل 6 أشهر',
      'Annual': 'سنوي (دفعة كاملة)'
    };
    return labels[cycle] || cycle;
  }

  getDurationLabel(duration: ContractDuration): string {
    const labels: Record<string, string> = {
      'OneYear': 'سنة',
      'SixMonths': '6 أشهر',
      'ThreeMonths': '3 أشهر'
    };
    return labels[duration] || duration;
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SA');
  }

  async createLease() {
    if (!this.selectedBuilding || !this.selectedUnit || !this.selectedRenter || this.leaseForm.invalid) {
      this.alertService.toastError('يرجى إكمال جميع الخطوات');
      return;
    }

    if (!this.selectedUnit.ownerId) {
      this.alertService.toastError('الوحدة المحددة ليس لها مالك');
      return;
    }

    this.loading = true;

    const formValue = this.leaseForm.value;

    // Get current user info
    const currentUser = this.store.selectSnapshot(AuthState.user);

    const leaseData: CreateLeaseDto = {
      buildingId: this.selectedBuilding.id,
      ownerId: this.selectedUnit.ownerId,
      renterId: this.selectedRenter.id,
      unitId: this.selectedUnit.id,
      startDate: new Date(formValue.startDate),
      contractDuration: formValue.contractDuration,
      paymentCycle: formValue.paymentCycle,
      totalContractValue: formValue.totalContractValue,
      depositAmount: formValue.depositAmount || 0,
      commissionPercentage: formValue.commissionPercentage,
      commissionDiscount: formValue.commissionDiscount || 0,
      createdByUserId: currentUser?.id,
      createdByUserName: currentUser?.username,
      assignedToUserId: formValue.assignedToUserId || currentUser?.id,
      assignedToUserName: formValue.assignedToUserName || currentUser?.username,
      ownerManagerName: this.selectedBuilding.ownerManagerName,
      renterManagerName: this.selectedBuilding.renterManagerName
    };

    this.store.dispatch(new LeasesActions.CreateLease(leaseData))
      .subscribe({
        next: () => {
          this.alertService.toastSuccess('تم إنشاء العقد بنجاح - العقد غير نشط حتى يتم دفع التأمين والعمولة');
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
