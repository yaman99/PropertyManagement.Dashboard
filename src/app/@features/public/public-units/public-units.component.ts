import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Unit, UnitStatus, UnitType } from '../../../@core/domain/models/unit.model';
import { UnitsState, UnitsActions } from '../../../@core/state/units.state';

@Component({
  selector: 'app-public-units',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './public-units.component.html',
  styleUrls: ['./public-units.component.scss']
})
export class PublicUnitsComponent implements OnInit {
  units$: Observable<Unit[]>;

  UnitType = UnitType;
  searchTerm = '';
  typeFilter: UnitType | 'All' = 'All';
  minPrice = 0;
  maxPrice = 100000;

  constructor(private store: Store) {
    // Only show published and available units on public page
    this.units$ = this.store.select(UnitsState.units).pipe(
      map(units => units.filter(u => u.status === UnitStatus.Available && u.isPublished))
    );
  }

  ngOnInit(): void {
    this.store.dispatch(new UnitsActions.LoadUnits());
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
}
