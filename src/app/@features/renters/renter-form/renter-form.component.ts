import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Renter, RenterStatus } from '../../../@core/domain/models/renter.model';
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

  renterStatuses = Object.values(RenterStatus);

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.renterForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      nationalId: ['', [Validators.pattern(/^\d{10}$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
      email: ['', [Validators.email]],
      address: [''],
      employer: [''],
      emergencyContact: [''],
      emergencyPhone: ['', [Validators.pattern(/^05\d{8}$/)]],
      status: [RenterStatus.Active, Validators.required],
      notes: ['']
    });
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
      this.renterForm.patchValue(renter);
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
    const renterData: Renter = {
      ...this.renterForm.value,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.isEditMode && this.renterId) {
      this.store.dispatch(new RentersActions.UpdateRenter(this.renterId, renterData))
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
      this.store.dispatch(new RentersActions.CreateRenter(renterData))
        .subscribe({
          next: () => {
            // Get the created renter
            const renters = this.store.selectSnapshot(RentersState.renters);
            const createdRenter = renters[renters.length - 1];

            // Show credentials if account was created
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
    if (control?.hasError('email')) {
      return 'البريد الإلكتروني غير صحيح';
    }

    return '';
  }
}
