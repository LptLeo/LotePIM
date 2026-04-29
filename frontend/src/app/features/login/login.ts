import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service.js';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  ngOnInit() {
    // Verifica se há um motivo de logout forçado (ex: conta desativada)
    this.route.queryParams.subscribe(params => {
      if (params['motivo'] === 'desativado') {
        this.errorMessage = 'Sua conta foi desativada pelo administrador. Acesso negado.';
        this.cdr.detectChanges();
      }
    });
  }

  login() {
    this.errorMessage = '';
    this.isLoading = true;
    this.authService.login({ email: this.email, senha: this.password }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        
        // Cobre o caso do backend retornar status 200, mas com objeto de erro
        if (res && (res.error || res.message)) {
          this.errorMessage = res.error || res.message;
          if (this.errorMessage.toLowerCase().includes('not found') || this.errorMessage.toLowerCase().includes('inválid')) {
             this.errorMessage = 'Email ou senha não cadastrados no sistema.';
          }
          this.cdr.detectChanges();
          return;
        }

        this.email = '';
        this.password = '';
        this.router.navigate(['/app/dashboard']);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erro ao realizar login:', error);

        // Tenta pegar a mensagem específica enviada pelo backend
        let msg = error?.error?.message || error?.error?.error || error?.error;
        if (typeof msg === 'object') {
           msg = null; // evita objetos vazando
        }

        if (msg) {
          // Se o back mandar a string direto com a validação exata (ex: 'Email Incorreto' ou 'Senha Inválida')
          this.errorMessage = msg;
        } else if (error.status === 404) {
          this.errorMessage = 'Email não cadastrado no sistema.';
        } else if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'A senha informada está incorreta.';
        } else if (error.status === 0) {
          this.errorMessage = 'Erro de conexão com o servidor. Verifique sua internet.';
        } else {
          this.errorMessage = 'Email ou senha não constam em nossos registros.';
        }
        
        this.cdr.detectChanges(); // Garante que o loading irá parar se a detecção falhar
      }
    })
  }
}
