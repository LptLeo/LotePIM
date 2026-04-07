import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { authGuard } from './core/guards/auth/auth-guard';

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
    path: 'app/dashboard',
    component: Dashboard,
    canActivate: [authGuard],
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
