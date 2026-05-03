import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { LoteFeatureService } from '../../services/lote.service.js';
import { AuthService } from '../../../../core/services/auth.service.js';
import {
  LoteDetalhe,
  LoteStatus,
  STATUS_CONFIG,
  StatusConfig,
} from '../../../../shared/models/lote.models.js';
import { rxResource } from '@angular/core/rxjs-interop';

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
export class LoteDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loteService = inject(LoteFeatureService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  /** Signal que reflete o ID atual da rota */
  params = toSignal(this.route.paramMap);
  loteId = computed(() => Number(this.params()?.get('id')));

  /** 
   * Resource Reativo: Busca o lote sempre que o ID mudar.
   */
  loteResource = rxResource({
    params: () => ({ id: this.loteId() }),
    stream: ({ params }) => this.loteService.getLoteById(params.id)
  });

  // Derivações reativas
  lote = computed(() => this.loteResource.value() || null);
  carregando = computed(() => this.loteResource.isLoading());
  erro = computed(() => this.loteResource.error() ? 'Não foi possível carregar os dados do lote.' : null);
  
  processando = signal(false);

  /** Formulário de inspeção */
  formInspecao = this.fb.nonNullable.group({
    quantidade_reprovada: [0, [Validators.required, Validators.min(0)]],
    descricao_desvio: [''],
  });

  qtdReprovadaInput = signal(0);

  constructor() {
    /** 
     * Sincroniza a validação do formulário com a quantidade planejada do lote 
     * assim que o lote é carregado ou alterado.
     */
    effect(() => {
      const loteAtual = this.lote();
      if (loteAtual) {
        const qtyCtrl = this.formInspecao.get('quantidade_reprovada');
        qtyCtrl?.setValidators([
          Validators.required,
          Validators.min(0),
          Validators.max(loteAtual.quantidade_planejada),
        ]);
        qtyCtrl?.updateValueAndValidity();
      }
    });

    /** Sincroniza o sinal de preview com as mudanças no formulário */
    this.formInspecao.get('quantidade_reprovada')?.valueChanges.subscribe((val) => {
      this.qtdReprovadaInput.set(Number(val) || 0);
    });
  }

  /**
   * Preview da taxa de aprovação para feedback visual ao inspetor.
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
        next: () => this.loteResource.reload(),
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
