import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { AuthState, AuthActions } from '../../@core/state/auth.state';
import { AlertService } from '../../@shared/services/alert.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  private store = inject(Store);
  private router = inject(Router);
  private alertService = inject(AlertService);

  user$ = this.store.select(AuthState.user);
  sidebarOpen = true;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  async logout(): Promise<void> {
    const confirmed = await this.alertService.confirm({
      title: 'تسجيل الخروج',
      text: 'هل أنت متأكد من تسجيل الخروج؟',
      icon: 'question',
      confirmButtonText: 'نعم، تسجيل الخروج',
      cancelButtonText: 'إلغاء'
    });

    if (confirmed) {
      this.store.dispatch(new AuthActions.Logout()).subscribe(() => {
        this.alertService.toastSuccess('تم تسجيل الخروج بنجاح');
        this.router.navigate(['/login']);
      });
    }
  }
}
