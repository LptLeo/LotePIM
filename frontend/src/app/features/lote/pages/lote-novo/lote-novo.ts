import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoteFeatureService } from '../../services/lote.service';
import { Produto } from '../../../../shared/models/lote.models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-lote-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lote-novo.html',
})
export class LoteNovo implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private loteService = inject(LoteFeatureService);
  private router = inject(Router);

  produtos = signal<Produto[]>([]);
  salvando = signal(false);
  erro = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    produto: [0, [Validators.required, Validators.min(1)]],
    data_producao: [new Date().toISOString().split('T')[0], [Validators.required]],
    turno: ['manha', [Validators.required]],
    quantidade_prod: [0, [Validators.required, Validators.min(1)]],
    observacoes: ['']
  });

  ngOnInit(): void {
    const user = this.authService.usuario();
    if (user?.perfil !== 'operador') {
      // Redireciona se não for operador
      this.router.navigate(['/app/lote']);
      return;
    }

    this.carregarProdutos();
  }

  carregarProdutos() {
    this.loteService.getProdutos().subscribe({
      next: (prods) => this.produtos.set(prods),
      error: (err) => {
        console.error('Erro ao buscar produtos:', err);
        this.erro.set('Falha ao carregar lista de produtos.');
      }
    });
  }

  voltarParaLista() {
    this.router.navigate(['/app/lote']);
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.erro.set(null);
    this.salvando.set(true);

    const user = this.authService.usuario();
    if (!user) return;

    const dados = {
      produto: Number(this.form.value.produto),
      operador: user.id,
      data_producao: this.form.value.data_producao!,
      turno: this.form.value.turno!,
      quantidade_prod: Number(this.form.value.quantidade_prod),
      observacoes: this.form.value.observacoes || ''
    };

    console.log('Enviando dados:', dados);

    this.loteService.createLote(dados)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (loteGerado: any) => {
          this.router.navigate(['/app/lote', loteGerado.id]);
        },
        error: (err) => {
          console.error('Erro ao salvar lote', err);
          this.erro.set('Não foi possível criar o lote. Verifique se o backend está retornando o erro correto. ' + (err.error?.message || ''));
        }
      });
  }
}
