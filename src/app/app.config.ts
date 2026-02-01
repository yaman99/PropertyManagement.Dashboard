import { ApplicationConfig, provideBrowserGlobalErrorListeners, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NgxsModule } from '@ngxs/store';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';

import { routes } from './app.routes';
import { AuthState } from './@core/state/auth.state';
import { OwnersState } from './@core/state/owners.state';
import { UnitsState } from './@core/state/units.state';
import { RentersState } from './@core/state/renters.state';
import { LeasesState } from './@core/state/leases.state';
import { BuildingsState } from './@core/state/buildings.state';
import { InquiriesState } from './@core/state/inquiries.state';
import { InquiriesRepository } from './@core/repositories/inquiries.repository';
import { InquiriesLocalStorageRepository } from './@core/repositories/inquiries-local-storage.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: InquiriesRepository, useClass: InquiriesLocalStorageRepository },
    importProvidersFrom(
      NgxsModule.forRoot([
        AuthState,
        OwnersState,
        UnitsState,
        RentersState,
        LeasesState,
        BuildingsState,
        InquiriesState
      ], {
        developmentMode: true
      }),
      NgxsLoggerPluginModule.forRoot(),
      NgxsStoragePluginModule.forRoot({
        keys: ['auth']
      })
    )
  ]
};


