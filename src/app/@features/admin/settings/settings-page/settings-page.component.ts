import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../../../@shared/components/page-header/page-header.component';
import { AlertService } from '../../../../@shared/services/alert.service';
import { DemoDataService } from '../../../../@core/application/services/demo-data.service';

interface SystemSettings {
  // Company Info
  companyName: string;
  companyNameEn: string;
  commercialRegister: string;
  taxNumber: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  logo: string;

  // Financial Settings
  currency: string;
  vatRate: number;
  enableVat: boolean;
  fiscalYearStart: string;

  // Lease Settings
  defaultPaymentCycle: 'Monthly' | 'Quarterly' | 'Yearly';
  defaultDueDayOfMonth: number;
  gracePeriodDays: number;
  lateFeePercentage: number;
  enableLateFees: boolean;

  // Notification Settings
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  paymentReminderDays: number;
  leaseExpiryReminderDays: number;

  // System Settings
  language: 'ar' | 'en';
  dateFormat: string;
  timezone: string;
  sessionTimeoutMinutes: number;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent
  ],
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent implements OnInit {
  settings: SystemSettings = this.getDefaultSettings();
  activeTab = 'company';
  dataStats: Record<string, number> = {};

  private readonly STORAGE_KEY = 'system_settings';

  constructor(
    private alertService: AlertService,
    private demoDataService: DemoDataService
  ) {}

  ngOnInit() {
    this.loadSettings();
    this.refreshDataStats();
  }

  refreshDataStats() {
    this.dataStats = this.demoDataService.getDataStats();
  }

  async clearAllData() {
    const confirmed = await this.alertService.confirm({
      title: 'مسح جميع البيانات',
      text: 'هل أنت متأكد؟ سيتم حذف جميع الملاك والوحدات والمستأجرين والعقود والحسابات نهائياً. لا يمكن التراجع عن هذا الإجراء!',
      icon: 'warning'
    });

    if (confirmed) {
      this.demoDataService.clearAllData();
      this.refreshDataStats();
      this.alertService.toastSuccess('تم مسح جميع البيانات بنجاح');

      // Reload page to reset all states
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }

  getDefaultSettings(): SystemSettings {
    return {
      // Company Info
      companyName: 'شركة مرابيا للعقارات',
      companyNameEn: 'Marbae Real Estate',
      commercialRegister: '1234567890',
      taxNumber: '300000000000003',
      phone: '+966 50 000 0000',
      email: 'info@marbae.sa',
      address: 'الرياض، المملكة العربية السعودية',
      website: 'www.marbae.sa',
      logo: '',

      // Financial Settings
      currency: 'SAR',
      vatRate: 15,
      enableVat: true,
      fiscalYearStart: '01-01',

      // Lease Settings
      defaultPaymentCycle: 'Monthly',
      defaultDueDayOfMonth: 1,
      gracePeriodDays: 5,
      lateFeePercentage: 5,
      enableLateFees: true,

      // Notification Settings
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      paymentReminderDays: 3,
      leaseExpiryReminderDays: 30,

      // System Settings
      language: 'ar',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'Asia/Riyadh',
      sessionTimeoutMinutes: 30
    };
  }

  loadSettings() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.settings = { ...this.getDefaultSettings(), ...JSON.parse(stored) };
    }
  }

  saveSettings() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    this.alertService.toastSuccess('تم حفظ الإعدادات بنجاح');
  }

  resetToDefaults() {
    this.alertService.confirm({
      title: 'إعادة تعيين الإعدادات',
      text: 'هل أنت متأكد من إعادة تعيين جميع الإعدادات للقيم الافتراضية؟',
      icon: 'warning'
    }).then(confirmed => {
      if (confirmed) {
        this.settings = this.getDefaultSettings();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
        this.alertService.toastSuccess('تم إعادة تعيين الإعدادات');
      }
    });
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          this.settings.logo = reader.result as string;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeLogo() {
    this.settings.logo = '';
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  exportSettings() {
    const dataStr = JSON.stringify(this.settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system-settings.json';
    a.click();
    window.URL.revokeObjectURL(url);
    this.alertService.toastSuccess('تم تصدير الإعدادات');
  }

  importSettings(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string);
          this.settings = { ...this.getDefaultSettings(), ...imported };
          this.saveSettings();
          this.alertService.toastSuccess('تم استيراد الإعدادات بنجاح');
        } catch (e) {
          this.alertService.toastError('فشل استيراد الإعدادات: ملف غير صالح');
        }
      };
      reader.readAsText(file);
    }
  }
}
