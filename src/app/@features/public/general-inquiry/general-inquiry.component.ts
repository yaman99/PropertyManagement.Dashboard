import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { CreateInquiry } from '../../../@core/state/inquiries.state';
import { InquirySource, PreferredPaymentCycle } from '../../../@core/models/inquiry.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-general-inquiry',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './general-inquiry.component.html',
  styleUrls: ['./general-inquiry.component.scss']
})
export class GeneralInquiryComponent implements OnInit {
  inquiryForm: FormGroup;
  submitting = false;
  submitted = false;

  unitTypes = [
    { value: 'Apartment', label: 'شقة سكنية' },
    { value: 'Villa', label: 'فيلا' },
    { value: 'Shop', label: 'محل تجاري' },
    { value: 'Office', label: 'مكتب' },
    { value: 'Warehouse', label: 'مستودع' }
  ];

  paymentCycles = [
    { value: PreferredPaymentCycle.Monthly, label: 'شهري' },
    { value: PreferredPaymentCycle.Quarterly, label: 'ربع سنوي' },
    { value: PreferredPaymentCycle.SemiAnnual, label: 'نصف سنوي' },
    { value: PreferredPaymentCycle.Annual, label: 'سنوي (دفعة واحدة)' }
  ];

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    this.inquiryForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^05\d{8}$/)]],
      nationality: [''],
      preferredUnitType: ['', Validators.required],
      preferredPaymentCycle: ['', Validators.required],
      numberOfOccupants: [null, [Validators.min(1), Validators.max(20)]],
      numberOfRooms: [null, [Validators.min(1)]],
      budgetRange: [''],
      preferredDistrict: [''],
      preferredMoveInDate: [''],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {}

  get isMarried(): boolean {
    return (this.inquiryForm.get('numberOfOccupants')?.value || 0) > 1;
  }

  async onSubmit() {
    if (this.inquiryForm.invalid) {
      this.inquiryForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formValue = this.inquiryForm.value;

    const inquiryData = {
      isGeneral: true,
      fullName: formValue.fullName,
      phone: formValue.phone,
      nationality: formValue.nationality || undefined,
      preferredUnitType: formValue.preferredUnitType,
      preferredPaymentCycle: formValue.preferredPaymentCycle,
      numberOfOccupants: formValue.numberOfOccupants || undefined,
      numberOfRooms: formValue.numberOfRooms || undefined,
      budgetRange: formValue.budgetRange || undefined,
      preferredDistrict: formValue.preferredDistrict || undefined,
      preferredMoveInDate: formValue.preferredMoveInDate || undefined,
      message: formValue.message,
      source: InquirySource.GeneralForm
    };

    this.store.dispatch(new CreateInquiry(inquiryData)).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        Swal.fire({
          title: 'تم إرسال طلبك بنجاح!',
          text: 'سيتواصل معك فريقنا في أقرب وقت ممكن.',
          icon: 'success',
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#BC8545'
        });
        this.inquiryForm.reset();
      },
      error: () => {
        this.submitting = false;
        Swal.fire({
          title: 'حدث خطأ',
          text: 'لم نتمكن من إرسال طلبك، يرجى المحاولة مرة أخرى.',
          icon: 'error',
          confirmButtonColor: '#BC8545'
        });
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.inquiryForm.get(fieldName);
    if (control?.hasError('required')) return 'هذا الحقل مطلوب';
    if (control?.hasError('minlength')) {
      const min = control.errors?.['minlength'].requiredLength;
      return `يجب أن يكون ${min} أحرف على الأقل`;
    }
    if (control?.hasError('pattern') && (fieldName === 'phone')) {
      return 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    }
    return '';
  }
}
