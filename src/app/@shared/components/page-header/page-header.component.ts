import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface Breadcrumb {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-header mb-4" dir="rtl">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h1 class="h3 mb-0 text-brand d-inline-flex align-items-center gap-2">
            <span>{{ title }}</span>
            <span *ngIf="icon">{{ icon }}</span>
          </h1>
          <nav aria-label="breadcrumb" *ngIf="breadcrumbs.length > 0" class="mt-2">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item">
                <a [routerLink]="['/app/dashboard']">لوحة التحكم</a>
              </li>
              <li *ngFor="let crumb of breadcrumbs; let last = last"
                  class="breadcrumb-item"
                  [class.active]="last">
                <a *ngIf="crumb.url && !last" [routerLink]="crumb.url">{{ crumb.label }}</a>
                <span *ngIf="!crumb.url || last">{{ crumb.label }}</span>
              </li>
            </ol>
          </nav>
        </div>
        <div *ngIf="showActions" class="d-flex gap-2">
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>
      <hr class="mt-3 mb-0">
    </div>
  `,
  styles: [`
    .page-header {
      text-align: right;

      h1 {
        font-weight: 600;
      }

      .breadcrumb {
        font-size: 0.875rem;
        padding: 0;
        margin: 0;
        background: transparent;
      }
    }
  `]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() icon = '';
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() showActions = true;
}
