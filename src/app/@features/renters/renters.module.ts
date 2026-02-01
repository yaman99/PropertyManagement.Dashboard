import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { RentersListComponent } from './renters-list/renters-list.component';
import { RenterFormComponent } from './renter-form/renter-form.component';

const routes: Routes = [
  {
    path: '',
    component: RentersListComponent
  },
  {
    path: 'new',
    component: RenterFormComponent
  },
  {
    path: 'edit/:id',
    component: RenterFormComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class RentersModule { }
