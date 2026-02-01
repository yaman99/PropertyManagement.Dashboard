import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state text-center py-5" dir="rtl">
      <div class="display-1 mb-3 text-muted">{{ icon }}</div>
      <h4 class="text-muted mb-2">{{ title }}</h4>
      <p class="text-muted mb-4">{{ message }}</p>
      <div *ngIf="showAction">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      min-height: 300px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .display-1 {
        font-size: 4rem;
        opacity: 0.5;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = '📭';
  @Input() title = 'لا توجد بيانات';
  @Input() message = 'لم يتم العثور على أي سجلات';
  @Input() showAction = true;
}
