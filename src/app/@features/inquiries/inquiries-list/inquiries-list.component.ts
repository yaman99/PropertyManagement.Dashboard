import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, map } from 'rxjs';
import { Inquiry, InquiryStatus, PreferredPaymentCycle } from '../../../@core/models/inquiry.model';
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
  filteredInquiries$: Observable<Inquiry[]>;
  loading$: Observable<boolean>;

  InquiryStatus = InquiryStatus;
  PreferredPaymentCycle = PreferredPaymentCycle;

  // Filters
  statusFilter: InquiryStatus | 'All' = 'All';
  typeFilter: 'All' | 'General' | 'UnitSpecific' = 'All';
  paymentCycleFilter: PreferredPaymentCycle | 'All' = 'All';
  familyCountFilter: 'All' | '1' | '2-4' | '5+' = 'All';
  searchTerm = '';

  paymentCycles = [
    { value: 'All', label: 'كل الدفعات' },
    { value: PreferredPaymentCycle.Monthly, label: 'شهري' },
    { value: PreferredPaymentCycle.Quarterly, label: 'ربع سنوي' },
    { value: PreferredPaymentCycle.SemiAnnual, label: 'نصف سنوي' },
    { value: PreferredPaymentCycle.Annual, label: 'سنوي' }
  ];

  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.inquiries$ = this.store.select(InquiriesState.inquiries);
    this.loading$ = this.store.select(InquiriesState.loading);
    this.filteredInquiries$ = this.inquiries$;
  }

  ngOnInit(): void {
    this.store.dispatch(new LoadInquiries());
    this.applyFilters();
  }

  applyFilters() {
    this.filteredInquiries$ = this.inquiries$.pipe(
      map(inquiries => {
        let filtered = inquiries;

        // Search
        if (this.searchTerm) {
          const term = this.searchTerm.toLowerCase();
          filtered = filtered.filter(i =>
            i.fullName.toLowerCase().includes(term) ||
            i.phone.includes(term) ||
            (i.message && i.message.toLowerCase().includes(term))
          );
        }

        // Status filter
        if (this.statusFilter !== 'All') {
          filtered = filtered.filter(i => i.status === this.statusFilter);
        }

        // Type filter (general vs unit-specific)
        if (this.typeFilter === 'General') {
          filtered = filtered.filter(i => i.isGeneral);
        } else if (this.typeFilter === 'UnitSpecific') {
          filtered = filtered.filter(i => !i.isGeneral);
        }

        // Payment cycle filter (only applies to general inquiries)
        if (this.paymentCycleFilter !== 'All') {
          filtered = filtered.filter(i =>
            !i.isGeneral || i.preferredPaymentCycle === this.paymentCycleFilter
          );
        }

        // Family count filter
        if (this.familyCountFilter !== 'All') {
          filtered = filtered.filter(i => {
            const count = i.numberOfOccupants || 1;
            if (this.familyCountFilter === '1') return count === 1;
            if (this.familyCountFilter === '2-4') return count >= 2 && count <= 4;
            if (this.familyCountFilter === '5+') return count >= 5;
            return true;
          });
        }

        return filtered;
      })
    );
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.typeFilter = 'All';
    this.paymentCycleFilter = 'All';
    this.familyCountFilter = 'All';
    this.applyFilters();
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

  getPaymentCycleLabel(cycle: PreferredPaymentCycle): string {
    const labels: Record<PreferredPaymentCycle, string> = {
      [PreferredPaymentCycle.Monthly]: 'شهري',
      [PreferredPaymentCycle.Quarterly]: 'ربع سنوي',
      [PreferredPaymentCycle.SemiAnnual]: 'نصف سنوي',
      [PreferredPaymentCycle.Annual]: 'سنوي'
    };
    return labels[cycle] || cycle;
  }

  getUnitTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'Apartment': 'شقة',
      'Villa': 'فيلا',
      'Shop': 'محل',
      'Office': 'مكتب',
      'Warehouse': 'مستودع'
    };
    return labels[type] || type;
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
