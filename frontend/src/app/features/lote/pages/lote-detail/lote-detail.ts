import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap, finalize } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

import { LoteFeatureService } from '../../services/lote.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  LoteDetalhe,
  LoteStatus,
  STATUS_CONFIG,
  StatusConfig,
} from '../../../../shared/models/lote.models';

const TURNO_LABEL: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

@Component({
  selector: 'app-lote-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lote-detail.html',
  styleUrl: './lote-detail.css',
})
export class LoteDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loteService = inject(LoteFeatureService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  lote = signal<LoteDetalhe | null>(null);
  carregando = signal(true);
  erro = signal<string | null>(null);

  // Controle de edição para OPERADORES
  processando = signal(false);
  
  // Lista temporária de insumos que serão enviados à API juntos (se preferir múltiplo) ou um a um
  novosInsumos = signal<{ nome_insumo: string, codigo_insumo: string, lote_insumo: string, quantidade: number, unidade: string }[]>([]);

  formInsumo = this.fb.nonNullable.group({
    nome_insumo: ['', Validators.required],
    codigo_insumo: [''],
    lote_insumo: [''],
    quantidade: [0, [Validators.required, Validators.min(0.01)]],
    unidade: ['UNID', Validators.required]
  });

  ngOnInit(): void {
    this.carregarLote();
  }

  carregarLote() {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        if (!id || isNaN(id)) {
          this.erro.set('ID do lote inválido.');
          this.carregando.set(false);
          return EMPTY;
        }
        this.carregando.set(true);
        this.erro.set(null);
        return this.loteService.getLoteById(id);
      }),
    ).subscribe({
      next: (lote) => {
        this.lote.set(lote);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os dados do lote. Verifique sua conexão e tente novamente.');
        this.carregando.set(false);
      },
    });
  }

  adicionarInsumoNaLista() {
    if (this.formInsumo.invalid) return;

    const values = this.formInsumo.value;
    const novo = {
      nome_insumo: values.nome_insumo!,
      codigo_insumo: values.codigo_insumo || '',
      lote_insumo: values.lote_insumo || '',
      quantidade: values.quantidade!,
      unidade: values.unidade!
    };

    this.novosInsumos.update(lista => [...lista, novo]);
    this.formInsumo.reset({ quantidade: 0, unidade: 'UNID' });
  }

  removerInsumoDaLista(index: number) {
    this.novosInsumos.update(lista => lista.filter((_, i) => i !== index));
  }

  salvarInsumos() {
    const arr = this.novosInsumos();
    const l = this.lote();
    if (!l || arr.length === 0) return;

    this.processando.set(true);
    this.loteService.vincularInsumos(l.id, arr)
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: () => {
          this.novosInsumos.set([]);
          this.carregarLote(); // Recarrega os detalhes do backend
        },
        error: (err) => {
          console.error(err);
          alert('Erro ao vincular insumos: ' + (err.error?.message || 'Erro desconhecido.'));
        }
      });
  }

  encerrarProducao() {
    const l = this.lote();
    if (!l) return;

    if (!confirm('Tem certeza que deseja finalizar a produção deste lote? Não será possível adicionar ou remover insumos depois disso.')) {
      return;
    }

    this.processando.set(true);
    this.loteService.encerrarProducao(l.id)
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: () => {
          this.carregarLote(); // Recarrega para ver o novo status
        },
        error: (err) => {
          console.error(err);
          alert('Erro ao encerrar produção: ' + (err.error?.message || 'Erro desconhecido.'));
        }
      });
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/lote']);
  }

  // ── Utilitários de template ─────────────────────────────────────────────

  getStatusConfig(status?: LoteStatus): StatusConfig {
    return STATUS_CONFIG[status!] ?? {
      label: status ?? '',
      cor: '#ADAAAA',
      corBg: 'transparent',
      corBorda: '#484847',
    };
  }

  getTurnoLabel(turno?: string): string {
    return TURNO_LABEL[turno ?? ''] ?? turno ?? '—';
  }

  formatarData(data?: string): string {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatarDataHora(data?: string): string {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  calcularTaxaAprovacao(prod: number, repr: number): number {
    if (!prod) return 0;
    return Math.round(((prod - repr) / prod) * 100);
  }
}
