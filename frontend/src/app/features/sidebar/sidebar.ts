import { CommonModule } from '@angular/common';
import { Component, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { signOut } from 'firebase/auth';
import { Auth, user } from '@angular/fire/auth';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside
      class="bg-slate-900 text-white flex flex-col shrink-0 transition-all duration-300 shadow-xl relative h-screen overflow-hidden"
      [class.w-64]="isOpen"
      [class.w-0]="!isOpen"
      [class.opacity-0]="!isOpen"
    >
      <div class="w-64 flex flex-col h-full">
        <div class="p-6 border-b border-slate-800 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <img src="/assets/bifrost-logo.png" alt="Bifrost Logo" class="h-32 object-cover" />
          </div>

          <button
            (click)="toggleSidebar.emit()"
            class="text-slate-500 hover:text-white transition-colors lg:hidden"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>

        <nav class="flex-1 p-4 space-y-2 ml-2">
          <div class="grid grid-cols-1 gap-y-5">
            <a
              routerLink="/dashboard"
              routerLinkActive="text-orange-500 font-bold"
              class="flex items-center gap-3"
            >
              <i class="fas fa-calendar-alt w-5"></i> <span>Dashboard</span>
            </a>
            <a
              routerLink="/bookings"
              routerLinkActive="text-orange-500 font-bold"
              class="flex items-center gap-3"
            >
              <i class="fas fa-calendar-alt w-5"></i> <span>Đặt Phòng</span>
            </a>
            <a
              routerLink="/rooms"
              routerLinkActive="text-orange-500 font-bold"
              class="flex items-center gap-3"
            >
              <i class="fas fa-building w-5"></i> <span>Quản Lý Phòng</span>
            </a>
          </div>
        </nav>

        <div class="p-4 border-t border-slate-800 relative">
          <div
            (click)="toggleProfile($event)"
            class="flex items-center gap-3 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition select-none"
          >
            <img
              [src]="currentUser()?.photoURL"
              class="w-10 h-10 rounded-full border-2 border-slate-700"
            />
            <div class="flex-1 overflow-hidden">
              <p class="text-sm font-bold truncate">{{ currentUser()?.displayName }}</p>
              <p class="text-xs text-slate-400 truncate">{{ currentUser()?.email }}</p>
            </div>
          </div>

          @if (showProfileMenu()) {
          <div
            class="absolute bottom-20 left-4 right-4 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 animate-scale-in origin-bottom"
          >
            <button
              class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded"
            >
              Hồ sơ
            </button>
            <div class="h-px bg-slate-700 my-1"></div>
            <button
              (click)="logout()"
              class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 rounded"
            >
              Đăng xuất
            </button>
          </div>
          }
        </div>
      </div>
    </aside>
  `,
})
export class Sidebar {
  auth = inject(Auth);
  router = inject(Router);

  @Input() isOpen = true;
  @Output() toggleSidebar = new EventEmitter<void>();

  showProfileMenu = signal(false);
  currentUser = toSignal(user(this.auth));

  toggleProfile(e: Event) {
    e.stopPropagation();
    this.showProfileMenu.update((v) => !v);
  }

  logout() {
    signOut(this.auth);
    this.router.navigate(['login']);
    this.showProfileMenu.set(false);
  }
}
