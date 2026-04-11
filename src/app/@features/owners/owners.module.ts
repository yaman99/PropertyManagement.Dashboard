import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { OwnersListComponent } from './owners-list/owners-list.component';
import { OwnerFormComponent } from './owner-form/owner-form.component';
import { OwnerDetailComponent } from './owner-detail/owner-detail.component';

const routes: Routes = [
  {
    path: '',
    component: OwnersListComponent
  },
  {
    path: 'new',
    component: OwnerFormComponent
  },
  {
    path: ':id',
    component: OwnerDetailComponent
  },
  {
    path: 'edit/:id',
    component: OwnerFormComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class OwnersModule { }
