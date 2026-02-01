import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Inquiry, InquiryStatus } from '../../../@core/models/inquiry.model';
import { InquiriesState, LoadInquiries, DeleteInquiry, UpdateInquiry } from '../../../@core/state/inquiries.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../@shared/components/empty-state/empty-state.component';
import { AlertService } from '../../../@shared/services/alert.service';

@Component({
  selector: 'app-inquiries-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent
  ],
  templateUrl: './inquiries-list.component.html',
  styleUrls: ['./inquiries-list.component.scss']
})
export class InquiriesListComponent implements OnInit {
  inquiries$: Observable<Inquiry[]>;
  loading$: Observable<boolean>;

  InquiryStatus = InquiryStatus;

  statusFilter: InquiryStatus | 'All' = 'All';
  searchTerm = '';

  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.inquiries$ = this.store.select(InquiriesState.inquiries);
    this.loading$ = this.store.select(InquiriesState.loading);
  }

  ngOnInit(): void {
    this.store.dispatch(new LoadInquiries());
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

  getStatusClass(status: InquiryStatus): string {
    const classes: Record<InquiryStatus, string> = {
      [InquiryStatus.New]: 'bg-primary',
      [InquiryStatus.Contacted]: 'bg-info',
      [InquiryStatus.Qualified]: 'bg-success',
      [InquiryStatus.Rejected]: 'bg-danger',
      [InquiryStatus.Converted]: 'bg-success'
    };
    return classes[status];
  }

  async updateStatus(inquiry: Inquiry, newStatus: InquiryStatus): Promise<void> {
    try {
      await this.store.dispatch(new UpdateInquiry(inquiry.id, { status: newStatus })).toPromise();
      this.alertService.toastSuccess('تم تحديث حالة الاستفسار بنجاح');
    } catch (error) {
      this.alertService.toastError('فشل تحديث حالة الاستفسار');
    }
  }

  async deleteInquiry(inquiry: Inquiry): Promise<void> {
    const confirmed = await this.alertService.confirm({
      title: 'هل أنت متأكد؟',
      text: `سيتم حذف استفسار ${inquiry.fullName}`
    });

    if (confirmed) {
      try {
        await this.store.dispatch(new DeleteInquiry(inquiry.id)).toPromise();
        this.alertService.toastSuccess('تم حذف الاستفسار بنجاح');
      } catch (error) {
        this.alertService.toastError('فشل حذف الاستفسار');
      }
    }
  }
}
