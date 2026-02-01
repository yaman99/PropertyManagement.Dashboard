import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { AuthActions, AuthState } from '../../@core/state/auth.state';
import { AlertService } from '../../@shared/services/alert.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private router = inject(Router);
  private alertService = inject(AlertService);

  loginForm: FormGroup;
  loading$ = this.store.select(AuthState.loading);

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.alertService.toastError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    const { username, password } = this.loginForm.value;

    this.store.dispatch(new AuthActions.Login(username, password)).subscribe({
      next: () => {
        this.alertService.toastSuccess('تم تسجيل الدخول بنجاح');
        this.router.navigate(['/app/dashboard']);
      },
      error: (error) => {
        this.alertService.toastError(error.message || 'فشل تسجيل الدخول');
      }
    });
  }
}
