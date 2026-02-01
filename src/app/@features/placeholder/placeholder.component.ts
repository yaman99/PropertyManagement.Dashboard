import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-page" dir="rtl">
      <div class="text-center py-5">
        <div class="display-1 mb-4">{{ icon }}</div>
        <h2 class="text-brand mb-3">{{ title }}</h2>
        <p class="text-muted">هذه الصفحة قيد الإنشاء</p>
        <div class="alert alert-info mt-4" role="alert">
          <strong>ملاحظة:</strong> هذه الوحدة جاهزة للتطوير. جميع الخدمات والنماذج موجودة في @core
        </div>
      </div>
    </div>
  `,
  styles: [`
    .placeholder-page {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class PlaceholderComponent {
  title = '';
  icon = '🚧';

  constructor(private route: ActivatedRoute) {
    // Get the title from route data
    this.route.data.subscribe(data => {
      this.title = data['title'] || 'الصفحة';
      this.icon = data['icon'] || '🚧';
    });
  }
}
