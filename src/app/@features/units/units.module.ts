import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { UnitsListComponent } from './units-list/units-list.component';
import { UnitFormComponent } from './unit-form/unit-form.component';

const routes: Routes = [
  {
    path: '',
    component: UnitsListComponent
  },
  {
    path: 'new',
    component: UnitFormComponent
  },
  {
    path: 'edit/:id',
    component: UnitFormComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class UnitsModule { }
