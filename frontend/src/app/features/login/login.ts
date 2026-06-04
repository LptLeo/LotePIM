import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service.js';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  errorMessage = signal('');
  isLoading = signal(false);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  login(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.loginForm.reset();
        this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);

        if (err.status === 0) {
          this.errorMessage.set(
            'Erro de conexão. Verifique sua internet ou se o servidor está online.',
          );
          return;
        }

        this.errorMessage.set(
          err.error?.message || 'Ocorreu um erro inesperado ao fazer login.',
        );
      },
    });
  }
}
