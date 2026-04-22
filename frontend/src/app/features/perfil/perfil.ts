import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgIf, DatePipe } from '@angular/common';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { UsuarioService, UsuarioPerfil, UsuarioStats } from '../../core/services/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-perfil',
  imports: [NgIf, DatePipe, PageHeaderComponent],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);

  perfil = signal<UsuarioPerfil | null>(null);
  stats = signal<UsuarioStats | null>(null);
  loading = signal(true);

  isOperador = computed(() => this.perfil()?.perfil === 'operador');
  isInspetor = computed(() => this.perfil()?.perfil === 'inspetor');
  isGestor = computed(() => this.perfil()?.perfil === 'gestor');

  ngOnInit() {
    const user = this.authService.usuario();
    if (user?.id) {
      forkJoin({
        perfil: this.usuarioService.getPerfil(user.id),
        stats: this.usuarioService.getStats(user.id)
      }).subscribe({
        next: (res) => {
          this.perfil.set(res.perfil);
          this.stats.set(res.stats);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erro ao carregar perfil', err);
          this.loading.set(false);
        }
      });
    }
  }
}
