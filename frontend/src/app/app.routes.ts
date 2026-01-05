import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/bookings/bookings').then((m) => m.Bookings),
    canActivate: [authGuard],
  },
  {
    path: 'bookings',
    loadComponent: () => import('./features/bookings/bookings').then((m) => m.Bookings),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/components/login').then((m) => m.Login),
  },
  { path: '**', redirectTo: '' },
];
