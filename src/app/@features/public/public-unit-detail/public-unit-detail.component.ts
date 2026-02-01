import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Unit, UnitType } from '../../../@core/domain/models/unit.model';
import { UnitsState, UnitsActions } from '../../../@core/state/units.state';
import { CreateInquiry } from '../../../@core/state/inquiries.state';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-public-unit-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './public-unit-detail.component.html',
  styleUrls: ['./public-unit-detail.component.scss']
})
export class PublicUnitDetailComponent implements OnInit {
  unit$: Observable<Unit | null>;
  inquiryForm: FormGroup;
  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private fb: FormBuilder
  ) {
    this.unit$ = this.store.select(UnitsState.selectedUnit);

    this.inquiryForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      nationality: [''],
      message: ['', Validators.required],
      preferredMoveInDate: [''],
      numberOfOccupants: [1]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.store.dispatch(new UnitsActions.SelectUnit(id));
    }
  }

  getUnitTypeLabel(type: UnitType): string {
    const labels: Record<UnitType, string> = {
      [UnitType.Apartment]: 'شقة',
      [UnitType.Villa]: 'فيلا',
      [UnitType.Office]: 'مكتب',
      [UnitType.Shop]: 'محل',
      [UnitType.Warehouse]: 'مستودع'
    };
    return labels[type];
  }

  async submitInquiry(unit: Unit): Promise<void> {
    if (this.inquiryForm.valid) {
      this.submitting = true;

      try {
        await this.store.dispatch(
          new CreateInquiry({
            ...this.inquiryForm.value,
            unitId: unit.id
          })
        ).toPromise();

        await Swal.fire({
          icon: 'success',
          title: 'تم إرسال الاستفسار بنجاح!',
          text: 'سنتواصل معك في أقرب وقت ممكن',
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#BC8545'
        });

        this.router.navigate(['/units']);
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'فشل إرسال الاستفسار',
          text: 'يرجى المحاولة مرة أخرى',
          confirmButtonText: 'حسناً',
          confirmButtonColor: '#BC8545'
        });
      } finally {
        this.submitting = false;
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'يرجى إكمال جميع الحقول المطلوبة',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#BC8545'
      });
    }
  }
}
