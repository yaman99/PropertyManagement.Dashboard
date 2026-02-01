import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, combineLatest, of, switchMap, map } from 'rxjs';
import { Store } from '@ngxs/store';
import { LedgerAccount, LedgerEntry } from '../../../@core/domain/models';
import { AccountingService } from '../../../@core/application/services/accounting.service';
import { OwnersState, OwnersActions } from '../../../@core/state/owners.state';
import { UnitsState, UnitsActions } from '../../../@core/state/units.state';
import { RentersState, RentersActions } from '../../../@core/state/renters.state';
import { Owner } from '../../../@core/domain/models/owner.model';
import { Unit } from '../../../@core/domain/models/unit.model';
import { Renter } from '../../../@core/domain/models/renter.model';
import { PageHeaderComponent } from '../../../@shared/components/page-header/page-header.component';

interface AccountStatement {
  account: LedgerAccount | null;
  entries: LedgerEntry[];
  entityName: string;
  entityType: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

@Component({
  selector: 'app-account-statement',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent],
  templateUrl: './account-statement.component.html',
  styleUrls: ['./account-statement.component.scss']
})
export class AccountStatementComponent implements OnInit {
  statement$!: Observable<AccountStatement>;
  entityType: string = '';
  entityId: string = '';

  owners$: Observable<Owner[]>;
  units$: Observable<Unit[]>;
  renters$: Observable<Renter[]>;

  constructor(
    private route: ActivatedRoute,
    private accountingService: AccountingService,
    private store: Store
  ) {
    this.owners$ = this.store.select(OwnersState.owners);
    this.units$ = this.store.select(UnitsState.units);
    this.renters$ = this.store.select(RentersState.renters);
  }

  ngOnInit() {
    // Load all entities
    this.store.dispatch([
      new OwnersActions.LoadOwners(),
      new UnitsActions.LoadUnits(),
      new RentersActions.LoadRenters()
    ]);

    this.route.params.subscribe(params => {
      this.entityType = params['type']; // 'owner', 'unit', 'renter'
      this.entityId = params['id'];
      this.loadStatement();
    });
  }

  private loadStatement() {
    let accountFinder$: Observable<LedgerAccount | undefined>;
    let entityName$: Observable<string>;

    switch (this.entityType) {
      case 'owner':
        accountFinder$ = this.accountingService.getAccountByOwnerId(this.entityId);
        entityName$ = this.owners$.pipe(
          map(owners => owners.find(o => o.id === this.entityId)?.fullName || 'غير معروف')
        );
        break;
      case 'unit':
        accountFinder$ = this.accountingService.getAccountByUnitId(this.entityId);
        entityName$ = this.units$.pipe(
          map(units => units.find(u => u.id === this.entityId)?.unitCode || 'غير معروف')
        );
        break;
      case 'renter':
        accountFinder$ = this.accountingService.getAccountByRenterId(this.entityId);
        entityName$ = this.renters$.pipe(
          map(renters => renters.find(r => r.id === this.entityId)?.fullName || 'غير معروف')
        );
        break;
      default:
        accountFinder$ = of(undefined);
        entityName$ = of('غير معروف');
    }

    this.statement$ = combineLatest([accountFinder$, entityName$]).pipe(
      switchMap(([account, entityName]) => {
        if (!account) {
          return of({
            account: null,
            entries: [],
            entityName,
            entityType: this.getEntityTypeLabel(),
            totalDebit: 0,
            totalCredit: 0,
            balance: 0
          });
        }

        return this.accountingService.getEntriesByAccountId(account.id).pipe(
          map(entries => {
            const sortedEntries = entries.sort((a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
            const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

            return {
              account,
              entries: sortedEntries,
              entityName,
              entityType: this.getEntityTypeLabel(),
              totalDebit,
              totalCredit,
              balance: account.balance
            };
          })
        );
      })
    );
  }

  getEntityTypeLabel(): string {
    const labels: Record<string, string> = {
      'owner': 'المالك',
      'unit': 'الوحدة',
      'renter': 'المستأجر'
    };
    return labels[this.entityType] || this.entityType;
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-SA');
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 });
  }

  getBackLink(): string {
    switch (this.entityType) {
      case 'owner': return '/app/owners';
      case 'unit': return '/app/units';
      case 'renter': return '/app/renters';
      default: return '/app/accounting';
    }
  }
}
