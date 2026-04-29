import { Routes } from '@angular/router';
import { Login } from './features/login/login.js';
import { Dashboard } from './features/dashboard/dashboard.js';
import { Lote } from './features/lote/lote.js';
import { LoteDetail } from './features/lote/pages/lote-detail/lote-detail.js';
import { LoteNovo } from './features/lote/pages/lote-novo/lote-novo.js';
import { Produtos } from './features/produtos/produtos.js';
import { ProdutoNovo } from './features/produtos/pages/produto-novo/produto-novo.js';
import { Rastreabilidade } from './features/rastreabilidade/rastreabilidade.js';
import { Configuracoes } from './features/configuracoes/configuracoes.js';
import { Insumos } from './features/insumos/insumos.js';
import { InsumoNovo } from './features/insumos/pages/insumo-novo/insumo-novo.js';
import { Perfil } from './features/perfil/perfil.js';
import { CadastroUsuarios } from './features/cadastro-usuarios/cadastro-usuarios.js';
import { authGuard } from './core/guards/auth/auth-guard.js';
import { MainLayout } from './core/layouts/main-layout/main-layout.js';

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
        path: 'cadastro-usuarios',
        component: CadastroUsuarios,
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
