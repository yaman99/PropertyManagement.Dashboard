import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Request, RequestCategory, RequestPriority, RequestStatus } from '../../../@core/domain/models/request.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { Renter } from '../../../@core/domain/models/renter.model';
import { Lease, LeaseStatus } from '../../../@core/domain/models/lease.model';
import { UnitsActions, UnitsState } from '../../../@core/state/units.state';
import { RentersActions, RentersState } from '../../../@core/state/renters.state';
import { LeasesActions, LeasesState } from '../../../@core/state/leases.state';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../@shared/services/alert.service';

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeaderComponent
  ],
  templateUrl: './request-form.component.html',
  styleUrls: ['./request-form.component.scss']
})
export class RequestFormComponent implements OnInit {
  requestForm: FormGroup;
  loading = false;

  units$: Observable<Unit[]>;
  renters$: Observable<Renter[]>;
  leases$: Observable<Lease[]>;

  categories = Object.values(RequestCategory);
  priorities = Object.values(RequestPriority);

  photos: string[] = [];

  private readonly STORAGE_KEY = 'requests';

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService
  ) {
    this.units$ = this.store.select(UnitsState.units);
    this.renters$ = this.store.select(RentersState.renters);
    this.leases$ = this.store.select(LeasesState.leases);

    this.requestForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      category: [RequestCategory.Maintenance, Validators.required],
      priority: [RequestPriority.Medium, Validators.required],
      unitId: [''],
      renterId: [''],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit() {
    this.store.dispatch(new UnitsActions.LoadUnits());
    this.store.dispatch(new RentersActions.LoadRenters());
    this.store.dispatch(new LeasesActions.LoadLeases());
  }

  getCategoryLabel(category: RequestCategory): string {
    const labels: Record<string, string> = {
      'Maintenance': 'صيانة عامة',
      'Plumbing': 'سباكة',
      'Electrical': 'كهرباء',
      'HVAC': 'تكييف',
      'Cleaning': 'نظافة',
      'Security': 'أمن',
      'Other': 'أخرى'
    };
    return labels[category] || category;
  }

  getPriorityLabel(priority: RequestPriority): string {
    const labels: Record<string, string> = {
      'Low': 'منخفضة',
      'Medium': 'متوسطة',
      'High': 'عالية',
      'Urgent': 'عاجلة'
    };
    return labels[priority] || priority;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            this.photos.push(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  removePhoto(index: number) {
    this.photos.splice(index, 1);
  }

  async onSubmit() {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      this.alertService.toastWarn('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    this.loading = true;
    const formValue = this.requestForm.value;

    const newRequest: Request = {
      id: 'REQ-' + Date.now(),
      createdByRole: 'Admin',
      ...formValue,
      status: RequestStatus.New,
      photos: this.photos,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to localStorage
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const requests: Request[] = stored ? JSON.parse(stored) : [];
    requests.unshift(newRequest);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));

    this.alertService.toastSuccess('تم إنشاء الطلب بنجاح');
    this.router.navigate(['/app/requests']);
  }

  cancel() {
    this.router.navigate(['/app/requests']);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.requestForm.get(fieldName);

    if (control?.hasError('required')) {
      return 'هذا الحقل مطلوب';
    }
    if (control?.hasError('minlength')) {
      return `يجب أن يكون ${control.errors?.['minlength'].requiredLength} أحرف على الأقل`;
    }

    return '';
  }
}
