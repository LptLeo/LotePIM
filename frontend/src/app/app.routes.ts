import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Lote } from './features/lote/lote';
import { Rastreabilidade } from './features/rastreabilidade/rastreabilidade';
import { Configuracoes } from './features/configuracoes/configuracoes';
import { authGuard } from './core/guards/auth/auth-guard';
import { MainLayout } from './core/layouts/main-layout/main-layout';

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
    path: 'app',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: Dashboard,
      },
      {
        path: 'lote',
        component: Lote,
      },
      {
        path: 'rastreabilidade',
        component: Rastreabilidade,
      },
      {
        path: 'configuracoes',
        component: Configuracoes,
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
