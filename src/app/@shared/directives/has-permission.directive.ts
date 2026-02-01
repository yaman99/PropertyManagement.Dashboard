import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngxs/store';
import { AuthState } from '../../@core/state/auth.state';
import { Permission } from '../../@core/domain/models/auth.model';
import { Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  @Input() appHasPermission: Permission[] = [];
  @Input() appHasPermissionMode: 'all' | 'any' = 'any';

  private destroy$ = new Subject<void>();
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private store: Store
  ) {}

  ngOnInit() {
    this.store.select(AuthState.user)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    const hasPermission = this.checkPermissions();

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkPermissions(): boolean {
    if (!this.appHasPermission || this.appHasPermission.length === 0) {
      return true; // No permissions required
    }

    const user = this.store.selectSnapshot(AuthState.user);
    if (!user || !user.permissions) return false;

    if (this.appHasPermissionMode === 'all') {
      return this.appHasPermission.every(permission =>
        user.permissions.includes(permission)
      );
    } else {
      return this.appHasPermission.some(permission =>
        user.permissions.includes(permission)
      );
    }
  }
}
