import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./requests-list/requests-list.component').then(m => m.RequestsListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./request-form/request-form.component').then(m => m.RequestFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./request-detail/request-detail.component').then(m => m.RequestDetailComponent)
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class RequestsModule { }
