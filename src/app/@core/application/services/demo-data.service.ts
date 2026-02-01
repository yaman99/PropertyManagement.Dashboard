import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DemoDataService {

  private readonly STORAGE_KEYS = [
    'realestate.owners',
    'realestate.units',
    'realestate.renters',
    'realestate.leases',
    'realestate.requests',
    'ledger.accounts',
    'ledger.entries',
    'realestate.users',
    'realestate.roles',
    'realestate.settings'
  ];

  /**
   * Clear ALL application data - start completely fresh
   */
  clearAllData(): void {
    this.STORAGE_KEYS.forEach(key => {
      localStorage.removeItem(key);
    });

    // Also clear old keys that might exist
    localStorage.removeItem('ledger_accounts');
    localStorage.removeItem('ledger_entries');
    localStorage.removeItem('re.owners');
    localStorage.removeItem('re.units');
    localStorage.removeItem('re.renters');
    localStorage.removeItem('re.leases');
    localStorage.removeItem('re.requests');
    localStorage.removeItem('re.ledger');
    localStorage.removeItem('re.users');
    localStorage.removeItem('re.roles');

    console.log('✅ All data cleared!');
  }

  /**
   * Check if system has any data
   */
  hasData(): boolean {
    return this.STORAGE_KEYS.some(key => {
      const data = localStorage.getItem(key);
      if (!data) return false;
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0;
      } catch {
        return false;
      }
    });
  }

  /**
   * Get data statistics
   */
  getDataStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    const keyNames: Record<string, string> = {
      'realestate.owners': 'الملاك',
      'realestate.units': 'الوحدات',
      'realestate.renters': 'المستأجرون',
      'realestate.leases': 'العقود',
      'realestate.requests': 'الطلبات',
      'ledger.accounts': 'الحسابات',
      'ledger.entries': 'القيود'
    };

    Object.entries(keyNames).forEach(([key, name]) => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          stats[name] = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          stats[name] = 0;
        }
      } else {
        stats[name] = 0;
      }
    });

    return stats;
  }
}
