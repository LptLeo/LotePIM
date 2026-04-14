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
  InsumoMaster,
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
  insumosMaster = signal<InsumoMaster[]>([]);

  // Lista temporária de insumos que serão enviados à API juntos (se preferir múltiplo) ou um a um
  novosInsumos = signal<{ nome_insumo: string, codigo_insumo: string, lote_insumo: string, quantidade: number, unidade: string }[]>([]);

  totalInsumos = computed(() => {
    const salvos = this.lote()?.insumos?.length || 0;
    const pendentes = this.novosInsumos().length;
    return salvos + pendentes;
  });

  formInsumo = this.fb.nonNullable.group({
    nome_insumo: ['', Validators.required],
    codigo_insumo: [''],
    lote_insumo: [''],
    quantidade: [0, [Validators.required, Validators.min(0.01)]],
    unidade: ['UNID', Validators.required]
  });

  // Controle de edição para INSPETORES
  qtdReprovadaInput = signal(0);
  
  formInspecao = this.fb.nonNullable.group({
    resultado: ['' as LoteStatus | '', Validators.required],
    quantidade_repr: [0, [Validators.required, Validators.min(0)]],
    descricao_desvio: ['']
  });

  taxaAprovacaoPreview = computed(() => {
    const prod = this.lote()?.quantidade_prod || 0;
    const repr = this.qtdReprovadaInput();
    if (prod === 0) return 0;
    const taxa = ((prod - repr) / prod) * 100;
    return Math.max(0, Math.min(100, Math.round(taxa)));
  });

  dataAtual = new Date().toISOString();

  ngOnInit(): void {
    this.carregarLote();
    this.carregarInsumosMaster();

    this.formInspecao.get('quantidade_repr')?.valueChanges.subscribe(val => {
      this.qtdReprovadaInput.set(Number(val) || 0);
    });

    // Validação condicional para descrição de desvio
    this.formInspecao.get('resultado')?.valueChanges.subscribe(res => {
      const descCtrl = this.formInspecao.get('descricao_desvio');
      if (res === 'reprovado' || res === 'aprovado_restricao') {
        descCtrl?.setValidators([Validators.required]);
      } else {
        descCtrl?.clearValidators();
      }
      descCtrl?.updateValueAndValidity();
    });
  }

  carregarInsumosMaster() {
    this.loteService.getInsumosMaster().subscribe({
      next: (insumos) => this.insumosMaster.set(insumos),
      error: (err) => console.error('Erro ao carregar insumos mestre:', err)
    });
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
        
        // Aplica o limite máximo de reprovação com base no que foi produzido
        const qtyCtrl = this.formInspecao.get('quantidade_repr');
        qtyCtrl?.setValidators([Validators.required, Validators.min(0), Validators.max(lote.quantidade_prod)]);
        qtyCtrl?.updateValueAndValidity();
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

  onInsumoSelected(event: Event) {
    const id = Number((event.target as HTMLSelectElement).value);
    const insumo = this.insumosMaster().find(i => i.id === id);

    if (insumo) {
      this.formInsumo.patchValue({
        nome_insumo: insumo.nome,
        codigo_insumo: insumo.codigo,
        unidade: insumo.unidade_padrao
      });
    }
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

  salvarInspecao() {
    const l = this.lote();
    const u = this.authService.usuario();
    if (!l || !u || this.formInspecao.invalid) return;

    this.processando.set(true);

    const payload = {
      inspetor_id: u.id, // pegando pelo auth service local
      resultado: this.formInspecao.value.resultado,
      quantidade_repr: this.formInspecao.value.quantidade_repr,
      descricao_desvio: this.formInspecao.value.descricao_desvio
    };

    this.loteService.registrarInspecao(l.id, payload)
      .pipe(finalize(() => this.processando.set(false)))
      .subscribe({
        next: () => {
          this.carregarLote(); // Recarrega para ver o relatório
        },
        error: (err) => {
          console.error(err);
          alert('Erro ao registrar inspeção: ' + (err.error?.message || 'Erro desconhecido.'));
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
