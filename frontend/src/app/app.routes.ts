import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    redirectTo: 'login'
  },
  {
    path: '**',
    redirectTo: 'login'
  },
  {
    path: 'app/dashboard',
    component: Dashboard
  }
];
