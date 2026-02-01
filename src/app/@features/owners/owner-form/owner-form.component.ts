import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Owner, OwnerStatus } from '../../../@core/domain/models/owner.model';
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
      bankAccount: [''],
      status: [OwnerStatus.Active, Validators.required],
      notes: ['']
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
      this.ownerForm.patchValue(owner);
    } else {
      this.alertService.toastError('لم يتم العثور على المالك');
      this.router.navigate(['/app/owners']);
    }
  }

  async onSubmit() {
    if (this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      this.alertService.toastWarn('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    this.loading = true;
    const ownerData = this.ownerForm.value as Owner;

    if (this.isEditMode && this.ownerId) {
      // Update existing owner
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
      // Create new owner with account
      ownerData.createdAt = new Date();
      ownerData.updatedAt = new Date();

      this.store.dispatch(new OwnersActions.CreateOwner(ownerData))
        .subscribe({
          next: () => {
            // Get the created owner from state
            const owners = this.store.selectSnapshot(OwnersState.owners);
            const createdOwner = owners[owners.length - 1];

            // Show credentials modal for new owner
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

    if (control?.hasError('required')) {
      return 'هذا الحقل مطلوب';
    }
    if (control?.hasError('minlength')) {
      return `يجب أن يكون ${control.errors?.['minlength'].requiredLength} أحرف على الأقل`;
    }
    if (control?.hasError('pattern')) {
      if (fieldName === 'nationalId') return 'رقم الهوية يجب أن يكون 10 أرقام';
      if (fieldName === 'phone') return 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    }
    if (control?.hasError('email')) {
      return 'البريد الإلكتروني غير صحيح';
    }

    return '';
  }
}
