import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service.js';
import {
  CreateUsuarioPayload,
  UsuarioService,
} from '../../core/services/usuario.service.js';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { SelectOption } from '../../shared/components/form-controls/select-field/select-field.js';
import { UserListComponent } from './components/user-list/user-list.js';
import { UserFormComponent } from './components/user-form/user-form.js';

export const TELAS_CADASTRO = {
  LISTAGEM: 'listagem',
  CADASTRO: 'cadastro',
} as const;

export type TelaCadastro = (typeof TELAS_CADASTRO)[keyof typeof TELAS_CADASTRO];

@Component({
  selector: 'app-cadastro-usuarios',
  standalone: true,
  imports: [PageHeaderComponent, UserListComponent, UserFormComponent],
  templateUrl: './cadastro-usuarios.html',
})
export class CadastroUsuarios {
  // === INJEÇÃO DE DEPENDÊNCIAS ===
  private usuarioService = inject(UsuarioService);
  private toastService = inject(ToastService);

  // === NAVEGAÇÃO ENTRE TELAS ===
  telaAtiva = signal<TelaCadastro>('listagem');
  salvando = signal(false);
  erroApi = signal<string | null>(null);

  // === FILTROS E PAGINAÇÃO ===
  paginaAtual = signal(1);
  filtroTermo = signal('');
  filtroPerfil = signal<'todos' | 'operador' | 'inspetor' | 'gestor'>('todos');
  filtroStatus = signal<'todos' | 'ativos' | 'inativos'>('todos');

  // === LISTAGEM DE USUÁRIOS ===
  private usuariosResource = rxResource({
    params: () => ({
      pagina: this.paginaAtual(),
      limite: 10,
      busca: this.filtroTermo().trim(),
      perfil: this.filtroPerfil(),
      ativo: this.filtroStatus(),
    }),
    stream: ({ params }) => this.usuarioService.getAll(params),
  });

  cadastrados = computed(() => this.usuariosResource.value()?.itens ?? []);
  metaPaginacao = computed(() => this.usuariosResource.value()?.meta ?? null);
  carregandoLista = this.usuariosResource.isLoading;
  erroLista = computed(() => {
    const err = this.usuariosResource.error();
    if (err instanceof HttpErrorResponse) {
      return err.error?.message ?? err.message ?? null;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return null;
  });

  // === OPÇÕES DE PERFIL ===
  opcoesPerfil: SelectOption[] = [
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

  // === MÉTODOS PÚBLICOS ===
  public abrirCadastro(): void {
    this.erroApi.set(null);
    this.telaAtiva.set('cadastro');
  }

  public voltarParaListagem(): void {
    this.erroApi.set(null);
    this.telaAtiva.set('listagem');
    this.usuariosResource.reload();
  }

  public recarregarLista(): void {
    this.usuariosResource.reload();
  }

  public aoMudarPagina(pagina: number): void {
    this.paginaAtual.set(pagina);
  }

  public definirFiltroTermo(valor: string): void {
    this.filtroTermo.set(valor);
    this.paginaAtual.set(1);
  }

  public definirFiltroPerfil(valor: string): void {
    const permitidos = new Set(['todos', 'operador', 'inspetor', 'gestor']);
    if (permitidos.has(valor)) {
      this.filtroPerfil.set(valor as 'todos' | 'operador' | 'inspetor' | 'gestor');
      this.paginaAtual.set(1);
    }
  }

  public definirFiltroStatus(valor: string): void {
    const permitidos = new Set(['todos', 'ativos', 'inativos']);
    if (permitidos.has(valor)) {
      this.filtroStatus.set(valor as 'todos' | 'ativos' | 'inativos');
      this.paginaAtual.set(1);
    }
  }

  public async salvarUsuario(payload: CreateUsuarioPayload): Promise<void> {
    this.erroApi.set(null);
    this.salvando.set(true);
    try {
      await lastValueFrom(this.usuarioService.create(payload));
      this.toastService.success('Colaborador cadastrado com sucesso.');
      this.voltarParaListagem();
    } catch (err) {
      const msg =
        err instanceof HttpErrorResponse
          ? (err.error?.message ?? 'Não foi possível cadastrar o colaborador.')
          : 'Não foi possível cadastrar o colaborador.';
      this.erroApi.set(msg);
      this.toastService.error('Falha ao cadastrar colaborador.');
    } finally {
      this.salvando.set(false);
    }
  }

  public deativarUsuario(id: number): void {
    this.toastService.confirm(
      'Tem certeza que deseja desativar este colaborador? Ele perderá o acesso ao sistema imediatamente.',
      async () => {
        try {
          await lastValueFrom(this.usuarioService.delete(id));
          this.toastService.success('Colaborador desativado com sucesso.');
          this.usuariosResource.reload();
        } catch (err) {
          this.toastService.error(
            err instanceof HttpErrorResponse
              ? (err.error?.message ?? 'Falha ao desativar colaborador.')
              : 'Falha ao desativar colaborador.',
          );
        }
      },
      'Desativar',
    );
  }

  public reativarUsuario(id: number): void {
    this.toastService.confirm(
      'Deseja reativar o acesso deste colaborador ao sistema?',
      async () => {
        try {
          await lastValueFrom(this.usuarioService.reativar(id));
          this.toastService.success('Colaborador reativado com sucesso.');
          this.usuariosResource.reload();
        } catch (err) {
          this.toastService.error(
            err instanceof HttpErrorResponse
              ? (err.error?.message ?? 'Falha ao reativar colaborador.')
              : 'Falha ao reativar colaborador.',
          );
        }
      },
      'Reativar',
    );
  }
}
