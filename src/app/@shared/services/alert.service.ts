import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

/**
 * Alert Service
 * Centralized wrapper for SweetAlert2
 * All alerts, confirmations, and toasts must use this service
 */
@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private readonly toastConfig = {
    toast: true,
    position: 'top-end' as const,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast: HTMLElement) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  };

  /**
   * Show success toast
   */
  toastSuccess(message: string): Promise<any> {
    return Swal.fire({
      ...this.toastConfig,
      icon: 'success',
      title: message
    });
  }

  /**
   * Show error toast
   */
  toastError(message: string): Promise<any> {
    return Swal.fire({
      ...this.toastConfig,
      icon: 'error',
      title: message
    });
  }

  /**
   * Show info toast
   */
  toastInfo(message: string): Promise<any> {
    return Swal.fire({
      ...this.toastConfig,
      icon: 'info',
      title: message
    });
  }

  /**
   * Show warning toast
   */
  toastWarn(message: string): Promise<any> {
    return Swal.fire({
      ...this.toastConfig,
      icon: 'warning',
      title: message
    });
  }

  /**
   * Show confirmation dialog
   * Returns true if confirmed, false if cancelled
   */
  async confirm(options: {
    title: string;
    text?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    icon?: SweetAlertIcon;
  }): Promise<boolean> {
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon || 'question',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'تأكيد',
      cancelButtonText: options.cancelButtonText || 'إلغاء',
      reverseButtons: true,
      confirmButtonColor: '#BC8545',
      cancelButtonColor: '#6c757d'
    });

    return result.isConfirmed;
  }

  /**
   * Show credentials modal with copy to clipboard functionality
   */
  async showCredentialsModal(username: string, password: string): Promise<void> {
    const result = await Swal.fire({
      title: 'بيانات الدخول',
      html: `
        <div class="credentials-modal text-start" dir="rtl">
          <div class="mb-3">
            <label class="form-label fw-bold">اسم المستخدم:</label>
            <div class="input-group">
              <input type="text" class="form-control" value="${username}" id="swal-username" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText('${username}').then(() => {
                const btn = this;
                btn.textContent = '✓ تم النسخ';
                setTimeout(() => btn.textContent = 'نسخ', 2000);
              })">نسخ</button>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">كلمة المرور المؤقتة:</label>
            <div class="input-group">
              <input type="text" class="form-control" value="${password}" id="swal-password" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="navigator.clipboard.writeText('${password}').then(() => {
                const btn = this;
                btn.textContent = '✓ تم النسخ';
                setTimeout(() => btn.textContent = 'نسخ', 2000);
              })">نسخ</button>
            </div>
          </div>
          <div class="alert alert-warning" role="alert">
            <small>يرجى حفظ هذه البيانات وإرسالها للمستخدم. كلمة المرور مؤقتة ويجب تغييرها عند أول تسجيل دخول.</small>
          </div>
        </div>
      `,
      confirmButtonText: 'حسناً',
      confirmButtonColor: '#BC8545',
      width: '600px'
    });

    if (result.isConfirmed) {
      await this.toastInfo('تم نسخ بيانات الدخول');
    }
  }

  /**
   * Show custom alert
   */
  async alert(options: SweetAlertOptions): Promise<any> {
    return Swal.fire(options);
  }

  /**
   * Show loading indicator
   */
  showLoading(message: string = 'جاري التحميل...'): void {
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * Close any open alert
   */
  close(): void {
    Swal.close();
  }
}
