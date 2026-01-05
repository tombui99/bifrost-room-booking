import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { signOut } from 'firebase/auth';
import { Auth, user } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: ` <aside
    class="w-64 bg-slate-900 text-white flex flex-col hidden md:flex shrink-0 transition-all duration-300 shadow-xl z-20 relative h-screen overflow-hidden"
  >
    <div class="p-6 border-b border-slate-800">
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/30"
        >
          B
        </div>
        <span class="font-bold text-lg tracking-wide">Bifrost</span>
      </div>
    </div>

    <nav class="flex-1 p-4 space-y-2 ml-2">
      <a [class]="navClass('booking')">
        <i class="fas fa-calendar-alt w-5"></i> <span>Đặt Phòng</span>
      </a>
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
  </aside>`,
})
export class Sidebar {
  auth = inject(Auth);
  router = inject(Router);

  showProfileMenu = signal(false);
  currentUser = toSignal(user(this.auth));

  navClass(v: any) {
    // TODO: currentView should check if current route is active ('nav-item')
    return 'nav-item active';
  }

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
