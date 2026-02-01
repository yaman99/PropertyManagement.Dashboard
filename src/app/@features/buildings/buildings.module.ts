import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { BuildingsListComponent } from './buildings-list/buildings-list.component';
import { BuildingFormComponent } from './building-form/building-form.component';

const routes: Routes = [
  {
    path: '',
    component: BuildingsListComponent
  },
  {
    path: 'new',
    component: BuildingFormComponent
  },
  {
    path: 'edit/:id',
    component: BuildingFormComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class BuildingsModule { }
