import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.js';
import { UsuarioService, UsuarioPerfil, UsuarioStats } from '../../core/services/usuario.service.js';
import { AuthService } from '../../core/services/auth.service.js';
import { forkJoin, finalize } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [NgIf, DatePipe, PageHeaderComponent, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  perfil = signal<UsuarioPerfil | null>(null);
  stats = signal<UsuarioStats | null>(null);
  loading = signal(true);

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

  ngOnInit() {
    this.carregarDados();
  }

  carregarDados() {
    this.loading.set(true);
    const user = this.authService.usuario();
    if (user?.id) {
      forkJoin({
        perfil: this.usuarioService.getPerfil(user.id),
        stats: this.usuarioService.getStats(user.id)
      }).subscribe({
        next: (res) => {
          this.perfil.set(res.perfil);
          this.stats.set(res.stats);
          
          this.formPerfil.patchValue({
            nome: res.perfil.nome,
            email: res.perfil.email
          });
          
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erro ao carregar perfil', err);
          this.loading.set(false);
        }
      });
    }
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

    this.usuarioService.updatePerfil(currentUserId, payload)
      .pipe(finalize(() => this.salvandoPerfil.set(false)))
      .subscribe({
        next: (atualizado) => {
          this.perfil.set(atualizado);
          this.isEditingPerfil.set(false);
          this.sucessoPerfil.set('Perfil atualizado com sucesso.');
          
          // Atualiza a visualização do header atualizando o sinal local no authService se aplicável
          // Como o authService apenas tem o payload básico decodificado do JWT, uma alteração de nome/email
          // não refletirá no Header até o próximo login (pois o JWT precisaria ser renovado). 
          // Para forçar a renovação local (se a API suportar) precisaria chamar o refresh ou relogar,
          // mas vamos apenas exibir o sucesso para o usuário.
        },
        error: (err) => {
          this.erroPerfil.set(err.error?.message || 'Falha ao atualizar o perfil.');
        }
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

    this.usuarioService.updateSenha(currentUserId, payload)
      .pipe(finalize(() => this.salvandoSenha.set(false)))
      .subscribe({
        next: () => {
          this.isEditingSenha.set(false);
          this.formSenha.reset();
          this.sucessoSenha.set('Senha alterada com sucesso.');
        },
        error: (err) => {
          this.erroSenha.set(err.error?.message || 'Falha ao alterar a senha.');
        }
      });
  }
}
