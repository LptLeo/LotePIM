import { Component, inject, signal, computed, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import {
  UsuarioService,
  type UsuarioPerfil,
  type UsuarioStats,
} from '../../core/services/usuario.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { lastValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

interface DadosPerfilCarregados {
  perfil: UsuarioPerfil;
  stats: UsuarioStats;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [DatePipe, PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  // === INJEÇÃO DE DEPENDÊNCIAS ===

  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // === ESTADO DOS DADOS ===

  private dadosPerfil = signal<DadosPerfilCarregados | null>(null);
  public estaCarregando = signal(true);
  public perfil = computed(() => this.dadosPerfil()?.perfil ?? null);
  public stats = computed(() => this.dadosPerfil()?.stats ?? null);

  // === PERFIS DE ACESSO ===

  public ehOperador = computed(() => this.perfil()?.perfil === 'operador');
  public ehInspetor = computed(() => this.perfil()?.perfil === 'inspetor');
  public ehGestor = computed(() => this.perfil()?.perfil === 'gestor');

  // === ESTADOS DE EDIÇÃO ===

  public editandoPerfil = signal(false);
  public editandoSenha = signal(false);
  public salvandoPerfil = signal(false);
  public salvandoSenha = signal(false);
  public erroPerfil = signal<string | null>(null);
  public sucessoPerfil = signal<string | null>(null);
  public erroSenha = signal<string | null>(null);
  public sucessoSenha = signal<string | null>(null);

  // === FORMULÁRIOS ===

  public formPerfil = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  public formSenha = this.fb.nonNullable.group({
    senha_atual: ['', [Validators.required, Validators.minLength(8)]],
    nova_senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  // === INICIALIZAÇÃO ===

  constructor() {
    this.carregarPerfil();

    effect(() => {
      const perfil = this.perfil();
      if (perfil && !this.editandoPerfil()) {
        this.formPerfil.patchValue({
          nome: perfil.nome,
          email: perfil.email,
        });
      }
    });
  }

  // === MÉTODOS PÚBLICOS ===

  public alternarEdicaoPerfil(): void {
    this.erroPerfil.set(null);
    this.sucessoPerfil.set(null);
    if (this.editandoPerfil()) {
      this.editandoPerfil.set(false);
      const perfilAtual = this.perfil();
      if (perfilAtual) {
        this.formPerfil.patchValue({ nome: perfilAtual.nome, email: perfilAtual.email });
      }
    } else {
      this.editandoPerfil.set(true);
    }
  }

  public alternarEdicaoSenha(): void {
    this.erroSenha.set(null);
    this.sucessoSenha.set(null);
    if (this.editandoSenha()) {
      this.editandoSenha.set(false);
      this.formSenha.reset();
    } else {
      this.editandoSenha.set(true);
    }
  }

  public async salvarPerfil(): Promise<void> {
    if (this.formPerfil.invalid) return;
    const idUsuarioAtual = this.authService.usuario()?.id;
    if (!idUsuarioAtual) return;

    this.salvandoPerfil.set(true);
    this.erroPerfil.set(null);
    this.sucessoPerfil.set(null);

    const payload = this.formPerfil.getRawValue();

    try {
      await lastValueFrom(this.usuarioService.updatePerfil(idUsuarioAtual, payload));
      await this.carregarPerfil();
      this.editandoPerfil.set(false);
      this.sucessoPerfil.set('Perfil atualizado com sucesso.');
    } catch (err) {
      this.erroPerfil.set(this.obterMensagemErro(err, 'Falha ao atualizar o perfil.'));
    } finally {
      this.salvandoPerfil.set(false);
    }
  }

  public async salvarSenha(): Promise<void> {
    if (this.formSenha.invalid) return;
    const idUsuarioAtual = this.authService.usuario()?.id;
    if (!idUsuarioAtual) return;

    this.salvandoSenha.set(true);
    this.erroSenha.set(null);
    this.sucessoSenha.set(null);

    const payload = this.formSenha.getRawValue();

    try {
      await lastValueFrom(this.usuarioService.updateSenha(idUsuarioAtual, payload));
      this.editandoSenha.set(false);
      this.formSenha.reset();
      this.sucessoSenha.set('Senha alterada com sucesso.');
    } catch (err) {
      this.erroSenha.set(this.obterMensagemErro(err, 'Falha ao alterar a senha.'));
    } finally {
      this.salvandoSenha.set(false);
    }
  }

  // === MÉTODOS PRIVADOS ===

  private obterMensagemErro(err: unknown, mensagemPadrao: string): string {
    return err instanceof HttpErrorResponse
      ? err.error?.message || mensagemPadrao
      : mensagemPadrao;
  }

  private async carregarPerfil(): Promise<void> {
    const id = this.authService.usuario()?.id;
    if (!id) return;

    this.estaCarregando.set(true);
    try {
      const [perfil, stats] = await Promise.all([
        lastValueFrom(this.usuarioService.getPerfil(id)),
        lastValueFrom(this.usuarioService.getStats(id)),
      ]);
      this.dadosPerfil.set({ perfil, stats });
    } catch {
      this.dadosPerfil.set(null);
    } finally {
      this.estaCarregando.set(false);
    }
  }
}
