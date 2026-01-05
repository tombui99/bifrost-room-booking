import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center animate-scale-in">
        <div
          class="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-lg mx-auto mb-6"
        >
          S
        </div>
        <h1 class="text-3xl font-bold text-slate-800 mb-2">Bifrost room booking</h1>
        <p class="text-slate-500 mb-8">Đăng nhập để tiếp tục</p>
        <button
          (click)="loginWithGoogle()"
          class="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            ></path>
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            ></path>
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
              fill="#FBBC05"
            ></path>
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            ></path>
          </svg>
          <span>Đăng nhập bằng Google</span>
        </button>
      </div>
    </div>
  `,
})
export class Login {
  auth = inject(Auth);
  route = inject(ActivatedRoute);
  router = inject(Router);

  async loginWithGoogle() {
    await signInWithPopup(this.auth, new GoogleAuthProvider());

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/bookings';

    this.router.navigateByUrl(returnUrl);
  }
}
