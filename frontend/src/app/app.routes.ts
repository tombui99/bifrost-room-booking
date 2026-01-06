import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { Bookings } from './features/bookings/bookings';
import { Rooms } from './features/rooms/rooms';
import { MainLayoutComponent } from './main-layout';
import { Dashboard } from './features/dashboard/dashboard';
import { Login } from './auth/components/login';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard, title: 'Dashboard' },
      { path: 'bookings', component: Bookings, title: 'Đặt Phòng' },
      { path: 'rooms', component: Rooms, title: 'Quản Lý Phòng' },
    ],
    canActivate: [authGuard],
  },
  {
    path: 'login',
    component: Login,
  },
];
