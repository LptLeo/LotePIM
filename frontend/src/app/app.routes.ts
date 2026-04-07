import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'app/dashboard',
    component: Dashboard,
    pathMatch: 'full'
  }
];
