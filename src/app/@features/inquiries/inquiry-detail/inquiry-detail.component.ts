import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Inquiry, InquiryStatus } from '../../../@core/models/inquiry.model';
import { InquiriesState, LoadInquiryById, UpdateInquiry } from '../../../@core/state/inquiries.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../@shared/services/alert.service';

@Component({
  selector: 'app-inquiry-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    PageHeaderComponent
  ],
  templateUrl: './inquiry-detail.component.html',
  styleUrls: ['./inquiry-detail.component.scss']
})
export class InquiryDetailComponent implements OnInit {
  inquiry$: Observable<Inquiry | null>;
  form: FormGroup;
  InquiryStatus = InquiryStatus;

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {
    this.inquiry$ = this.store.select(InquiriesState.selectedInquiry);
    this.form = this.fb.group({
      status: [''],
      adminNotes: [''],
      assignedTo: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.store.dispatch(new LoadInquiryById(id));

      this.inquiry$.subscribe(inquiry => {
        if (inquiry) {
          this.form.patchValue({
            status: inquiry.status,
            adminNotes: inquiry.adminNotes || '',
            assignedTo: inquiry.assignedTo || ''
          });
        }
      });
    }
  }

  getStatusLabel(status: InquiryStatus): string {
    const labels: Record<InquiryStatus, string> = {
      [InquiryStatus.New]: 'جديد',
      [InquiryStatus.Contacted]: 'تم التواصل',
      [InquiryStatus.Qualified]: 'مؤهل',
      [InquiryStatus.Rejected]: 'مرفوض',
      [InquiryStatus.Converted]: 'تم التحويل'
    };
    return labels[status];
  }

  async saveChanges(inquiry: Inquiry): Promise<void> {
    if (this.form.valid) {
      try {
        await this.store.dispatch(
          new UpdateInquiry(inquiry.id, this.form.value)
        ).toPromise();
        this.alertService.toastSuccess('تم حفظ التغييرات بنجاح');
      } catch (error) {
        this.alertService.toastError('فشل حفظ التغييرات');
      }
    }
  }
}
