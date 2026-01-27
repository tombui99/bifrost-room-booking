import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { Rooms } from './features/rooms/rooms';
import { MainLayoutComponent } from './main-layout';
import { Dashboard } from './features/dashboard/dashboard';
import { Login } from './auth/components/login';
import { adminGuard } from './auth/admin.guard';
import { TabletView } from './features/tablet-view/tablet-view';
import { WeeklyBookings } from './features/weekly-bookings/weekly-bookings';
import { DailyBookings } from './features/daily-bookings/daily-bookings';
import { ControlDeck } from './features/control-deck/control-deck';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'bookings/daily', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard, title: 'Dashboard' },
      {
        path: 'bookings',
        children: [
          { path: 'daily', component: DailyBookings },
          { path: 'weekly', component: WeeklyBookings },
        ],
      },
      {
        path: 'rooms',
        component: Rooms,
        title: 'Quản Lý Phòng',
        canActivate: [adminGuard],
      },
    ],
    canActivate: [authGuard],
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'tablet/:id',
    component: TabletView,
    canActivate: [adminGuard],
  },
  {
    path: 'deck/:id',
    component: ControlDeck,
    canActivate: [adminGuard],
  },
];
