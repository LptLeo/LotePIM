import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Lote } from './features/lote/lote';
import { LoteDetail } from './features/lote/pages/lote-detail/lote-detail';
import { LoteNovo } from './features/lote/pages/lote-novo/lote-novo';
import { Produtos } from './features/produtos/produtos';
import { ProdutoNovo } from './features/produtos/pages/produto-novo/produto-novo';
import { Rastreabilidade } from './features/rastreabilidade/rastreabilidade';
import { Configuracoes } from './features/configuracoes/configuracoes';
import { Insumos } from './features/insumos/insumos';
import { InsumoNovo } from './features/insumos/pages/insumo-novo/insumo-novo';
import { Perfil } from './features/perfil/perfil';
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
        path: 'lote/novo',
        component: LoteNovo,
      },
      {
        path: 'lote/:id',
        component: LoteDetail,
      },
      {
        path: 'produtos',
        component: Produtos,
      },
      {
        path: 'produtos/novo',
        component: ProdutoNovo,
      },
      {
        path: 'produtos/:id',
        loadComponent: () => import('./features/produtos/pages/produto-detail/produto-detail').then(c => c.ProdutoDetail),
      },
      {
        path: 'rastreabilidade',
        component: Rastreabilidade,
      },
      {
        path: 'insumos',
        component: Insumos,
      },
      {
        path: 'insumos/novo',
        component: InsumoNovo,
      },
      {
        path: 'configuracoes',
        component: Configuracoes,
      },
      {
        path: 'perfil',
        component: Perfil,
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
