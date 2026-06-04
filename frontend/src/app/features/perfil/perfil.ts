import { Component, inject, signal, computed, effect } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { UsuarioService } from '../../core/services/usuario.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { forkJoin, finalize } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [NgIf, DatePipe, PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  perfilResource = rxResource({
    params: () => this.authService.usuario()?.id,
    stream: ({ params: id }) => {
      if (!id) throw new Error('Usuário não autenticado');
      return forkJoin({
        perfil: this.usuarioService.getPerfil(id),
        stats: this.usuarioService.getStats(id),
      });
    },
  });

  perfil = computed(() => this.perfilResource.value()?.perfil ?? null);
  stats = computed(() => this.perfilResource.value()?.stats ?? null);
  loading = this.perfilResource.isLoading;

  isOperador = computed(() => this.perfil()?.perfil === 'operador');
  isInspetor = computed(() => this.perfil()?.perfil === 'inspetor');
  isGestor = computed(() => this.perfil()?.perfil === 'gestor');

  // Estados de edição
  isEditingPerfil = signal(false);
  isEditingSenha = signal(false);
  salvandoPerfil = signal(false);
  salvandoSenha = signal(false);

  erroPerfil = signal<string | null>(null);
  sucessoPerfil = signal<string | null>(null);
  erroSenha = signal<string | null>(null);
  sucessoSenha = signal<string | null>(null);

  formPerfil = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  formSenha = this.fb.nonNullable.group({
    senha_atual: ['', [Validators.required, Validators.minLength(8)]],
    nova_senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    // Sincroniza o formulário quando o perfil carregar
    effect(() => {
      const p = this.perfil();
      if (p && !this.isEditingPerfil()) {
        this.formPerfil.patchValue({
          nome: p.nome,
          email: p.email,
        });
      }
    });
  }

  toggleEditPerfil() {
    this.erroPerfil.set(null);
    this.sucessoPerfil.set(null);
    if (this.isEditingPerfil()) {
      // Cancela edição
      this.isEditingPerfil.set(false);
      const current = this.perfil();
      if (current) {
        this.formPerfil.patchValue({ nome: current.nome, email: current.email });
      }
    } else {
      this.isEditingPerfil.set(true);
    }
  }

  toggleEditSenha() {
    this.erroSenha.set(null);
    this.sucessoSenha.set(null);
    if (this.isEditingSenha()) {
      // Cancela edição
      this.isEditingSenha.set(false);
      this.formSenha.reset();
    } else {
      this.isEditingSenha.set(true);
    }
  }

  salvarPerfil() {
    if (this.formPerfil.invalid) return;
    const currentUserId = this.authService.usuario()?.id;
    if (!currentUserId) return;

    this.salvandoPerfil.set(true);
    this.erroPerfil.set(null);
    this.sucessoPerfil.set(null);

    const payload = this.formPerfil.getRawValue();

    this.usuarioService
      .updatePerfil(currentUserId, payload)
      .pipe(finalize(() => this.salvandoPerfil.set(false)))
      .subscribe({
        next: () => {
          this.perfilResource.reload();
          this.isEditingPerfil.set(false);
          this.sucessoPerfil.set('Perfil atualizado com sucesso.');
        },
        error: (err) => {
          this.erroPerfil.set(err.error?.message || 'Falha ao atualizar o perfil.');
        },
      });
  }

  salvarSenha() {
    if (this.formSenha.invalid) return;
    const currentUserId = this.authService.usuario()?.id;
    if (!currentUserId) return;

    this.salvandoSenha.set(true);
    this.erroSenha.set(null);
    this.sucessoSenha.set(null);

    const payload = this.formSenha.getRawValue();

    this.usuarioService
      .updateSenha(currentUserId, payload)
      .pipe(finalize(() => this.salvandoSenha.set(false)))
      .subscribe({
        next: () => {
          this.isEditingSenha.set(false);
          this.formSenha.reset();
          this.sucessoSenha.set('Senha alterada com sucesso.');
        },
        error: (err) => {
          this.erroSenha.set(err.error?.message || 'Falha ao alterar a senha.');
        },
      });
  }
}
