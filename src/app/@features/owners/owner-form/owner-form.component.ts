import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Owner, OwnerStatus, BANK_OPTIONS } from '../../../@core/domain/models/owner.model';
import { OwnersActions, OwnersState } from '../../../@core/state/owners.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../@shared/services/alert.service';

@Component({
  selector: 'app-owner-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent
  ],
  templateUrl: './owner-form.component.html',
  styleUrls: ['./owner-form.component.scss']
})
export class OwnerFormComponent implements OnInit {
  ownerForm: FormGroup;
  isEditMode = false;
  ownerId: string | null = null;
  loading = false;

  ownerStatuses = Object.values(OwnerStatus);
  bankOptions = BANK_OPTIONS;

  // Agency file preview
  agencyFilePreview: string | null = null;
  agencyFileName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.ownerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      nationalId: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
      email: ['', [Validators.email]],
      address: [''],
      status: [OwnerStatus.Active, Validators.required],
      notes: [''],

      // Independent flag
      isIndependent: [false],

      // Banking
      bankName: [''],
      accountHolderName: [''],
      bankAccount: [''],

      // Agency
      agencyNumber: [''],
      agencyExpiryDate: [''],
      agencyFileUrl: ['']
    });
  }

  ngOnInit() {
    this.ownerId = this.route.snapshot.paramMap.get('id');

    if (this.ownerId) {
      this.isEditMode = true;
      this.loadOwner(this.ownerId);
    }
  }

  loadOwner(id: string) {
    const owner = this.store.selectSnapshot(OwnersState.owners).find(o => o.id === id);

    if (owner) {
      this.ownerForm.patchValue({
        ...owner,
        agencyExpiryDate: owner.agencyExpiryDate
          ? new Date(owner.agencyExpiryDate).toISOString().split('T')[0]
          : ''
      });
      if (owner.agencyFileUrl) {
        this.agencyFilePreview = owner.agencyFileUrl;
        this.agencyFileName = 'ملف الوكالة';
      }
    } else {
      this.alertService.toastError('لم يتم العثور على المالك');
      this.router.navigate(['/app/owners']);
    }
  }

  onAgencyFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.alertService.toastWarn('يرجى اختيار ملف PDF فقط');
      return;
    }
    this.agencyFileName = file.name;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.agencyFilePreview = reader.result as string;
      this.ownerForm.patchValue({ agencyFileUrl: reader.result as string });
    };
  }

  removeAgencyFile() {
    this.agencyFilePreview = null;
    this.agencyFileName = null;
    this.ownerForm.patchValue({ agencyFileUrl: '' });
  }

  async onSubmit() {
    if (this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      this.alertService.toastWarn('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    this.loading = true;
    const formValue = this.ownerForm.value;
    const ownerData = {
      ...formValue,
      agencyExpiryDate: formValue.agencyExpiryDate ? new Date(formValue.agencyExpiryDate) : undefined
    } as Owner;

    if (this.isEditMode && this.ownerId) {
      this.store.dispatch(new OwnersActions.UpdateOwner(this.ownerId, ownerData))
        .subscribe({
          next: () => {
            this.alertService.toastSuccess('تم تحديث بيانات المالك بنجاح');
            this.router.navigate(['/app/owners']);
          },
          error: (error) => {
            this.alertService.toastError('فشل تحديث المالك: ' + error.message);
            this.loading = false;
          }
        });
    } else {
      ownerData.createdAt = new Date();
      ownerData.updatedAt = new Date();

      this.store.dispatch(new OwnersActions.CreateOwner(ownerData))
        .subscribe({
          next: () => {
            const owners = this.store.selectSnapshot(OwnersState.owners);
            const createdOwner = owners[owners.length - 1];

            if (createdOwner.hasAccount && createdOwner.tempPassword) {
              this.alertService.showCredentialsModal(
                createdOwner.username || '',
                createdOwner.tempPassword
              ).then(() => {
                this.router.navigate(['/app/owners']);
              });
            } else {
              this.alertService.toastSuccess('تم إضافة المالك بنجاح');
              this.router.navigate(['/app/owners']);
            }
          },
          error: (error) => {
            this.alertService.toastError('فشل إضافة المالك: ' + error.message);
            this.loading = false;
          }
        });
    }
  }

  cancel() {
    this.router.navigate(['/app/owners']);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.ownerForm.get(fieldName);

    if (control?.hasError('required')) return 'هذا الحقل مطلوب';
    if (control?.hasError('minlength'))
      return `يجب أن يكون ${control.errors?.['minlength'].requiredLength} أحرف على الأقل`;
    if (control?.hasError('pattern')) {
      if (fieldName === 'nationalId') return 'رقم الهوية يجب أن يكون 10 أرقام';
      if (fieldName === 'phone') return 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    }
    if (control?.hasError('email')) return 'البريد الإلكتروني غير صحيح';

    return '';
  }
}
