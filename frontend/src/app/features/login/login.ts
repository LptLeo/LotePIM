import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service.js';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // === INJEÇÃO DE DEPENDÊNCIAS ===

  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // === ESTADO ===

  public mensagemErro = signal('');
  public estaCarregando = signal(false);

  // === FORMULÁRIO ===

  public loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  // === AUTENTICAÇÃO ===

  public async login(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.estaCarregando.set(true);
    this.mensagemErro.set('');

    try {
      const credenciais = this.loginForm.getRawValue();
      await lastValueFrom(this.authService.login(credenciais));
      this.loginForm.reset();
      this.router.navigate(['/app/dashboard']);
    } catch (err) {
      const erroHttp = err instanceof HttpErrorResponse ? err : null;
      const status = erroHttp?.status;

      if (status === 0) {
        this.mensagemErro.set(
          'Erro de conexão. Verifique sua internet ou se o servidor está online.',
        );
      } else {
        const msg = erroHttp?.error?.message;

        this.mensagemErro.set(msg || 'Ocorreu um erro inesperado ao fazer login.');
      }
    } finally {
      this.estaCarregando.set(false);
    }
  }
}
