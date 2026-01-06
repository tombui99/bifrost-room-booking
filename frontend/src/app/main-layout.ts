import { Component, inject, signal, effect, HostListener } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Sidebar } from './features/sidebar/sidebar';
import { CommonModule } from '@angular/common';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar, CommonModule],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50 relative">
      @if (isSidebarOpen()) {
      <div
        class="fixed inset-0 bg-slate-900/50 z-10 md:hidden"
        (click)="isSidebarOpen.set(false)"
      ></div>
      }

      <app-sidebar
        [isOpen]="isSidebarOpen()"
        (toggleSidebar)="toggleSidebar()"
        class="absolute md:relative z-20 h-full"
      />

      <div class="flex-1 flex flex-col min-w-0">
        <header class="bg-white border-b border-slate-200 p-4 flex items-center gap-4">
          <button
            (click)="toggleSidebar()"
            class="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <i class="fas fa-bars text-xl"></i>
          </button>

          <h1 class="font-semibold text-slate-700 text-lg capitalize">
            {{ pageTitle() }}
          </h1>
        </header>

        <main class="flex-1 overflow-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class MainLayoutComponent {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  // Initialize state: Closed if screen is less than 768px (md breakpoint)
  isSidebarOpen = signal(window.innerWidth >= 768);

  pageTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => {
        let route = this.activatedRoute;
        while (route.firstChild) route = route.firstChild;
        return route.snapshot.title || route.snapshot.data['title'] || 'Dashboard';
      }),
      startWith('Dashboard')
    )
  );

  constructor() {
    // Auto-close sidebar on mobile after navigating to a new page
    effect(() => {
      this.pageTitle();
      if (window.innerWidth < 768) {
        this.isSidebarOpen.set(false);
      }
    });
  }

  toggleSidebar() {
    this.isSidebarOpen.update((v) => !v);
  }

  // Optional: Handle window resizing
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth < 768 && this.isSidebarOpen()) {
      this.isSidebarOpen.set(false);
    }
  }
}
