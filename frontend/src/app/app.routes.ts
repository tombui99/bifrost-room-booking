import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { Bookings } from './features/bookings/bookings';
import { Rooms } from './features/rooms/rooms';
import { MainLayoutComponent } from './main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'bookings', component: Bookings },
      { path: 'rooms', component: Rooms },
    ],
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/components/login').then((m) => m.Login),
  },
];
