import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { LedgerAccount, CreateLedgerEntryDto } from '../../../@core/domain/models/accounting.model';
import { AlertService } from '../../../@shared/services/alert.service';
import { AccountingService } from '../../../@core/application/services/accounting.service';

@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent
  ],
  templateUrl: './entry-form.component.html',
  styleUrls: ['./entry-form.component.scss']
})
export class EntryFormComponent implements OnInit {
  private accountingService = inject(AccountingService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  entryForm: FormGroup;
  loading = false;

  accounts: LedgerAccount[] = [];

  constructor() {
    this.entryForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      accountId: ['', Validators.required],
      type: ['debit', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      note: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    this.accountingService.getAllAccounts().subscribe(accounts => {
      this.accounts = accounts;
    });
  }

  async onSubmit() {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      this.alertService.toastWarn('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    this.loading = true;
    const formValue = this.entryForm.value;

    const dto: CreateLedgerEntryDto = {
      accountId: formValue.accountId,
      date: new Date(formValue.date),
      debit: formValue.type === 'debit' ? formValue.amount : 0,
      credit: formValue.type === 'credit' ? formValue.amount : 0,
      note: formValue.note
    };

    this.accountingService.createEntry(dto).subscribe({
      next: () => {
        this.loading = false;
        this.alertService.toastSuccess('تم إضافة القيد بنجاح');
        this.router.navigate(['/app/accounting/entries']);
      },
      error: () => {
        this.loading = false;
        this.alertService.toastError('فشل إضافة القيد');
      }
    });
  }

  cancel() {
    this.router.navigate(['/app/accounting/entries']);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.entryForm.get(fieldName);

    if (control?.hasError('required')) {
      return 'هذا الحقل مطلوب';
    }
    if (control?.hasError('minlength')) {
      return `يجب أن يكون ${control.errors?.['minlength'].requiredLength} أحرف على الأقل`;
    }
    if (control?.hasError('min')) {
      return 'القيمة يجب أن تكون أكبر من صفر';
    }

    return '';
  }
}
