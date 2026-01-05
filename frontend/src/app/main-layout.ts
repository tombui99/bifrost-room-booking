import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './features/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar],
  template: `
    <div class="flex h-screen overflow-hidden">
      <app-sidebar />
      <div class="flex-1 min-w-0">
        <router-outlet />
      </div>
    </div>
  `,
})
export class MainLayoutComponent {}
