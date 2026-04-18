import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  processando = signal(false);

  /** Formulário de inspeção — o resultado é calculado automaticamente no backend */
  formInspecao = this.fb.nonNullable.group({
    quantidade_reprovada: [0, [Validators.required, Validators.min(0)]],
    descricao_desvio: [''],
  });

  qtdReprovadaInput = signal(0);

  /**
   * Preview da taxa de aprovação para feedback visual ao inspetor.
   * O cálculo definitivo acontece no backend.
   */
  taxaAprovacaoPreview = computed(() => {
    const planejada = this.lote()?.quantidade_planejada || 0;
    const reprovada = this.qtdReprovadaInput();
    if (planejada === 0) return 0;

    const taxa = ((planejada - reprovada) / planejada) * 100;
    return Math.max(0, Math.min(100, Math.round(taxa)));
  });

  /** Preview do resultado para mostrar o badge correto ao inspetor */
  resultadoPreview = computed((): string => {
    const loteAtual = this.lote();
    if (!loteAtual) return '';

    const planejada = loteAtual.quantidade_planejada;
    const reprovada = this.qtdReprovadaInput();
    const pctRessalva = Number(loteAtual.produto.percentual_ressalva);

    if (reprovada === 0) return 'APROVADO';

    const taxaFalha = (reprovada / planejada) * 100;
    if (taxaFalha <= pctRessalva) return 'APROVADO COM RESTRIÇÃO';
    return 'REPROVADO';
  });

  dataAtual = new Date().toISOString();

  ngOnInit(): void {
    this.carregarLote();

    this.formInspecao.get('quantidade_reprovada')?.valueChanges.subscribe((val) => {
      this.qtdReprovadaInput.set(Number(val) || 0);
    });
  }

  carregarLote(): void {
    this.route.paramMap
      .pipe(
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
        })
      )
      .subscribe({
        next: (lote) => {
          this.lote.set(lote);
          this.carregando.set(false);

          /** Limita a quantidade reprovada ao total planejado */
          const qtyCtrl = this.formInspecao.get('quantidade_reprovada');
          qtyCtrl?.setValidators([
            Validators.required,
            Validators.min(0),
            Validators.max(lote.quantidade_planejada),
          ]);
          qtyCtrl?.updateValueAndValidity();
        },
        error: () => {
          this.erro.set('Não foi possível carregar os dados do lote.');
          this.carregando.set(false);
        },
      });
  }

  salvarInspecao(): void {
    const l = this.lote();
    if (!l || this.formInspecao.invalid) return;

    this.processando.set(true);

    const payload = {
      quantidade_reprovada: this.formInspecao.value.quantidade_reprovada,
      descricao_desvio: this.formInspecao.value.descricao_desvio,
    };

    this.loteService
      .registrarInspecao(l.id, payload)
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: () => this.carregarLote(),
        error: (err) =>
          alert('Erro: ' + (err.error?.message || 'Erro desconhecido.')),
      });
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/lote']);
  }

  getStatusConfig(status?: LoteStatus): StatusConfig {
    return (
      STATUS_CONFIG[status!] ?? {
        label: status ?? '',
        cor: '#ADAAAA',
        corBg: 'transparent',
        corBorda: '#484847',
      }
    );
  }

  getTurnoLabel(turno?: string): string {
    return TURNO_LABEL[turno ?? ''] ?? turno ?? '—';
  }

  formatarData(data?: string | null): string {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }

  formatarDataHora(data?: string | null): string {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-BR');
  }
}
