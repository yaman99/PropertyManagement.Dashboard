import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Renter, RenterIdType, MaritalStatus, CreateRenterDto } from '../../../@core/domain/models/renter.model';
import { RentersActions, RentersState } from '../../../@core/state/renters.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../@shared/services/alert.service';

@Component({
  selector: 'app-renter-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent
  ],
  templateUrl: './renter-form.component.html',
  styleUrls: ['./renter-form.component.scss']
})
export class RenterFormComponent implements OnInit {
  renterForm: FormGroup;
  isEditMode = false;
  renterId: string | null = null;
  loading = false;

  idTypes = [
    { value: RenterIdType.Identity,          label: 'هوية وطنية' },
    { value: RenterIdType.Residency,         label: 'إقامة' },
    { value: RenterIdType.PremiumResidency,  label: 'إقامة مميزة' },
    { value: RenterIdType.GCC,               label: 'دول مجلس التعاون الخليجي' },
    { value: RenterIdType.CommercialRecord,  label: 'سجل تجاري' }
  ];

  maritalStatuses = [
    { value: MaritalStatus.Single,  label: 'أعزب' },
    { value: MaritalStatus.Married, label: 'متزوج' }
  ];

  RenterIdType = RenterIdType;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.renterForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
      idType: [RenterIdType.Identity, Validators.required],
      nationalId: [''],
      idExpiryDate: [''],
      nationality: [''],
      birthDate: [''],

      // Commercial Registration fields (shown only when idType = CommercialRecord)
      representativeId: [''],
      commercialRecordExpiryDate: [''],
      representativeName: [''],
      representativeBirthDate: [''],

      maritalStatus: [null],
      familyMemberCount: [null],
      employer: [''],
      emergencyContact: [''],
      emergencyPhone: ['', [Validators.pattern(/^05\d{8}$/)]],
      notes: ['']
    });

    // Show/hide family count
    this.renterForm.get('maritalStatus')?.valueChanges.subscribe(status => {
      if (status === MaritalStatus.Married) {
        this.renterForm.get('familyMemberCount')?.enable();
      } else {
        this.renterForm.get('familyMemberCount')?.setValue(null);
        this.renterForm.get('familyMemberCount')?.disable();
      }
    });
  }

  get isMarried(): boolean {
    return this.renterForm.get('maritalStatus')?.value === MaritalStatus.Married;
  }

  get isCommercialRecord(): boolean {
    return this.renterForm.get('idType')?.value === RenterIdType.CommercialRecord;
  }

  get currentIdType(): RenterIdType {
    return this.renterForm.get('idType')?.value;
  }

  getIdLabel(): string {
    const labels: Record<string, string> = {
      [RenterIdType.Identity]:          'رقم الهوية الوطنية',
      [RenterIdType.Residency]:         'رقم الإقامة',
      [RenterIdType.PremiumResidency]:  'رقم الإقامة المميزة',
      [RenterIdType.GCC]:               'رقم الوثيقة',
      [RenterIdType.CommercialRecord]:  'رقم السجل التجاري'
    };
    return labels[this.currentIdType] || 'رقم الوثيقة';
  }

  ngOnInit() {
    this.renterId = this.route.snapshot.paramMap.get('id');

    if (this.renterId) {
      this.isEditMode = true;
      this.loadRenter(this.renterId);
    }
  }

  loadRenter(id: string) {
    const renter = this.store.selectSnapshot(RentersState.renters).find(r => r.id === id);

    if (renter) {
      this.renterForm.patchValue({
        ...renter,
        birthDate: renter.birthDate ? this.formatDateStr(renter.birthDate) : '',
        idExpiryDate: renter.idExpiryDate ? this.formatDateStr(renter.idExpiryDate) : '',
        commercialRecordExpiryDate: renter.commercialRecordExpiryDate ? this.formatDateStr(renter.commercialRecordExpiryDate) : '',
        representativeBirthDate: renter.representativeBirthDate ? this.formatDateStr(renter.representativeBirthDate) : ''
      });
      if (renter.maritalStatus === MaritalStatus.Married) {
        this.renterForm.get('familyMemberCount')?.enable();
      }
    } else {
      this.alertService.toastError('لم يتم العثور على المستأجر');
      this.router.navigate(['/app/renters']);
    }
  }

  async onSubmit() {
    if (this.renterForm.invalid) {
      this.renterForm.markAllAsTouched();
      this.alertService.toastWarn('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    this.loading = true;
    const formValue = this.renterForm.getRawValue();

    const parseDate = (v: string) => v ? new Date(v) : undefined;

    if (this.isEditMode && this.renterId) {
      const updateData = {
        ...formValue,
        birthDate: parseDate(formValue.birthDate),
        idExpiryDate: parseDate(formValue.idExpiryDate),
        commercialRecordExpiryDate: parseDate(formValue.commercialRecordExpiryDate),
        representativeBirthDate: parseDate(formValue.representativeBirthDate),
        familyMemberCount: this.isMarried ? formValue.familyMemberCount : undefined
      };

      this.store.dispatch(new RentersActions.UpdateRenter(this.renterId, updateData))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم تحديث بيانات المستأجر بنجاح');
            this.router.navigate(['/app/renters']);
          },
          error: (error) => {
            this.alertService.toastError('فشل تحديث المستأجر: ' + error.message);
            this.loading = false;
          }
        });
    } else {
      const createData: CreateRenterDto = {
        ...formValue,
        birthDate: parseDate(formValue.birthDate),
        idExpiryDate: parseDate(formValue.idExpiryDate),
        commercialRecordExpiryDate: this.isCommercialRecord ? parseDate(formValue.commercialRecordExpiryDate) : undefined,
        representativeBirthDate: this.isCommercialRecord ? parseDate(formValue.representativeBirthDate) : undefined,
        representativeId: this.isCommercialRecord ? formValue.representativeId : undefined,
        representativeName: this.isCommercialRecord ? formValue.representativeName : undefined,
        familyMemberCount: this.isMarried ? formValue.familyMemberCount : undefined,
        hasAccount: true
      };

      this.store.dispatch(new RentersActions.CreateRenter(createData))
        .subscribe({
          next: () => {
            const renters = this.store.selectSnapshot(RentersState.renters);
            const createdRenter = renters[renters.length - 1];

            if (createdRenter.hasAccount && createdRenter.tempPassword) {
              this.alertService.showCredentialsModal(
                createdRenter.username || '',
                createdRenter.tempPassword
              ).then(() => {
                this.router.navigate(['/app/renters']);
              });
            } else {
              this.alertService.toastSuccess('تم إضافة المستأجر بنجاح');
              this.router.navigate(['/app/renters']);
            }
          },
          error: (error) => {
            this.alertService.toastError('فشل إضافة المستأجر: ' + error.message);
            this.loading = false;
          }
        });
    }
  }

  cancel() {
    this.router.navigate(['/app/renters']);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.renterForm.get(fieldName);
    if (control?.hasError('required')) return 'هذا الحقل مطلوب';
    if (control?.hasError('minlength'))
      return `يجب أن يكون ${control.errors?.['minlength'].requiredLength} أحرف على الأقل`;
    if (control?.hasError('pattern')) {
      if (fieldName === 'phone' || fieldName === 'emergencyPhone')
        return 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    }
    return '';
  }

  private formatDateStr(date: Date | string): string {
    return new Date(date).toISOString().split('T')[0];
  }
}
