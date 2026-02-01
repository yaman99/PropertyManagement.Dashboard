import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./roles-list/roles-list.component').then(m => m.RolesListComponent)
  },
  {
    path: ':role',
    loadComponent: () => import('./role-permissions/role-permissions.component').then(m => m.RolePermissionsComponent)
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class RolesModule { }
