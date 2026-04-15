import { Routes } from '@angular/router';
import { authGuard } from './@core/guards';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/units',
    pathMatch: 'full'
  },
  // Public routes (no auth required)
  {
    path: 'units',
    loadComponent: () => import('./@features/public/public-units/public-units.component').then(m => m.PublicUnitsComponent)
  },
  {
    path: 'units/:id',
    loadComponent: () => import('./@features/public/public-unit-detail/public-unit-detail.component').then(m => m.PublicUnitDetailComponent)
  },
  {
    path: 'inquiry',
    loadComponent: () => import('./@features/public/general-inquiry/general-inquiry.component').then(m => m.GeneralInquiryComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./@features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'app',
    loadComponent: () => import('./@features/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./@features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'owners',
        loadChildren: () => import('./@features/owners/owners.module').then(m => m.OwnersModule)
      },
      {
        path: 'buildings',
        loadChildren: () => import('./@features/buildings/buildings.module').then(m => m.BuildingsModule)
      },
      {
        path: 'units',
        loadChildren: () => import('./@features/units/units.module').then(m => m.UnitsModule)
      },
      {
        path: 'renters',
        loadChildren: () => import('./@features/renters/renters.module').then(m => m.RentersModule)
      },
      {
        path: 'leases',
        loadChildren: () => import('./@features/leases/leases.module').then(m => m.LeasesModule)
      },
      {
        path: 'requests',
        loadChildren: () => import('./@features/requests/requests.module').then(m => m.RequestsModule)
      },
      {
        path: 'inquiries',
        loadComponent: () => import('./@features/inquiries/inquiries-list/inquiries-list.component').then(m => m.InquiriesListComponent)
      },
      {
        path: 'inquiries/:id',
        loadComponent: () => import('./@features/inquiries/inquiry-detail/inquiry-detail.component').then(m => m.InquiryDetailComponent)
      },
      {
        path: 'accounting',
        loadChildren: () => import('./@features/accounting/accounting.module').then(m => m.AccountingModule)
      },
      {
        path: 'admin/roles',
        loadChildren: () => import('./@features/admin/roles/roles.module').then(m => m.RolesModule)
      },
      {
        path: 'admin/settings',
        loadChildren: () => import('./@features/admin/settings/settings.module').then(m => m.SettingsModule)
      },
      {
        path: 'admin/users',
        loadChildren: () => import('./@features/admin/users/users.module').then(m => m.UsersModule)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/units'
  }
];

