import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./leases-list/leases-list.component').then(m => m.LeasesListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./lease-wizard/lease-wizard.component').then(m => m.LeaseWizardComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./lease-detail/lease-detail.component').then(m => m.LeaseDetailComponent)
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class LeasesModule { }
