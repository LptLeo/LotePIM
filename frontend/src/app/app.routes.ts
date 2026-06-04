import { Routes } from '@angular/router';
import { Login } from './features/login/login.js';
import { MainLayout } from './core/layouts/main-layout/main-layout.js';
import { authGuard } from './core/guards/auth/auth-guard.js';
import { guestGuard } from './core/guards/auth/guest-guard.js';
import { roleGuard } from './core/guards/auth/role-guard.js';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'app',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.js').then((c) => c.Dashboard),
      },
      {
        path: 'lote',
        loadComponent: () => import('./features/lote/lote.js').then((c) => c.Lote),
      },
      {
        path: 'lote/novo',
        loadComponent: () =>
          import('./features/lote/pages/lote-novo/lote-novo.js').then((c) => c.LoteNovo),
      },
      {
        path: 'lote/:id',
        loadComponent: () =>
          import('./features/lote/pages/lote-detail/lote-detail.js').then(
            (c) => c.LoteDetail,
          ),
      },
      {
        path: 'produtos',
        loadComponent: () =>
          import('./features/produtos/produtos.js').then((c) => c.Produtos),
      },
      {
        path: 'produtos/novo',
        loadComponent: () =>
          import('./features/produtos/pages/produto-novo/produto-novo.js').then(
            (c) => c.ProdutoNovo,
          ),
      },
      {
        path: 'produtos/:id',
        loadComponent: () =>
          import('./features/produtos/pages/produto-detail/produto-detail.js').then(
            (c) => c.ProdutoDetail,
          ),
      },
      {
        path: 'rastreabilidade',
        loadComponent: () =>
          import('./features/rastreabilidade/rastreabilidade.js').then(
            (c) => c.Rastreabilidade,
          ),
      },
      {
        path: 'insumos',
        canActivate: [roleGuard(['operador'])],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/insumos/insumos.js').then((c) => c.Insumos),
            pathMatch: 'full',
          },
          {
            path: 'novo',
            loadComponent: () =>
              import('./features/insumos/pages/insumo-novo/insumo-novo.js').then(
                (c) => c.InsumoNovo,
              ),
          },
        ],
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./features/configuracoes/configuracoes.js').then(
            (c) => c.Configuracoes,
          ),
      },
      {
        path: 'cadastro-usuarios',
        loadComponent: () =>
          import('./features/cadastro-usuarios/cadastro-usuarios.js').then(
            (c) => c.CadastroUsuarios,
          ),
        canActivate: [roleGuard(['gestor'])],
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil.js').then((c) => c.Perfil),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
