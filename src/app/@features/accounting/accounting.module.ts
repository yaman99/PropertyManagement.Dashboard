import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./accounting-dashboard/accounting-dashboard.component').then(m => m.AccountingDashboardComponent)
  },
  {
    path: 'accounts',
    loadComponent: () => import('./accounts-list/accounts-list.component').then(m => m.AccountsListComponent)
  },
  {
    path: 'entries',
    loadComponent: () => import('./entries-list/entries-list.component').then(m => m.EntriesListComponent)
  },
  {
    path: 'entries/new',
    loadComponent: () => import('./entry-form/entry-form.component').then(m => m.EntryFormComponent)
  },
  {
    path: 'statement/:type/:id',
    loadComponent: () => import('./account-statement/account-statement.component').then(m => m.AccountStatementComponent)
  },
  {
    path: 'owner-balances',
    loadComponent: () => import('./owner-balances/owner-balances.component').then(m => m.OwnerBalancesComponent)
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class AccountingModule { }
