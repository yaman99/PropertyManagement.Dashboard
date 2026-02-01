import { Injectable } from '@angular/core';

/**
 * Base LocalStorage Service
 * Provides utility methods for LocalStorage operations with versioning
 */
@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly PREFIX = 're';
  private readonly VERSION_KEY = `${this.PREFIX}.storageVersion`;
  private readonly CURRENT_VERSION = 1;

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    const version = this.getItem<number>(this.VERSION_KEY);
    if (!version || version !== this.CURRENT_VERSION) {
      // Version mismatch or first time - could trigger migration here
      this.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
    }
  }

  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${this.PREFIX}.${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage key: ${key}`, error);
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`${this.PREFIX}.${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key: ${key}`, error);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(`${this.PREFIX}.${key}`);
    } catch (error) {
      console.error(`Error removing from localStorage key: ${key}`, error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      this.initializeStorage();
    } catch (error) {
      console.error('Error clearing localStorage', error);
    }
  }

  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.PREFIX)) {
        keys.push(key.replace(`${this.PREFIX}.`, ''));
      }
    }
    return keys;
  }
}
