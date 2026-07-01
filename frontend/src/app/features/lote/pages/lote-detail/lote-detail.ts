import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { LoteFeatureService } from '../../services/lote.service.js';
import { AuthService } from '../../../../core/services/auth.service.js';
import {
  LoteStatus,
  STATUS_CONFIG,
  StatusConfig,
  RegistrarInspecaoDTO,
} from '../../../../shared/models/lote.models.js';
import { rxResource, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { SseClientService } from '../../../../core/services/sse-client.service.js';

const ROTULO_TURNO: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

// === TIPOS ===
interface InspecaoFormGroup {
  quantidade_reprovada: FormControl<number>;
  descricao_desvio: FormControl<string>;
}

@Component({
  selector: 'app-lote-detail',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './lote-detail.html',
  styleUrl: './lote-detail.css',
})
export class LoteDetail {
  // === DEPENDÊNCIAS ===
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loteService = inject(LoteFeatureService);
  private sseService = inject(SseClientService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // === ESTADO (ROTA) ===
  private params = toSignal(this.route.paramMap);
  private loteId = computed(() => Number(this.params()?.get('id')));

  // === RECURSOS ===
  private loteResource = rxResource({
    params: () => ({ id: this.loteId() }),
    stream: ({ params }) => this.loteService.obterLotePorId(params.id),
  });

  // === DERIVAÇÕES ===
  public lote = computed(() => this.loteResource.value() || null);
  public carregando = computed(() => this.loteResource.isLoading());
  public erro = computed(() =>
    this.loteResource.error() ? 'Não foi possível carregar os dados do lote.' : null,
  );

  // === FORMULÁRIO DE INSPEÇÃO ===
  public processando = signal(false);
  public erroInspecao = signal<string | null>(null);

  formInspecao = this.fb.nonNullable.group<InspecaoFormGroup>({
    quantidade_reprovada: this.fb.nonNullable.control(0, [
      Validators.required,
      Validators.min(0),
    ]),
    descricao_desvio: this.fb.nonNullable.control(''),
  });

  public qtdReprovadaInput = toSignal(
    this.formInspecao.controls.quantidade_reprovada.valueChanges,
    { initialValue: 0 },
  );

  // === DERIVAÇÕES DE INSPEÇÃO ===
  public dataAtual = new Date().toISOString();

  public taxaAprovacaoPreview = computed(() => {
    const planejada = this.lote()?.quantidade_planejada || 0;
    const reprovada = Number(this.qtdReprovadaInput()) || 0;
    if (planejada === 0) return 0;

    const taxa = ((planejada - reprovada) / planejada) * 100;
    return Math.max(0, Math.min(100, Math.round(taxa)));
  });

  public resultadoPreview = computed((): string => {
    const loteAtual = this.lote();
    if (!loteAtual) return '';

    const planejada = loteAtual.quantidade_planejada;
    const reprovada = Number(this.qtdReprovadaInput()) || 0;
    const pctRessalva = Number(loteAtual.produto.percentual_ressalva);

    if (reprovada === 0) return 'APROVADO';

    const taxaFalha = (reprovada / planejada) * 100;
    if (taxaFalha <= pctRessalva) return 'APROVADO COM RESTRIÇÃO';
    return 'REPROVADO';
  });

  constructor() {
    // === REAÇÃO: Validação dinâmica do campo quantidade_reprovada ===
    effect(() => {
      const loteAtual = this.lote();
      if (loteAtual) {
        const qtyCtrl = this.formInspecao.controls.quantidade_reprovada;
        qtyCtrl.setValidators([
          Validators.required,
          Validators.min(0),
          Validators.max(loteAtual.quantidade_planejada),
        ]);
        qtyCtrl.updateValueAndValidity({ emitEvent: false });
      }
    });

    // === REAÇÃO: Recarga em tempo real via SSE ===
    this.sseService.eventos$
      .pipe(
        takeUntilDestroyed(),
        filter((e) => e.tipo === 'lote:status_alterado' && e.dados.id === this.loteId()),
      )
      .subscribe(() => this.loteResource.reload());
  }

  // === MÉTODOS ===
  async salvarInspecao(): Promise<void> {
    const l = this.lote();
    if (!l || this.formInspecao.invalid) return;

    this.processando.set(true);

    try {
      const payload: RegistrarInspecaoDTO = this.formInspecao.getRawValue();
      await lastValueFrom(this.loteService.registrarInspecao(l.id, payload));
      this.erroInspecao.set(null);
      this.formInspecao.reset();
      this.loteResource.reload();
    } catch (err) {
      this.erroInspecao.set(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Não foi possível registrar a inspeção.'
          : 'Não foi possível registrar a inspeção.',
      );
    } finally {
      this.processando.set(false);
    }
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/lote']);
  }

  obterStatusConfig(status?: LoteStatus): StatusConfig {
    return (
      STATUS_CONFIG[status!] ?? {
        label: status ?? '',
        cor: '#ADAAAA',
        corBg: 'transparent',
        corBorda: '#484847',
      }
    );
  }

  rotuloTurno(turno?: string): string {
    return ROTULO_TURNO[turno ?? ''] ?? turno ?? '—';
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
