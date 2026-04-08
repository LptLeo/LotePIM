import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email: string = '';
  password: string = '';

  login() {
    console.log(this.email, this.password);
    this.authService.login({ email: this.email, senha: this.password }).subscribe({
      next: () => {
        console.log('Login realizado com sucesso');
      },
      error: (error) => {
        console.log(error);
      },
      complete: () => {
        this.email = '';
        this.password = '';

        this.router.navigate(['/app/dashboard']);
      }
    })
  }
}
