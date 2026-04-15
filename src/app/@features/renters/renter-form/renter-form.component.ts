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
    { value: RenterIdType.Identity, label: 'هوية وطنية' },
    { value: RenterIdType.Residency, label: 'إقامة' },
    { value: RenterIdType.CommercialRecord, label: 'سجل تجاري' }
  ];

  maritalStatuses = [
    { value: MaritalStatus.Single, label: 'أعزب' },
    { value: MaritalStatus.Married, label: 'متزوج' }
  ];

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
      nationalId: ['', [Validators.pattern(/^\d{10}$/)]],
      nationality: [''],
      birthDate: [''],
      maritalStatus: [null],
      familyMemberCount: [null],
      employer: [''],
      emergencyContact: [''],
      emergencyPhone: ['', [Validators.pattern(/^05\d{8}$/)]],
      notes: ['']
    });

    // Listen to maritalStatus changes to show/hide familyMemberCount
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
        birthDate: renter.birthDate ? this.formatDate(renter.birthDate) : ''
      });
      // Trigger maritalStatus change to enable/disable familyMemberCount
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

    if (this.isEditMode && this.renterId) {
      const updateData = {
        ...formValue,
        birthDate: formValue.birthDate ? new Date(formValue.birthDate) : undefined,
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
        birthDate: formValue.birthDate ? new Date(formValue.birthDate) : undefined,
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

    if (control?.hasError('required')) {
      return 'هذا الحقل مطلوب';
    }
    if (control?.hasError('minlength')) {
      return `يجب أن يكون ${control.errors?.['minlength'].requiredLength} أحرف على الأقل`;
    }
    if (control?.hasError('pattern')) {
      if (fieldName === 'nationalId') return 'رقم الهوية يجب أن يكون 10 أرقام';
      if (fieldName === 'phone' || fieldName === 'emergencyPhone') return 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    }

    return '';
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
}
