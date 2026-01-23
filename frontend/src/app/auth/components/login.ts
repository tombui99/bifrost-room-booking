import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4 font-sans">
      <div class="bg-slate-500 w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
        <img src="/assets/bifrost-logo.png" class="h-24 mx-auto mb-4" />

        <h1 class="text-white text-3xl font-bold mb-2">Bifrost room booking</h1>
        <p class="text-white mb-6">Đăng nhập để tiếp tục</p>

        <!-- Email / Password -->
        <form class="space-y-4 mb-4" (ngSubmit)="submitEmailPassword()">
          <input
            type="email"
            [(ngModel)]="email"
            name="email"
            placeholder="Email"
            required
            class="w-full rounded-xl px-4 py-3 text-sm outline-none bg-white"
          />

          <input
            type="password"
            [(ngModel)]="password"
            name="password"
            placeholder="Mật khẩu"
            required
            class="w-full rounded-xl px-4 py-3 text-sm outline-none bg-white"
          />

          <button
            type="submit"
            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl"
          >
            {{ isRegister() ? 'Đăng ký' : 'Đăng nhập' }}
          </button>
        </form>

        <!-- Forgot password -->
        <button
          *ngIf="!isRegister()"
          (click)="resetPassword()"
          class="text-sm text-white underline mb-4"
        >
          Quên mật khẩu?
        </button>

        <!-- Toggle -->
        <button (click)="toggleMode()" class="text-sm text-white underline block mb-4">
          {{ isRegister() ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký' }}
        </button>

        <!-- Messages -->
        <p *ngIf="message()" class="text-emerald-200 text-sm mb-2">
          {{ message() }}
        </p>

        <p *ngIf="error()" class="text-red-200 text-sm mb-4">
          {{ error() }}
        </p>

        <!-- Google -->
        <button
          (click)="loginWithGoogle()"
          class="w-full bg-white hover:bg-slate-100 text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-3"
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

  email = '';
  password = '';

  isRegister = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);

  async loginWithGoogle() {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
    this.redirect();
  }

  async submitEmailPassword() {
    this.error.set(null);
    this.message.set(null);

    try {
      if (this.isRegister()) {
        await createUserWithEmailAndPassword(this.auth, this.email, this.password);

        this.message.set('Đăng ký thành công!');
        this.redirect();
        return;
      }

      await signInWithEmailAndPassword(this.auth, this.email, this.password);

      this.redirect();
    } catch (e: any) {
      this.error.set(this.mapFirebaseError(e.code));
    }
  }

  async resetPassword() {
    this.error.set(null);
    this.message.set(null);

    if (!this.email) {
      this.error.set('Vui lòng nhập email trước.');
      return;
    }

    await sendPasswordResetEmail(this.auth, this.email);
    this.message.set('Email đặt lại mật khẩu đã được gửi.');
  }

  toggleMode() {
    this.isRegister.update((v) => !v);
    this.error.set(null);
    this.message.set(null);
  }

  redirect() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/bookings/daily';

    this.router.navigateByUrl(returnUrl);
  }

  mapFirebaseError(code: string) {
    switch (code) {
      case 'auth/user-not-found':
        return 'Tài khoản không tồn tại';
      case 'auth/wrong-password':
        return 'Sai mật khẩu';
      case 'auth/email-already-in-use':
        return 'Email đã được sử dụng';
      case 'auth/weak-password':
        return 'Mật khẩu quá yếu (tối thiểu 6 ký tự)';
      case 'auth/invalid-email':
        return 'Email không hợp lệ';
      default:
        return 'Đã xảy ra lỗi, vui lòng thử lại';
    }
  }
}
