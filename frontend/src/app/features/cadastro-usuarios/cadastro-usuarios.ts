import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

// Services Core
import { ToastService } from '../../core/services/toast.service.js';
import {
  CreateUsuarioPayload,
  UsuarioService,
} from '../../core/services/usuario.service.js';

// Componentes Compartilhados e Sub-UI
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { SelectOption } from '../../shared/components/form-controls/select-field/select-field.js';
import { UserListComponent } from './components/user-list/user-list.js';
import { UserFormComponent } from './components/user-form/user-form.js';

@Component({
  selector: 'app-cadastro-usuarios',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, UserListComponent, UserFormComponent],
  templateUrl: './cadastro-usuarios.html',
})
export class CadastroUsuarios {
  // --- Injeção de Dependências ---
  private usuarioService = inject(UsuarioService);
  private toastService = inject(ToastService);

  // --- Estado de UI e Controle de Tela ---
  telaAtiva = signal<'listagem' | 'cadastro'>('listagem');
  salvando = signal(false);
  erroApi = signal<string | null>(null);

  // --- Estado da Listagem e Filtros ---
  currentPage = signal(1);
  filtroTermo = signal('');
  filtroPerfil = signal<'todos' | 'operador' | 'inspetor' | 'gestor'>('todos');
  filtroStatus = signal<'todos' | 'ativos' | 'inativos'>('todos');

  // --- Recurso de Dados ---
  usuariosResource = rxResource({
    params: () => ({
      pagina: this.currentPage(),
      limite: 10,
      busca: this.filtroTermo().trim(),
      perfil: this.filtroPerfil(),
      ativo: this.filtroStatus(),
    }),
    stream: ({ params }) => this.usuarioService.getAll(params),
  });

  // Derivações de Estado do Recurso
  cadastrados = computed(() => this.usuariosResource.value()?.itens ?? []);
  paginationMeta = computed(() => this.usuariosResource.value()?.meta ?? null);
  carregandoLista = this.usuariosResource.isLoading;
  erroLista = computed(() => {
    const err = this.usuariosResource.error() as any;
    return err?.error?.message ?? err?.message ?? null;
  });

  // --- Definição de Opções de Select ---
  roleOptions: SelectOption[] = [
    { value: 'operador', label: 'Operador' },
    { value: 'inspetor', label: 'Inspetor' },
    { value: 'gestor', label: 'Gestor' },
  ];

  filtroPerfilOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'operador', label: 'Operador' },
    { value: 'inspetor', label: 'Inspetor' },
    { value: 'gestor', label: 'Gestor' },
  ];

  filtroStatusOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'ativos', label: 'Ativos' },
    { value: 'inativos', label: 'Inativos' },
  ];

  // --- Métodos de Navegação ---

  abrirCadastro(): void {
    this.erroApi.set(null);
    this.telaAtiva.set('cadastro');
  }

  voltarParaListagem(): void {
    this.erroApi.set(null);
    this.telaAtiva.set('listagem');
    this.usuariosResource.reload();
  }

  // --- Métodos de Controle de Filtros e Paginação ---

  onPageChange(pagina: number) {
    this.currentPage.set(pagina);
  }

  setFiltroTermo(value: string): void {
    this.filtroTermo.set(value);
    this.currentPage.set(1);
  }

  setFiltroPerfil(value: string): void {
    const allowed = new Set(['todos', 'operador', 'inspetor', 'gestor']);
    if (allowed.has(value)) {
      this.filtroPerfil.set(value as 'todos' | 'operador' | 'inspetor' | 'gestor');
      this.currentPage.set(1);
    }
  }

  setFiltroStatus(value: string): void {
    const allowed = new Set(['todos', 'ativos', 'inativos']);
    if (allowed.has(value)) {
      this.filtroStatus.set(value as 'todos' | 'ativos' | 'inativos');
      this.currentPage.set(1);
    }
  }

  // --- Lógica de Negócio (CRUD) ---

  salvarUsuario(payload: CreateUsuarioPayload): void {
    this.erroApi.set(null);
    this.salvando.set(true);

    this.usuarioService
      .create(payload)
      .pipe(finalize(() => this.salvando.set(false))) // finalize ao invés de complete porque o complete não executa em caso de erro
      .subscribe({
        next: () => {
          this.toastService.success('Colaborador cadastrado com sucesso.');
          this.voltarParaListagem();
        },
        error: (err) => {
          this.erroApi.set(
            err?.error?.message ?? 'Não foi possível cadastrar o colaborador.',
          );
          this.toastService.error('Falha ao cadastrar colaborador.');
        },
      });
  }

  deativarUsuario(id: number): void {
    this.toastService.confirm(
      'Tem certeza que deseja desativar este colaborador? Ele perderá o acesso ao sistema imediatamente.',
      () => {
        this.usuarioService.delete(id).subscribe({
          next: () => {
            this.toastService.success('Colaborador desativado com sucesso.');
            this.usuariosResource.reload();
          },
          error: (err) => {
            this.toastService.error(
              err?.error?.message ?? 'Falha ao desativar colaborador.',
            );
          },
        });
      },
      'Desativar',
    );
  }

  reativarUsuario(id: number): void {
    this.toastService.confirm(
      'Deseja reativar o acesso deste colaborador ao sistema?',
      () => {
        this.usuarioService.reativar(id).subscribe({
          next: () => {
            this.toastService.success('Colaborador reativado com sucesso.');
            this.usuariosResource.reload();
          },
          error: (err) => {
            this.toastService.error(
              err?.error?.message ?? 'Falha ao reativar colaborador.',
            );
          },
        });
      },
      'Reativar',
    );
  }
}
