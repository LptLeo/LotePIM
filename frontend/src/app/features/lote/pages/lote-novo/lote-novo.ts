import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LoteFeatureService } from '../../services/lote.service.js';
import type {
  InsumoEstoque,
  CriarLoteDTO,
} from '../../../../shared/models/lote.models.js';
import { of, lastValueFrom } from 'rxjs';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { LoteInsumoItemComponent } from './components/lote-insumo-item/lote-insumo-item.js';
import { criarLoteSchema } from '../../../../core/schemas/lote.schema.js';
import { ZodError } from 'zod';

// === TIPOS ===
interface ConsumoFormGroup {
  materia_prima_id: FormControl<number>;
  materia_prima_nome: FormControl<string>;
  quantidade_necessaria: FormControl<number>;
  unidade: FormControl<string>;
  insumo_estoque_id: FormControl<number>;
  quantidade_consumida: FormControl<number>;
}

interface LoteFormGroup {
  produto_id: FormControl<number>;
  data_producao: FormControl<string>;
  turno: FormControl<'manha' | 'tarde' | 'noite'>;
  quantidade_planejada: FormControl<number>;
  data_validade: FormControl<string>;
  sem_validade: FormControl<boolean>;
  observacoes: FormControl<string>;
  consumos: FormArray<FormGroup<ConsumoFormGroup>>;
}

@Component({
  selector: 'app-lote-novo',
  standalone: true,
  imports: [ReactiveFormsModule, LoteInsumoItemComponent],
  templateUrl: './lote-novo.html',
})
export class LoteNovo {
  // === DEPENDÊNCIAS ===
  private fb = inject(FormBuilder);
  private loteService = inject(LoteFeatureService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // === FORMULÁRIO ===
  form = this.fb.nonNullable.group<LoteFormGroup>({
    produto_id: this.fb.nonNullable.control(0, [Validators.required, Validators.min(1)]),
    data_producao: this.fb.nonNullable.control(this.obterHojeLocal(), [
      Validators.required,
    ]),
    turno: this.fb.nonNullable.control(this.obterTurnoAtual(), [Validators.required]),
    quantidade_planejada: this.fb.nonNullable.control(0, [
      Validators.required,
      Validators.min(1),
    ]),
    data_validade: this.fb.nonNullable.control(''),
    sem_validade: this.fb.nonNullable.control(true),
    observacoes: this.fb.nonNullable.control(''),
    consumos: this.fb.array<FormGroup<ConsumoFormGroup>>([]),
  });

  // === SINAIS DE FORMULÁRIO ===
  produtoIdSignal = toSignal(this.form.controls.produto_id.valueChanges, {
    initialValue: 0,
  });
  qtdPlanejadaSignal = toSignal(this.form.controls.quantidade_planejada.valueChanges, {
    initialValue: 0,
  });
  semValidadeSignal = toSignal(this.form.controls.sem_validade.valueChanges, {
    initialValue: true,
  });

  // === ESTADO ===
  salvando = signal(false);
  erro = signal<string | null>(null);
  fieldErrors = signal<Record<string, string>>({});

  // === RECURSOS ===
  private produtosResource = rxResource({
    stream: () => this.loteService.listarProdutos(),
  });

  public produtos = computed(() => this.produtosResource.value() || []);

  public produtoSelecionado = computed(() => {
    const id = Number(this.produtoIdSignal());
    return this.produtos().find((p) => p.id === id) ?? null;
  });

  private insumosResource = rxResource({
    params: () => this.produtoIdSignal(),
    stream: ({ params: produtoId, abortSignal: _abortSignal }) => {
      if (!produtoId) return of([]);
      const produto = this.produtos().find((p) => p.id === Number(produtoId));
      const mpIds = produto?.receita?.map((r) => r.materiaPrima.id) || [];
      if (!mpIds.length) return of([]);
      return this.loteService.obterInsumosDisponiveis(mpIds);
    },
  });

  private insumosList = computed(() => this.insumosResource.value() || []);

  insumosDisponiveis = computed(() => {
    if (this.insumosResource.isLoading()) return new Map<number, InsumoEstoque[]>();
    const mapa = new Map<number, InsumoEstoque[]>();
    for (const insumo of this.insumosList()) {
      const mpId = insumo.materiaPrima.id;
      const lista = mapa.get(mpId) ?? [];
      lista.push(insumo);
      mapa.set(mpId, lista);
    }
    return mapa;
  });

  carregandoInsumos = computed(() => this.insumosResource.isLoading());

  // === GETTERS ===
  get consumosArray() {
    return this.form.controls.consumos;
  }

  get dataFormatada(): string {
    const data = this.form.controls.data_producao.value;
    if (!data) return 'DD/MM/AAAA';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  constructor() {
    // === INICIALIZAÇÃO ===
    const produtoIdParam = this.route.snapshot.queryParamMap.get('produtoId');
    if (produtoIdParam) {
      const pid = Number(produtoIdParam);
      if (!isNaN(pid) && pid > 0) {
        this.form.controls.produto_id.setValue(pid);
      }
    }

    // === REAÇÃO: Mudança de Produto — reconstrói consumos ===
    effect(() => {
      const produto = this.produtoSelecionado();
      this.consumosArray.clear();

      if (!produto || !produto.receita?.length) return;

      const qtdPlanejada = untracked(() => Number(this.qtdPlanejadaSignal())) || 1;

      for (const item of produto.receita) {
        const consumidoInicial = this.calcularQuantidadeConsumida(
          item.quantidade,
          qtdPlanejada,
          item.unidade,
        );

        this.consumosArray.push(
          this.fb.nonNullable.group<ConsumoFormGroup>({
            materia_prima_id: this.fb.nonNullable.control(item.materiaPrima.id),
            materia_prima_nome: this.fb.nonNullable.control(item.materiaPrima.nome),
            quantidade_necessaria: this.fb.nonNullable.control(item.quantidade),
            unidade: this.fb.nonNullable.control(item.unidade),
            insumo_estoque_id: this.fb.nonNullable.control(0, [
              Validators.required,
              Validators.min(1),
            ]),
            quantidade_consumida: this.fb.nonNullable.control(consumidoInicial, [
              Validators.required,
              Validators.min(0),
            ]),
          }),
        );
      }
    });

    // === REAÇÃO: Mudança na Quantidade Planejada — recalcula consumos ===
    effect(() => {
      const qtdPlanejada = Number(this.qtdPlanejadaSignal()) || 1;
      if (!this.consumosArray.length) return;

      this.consumosArray.controls.forEach((ctrl) => {
        const unidade = ctrl.controls.unidade.value;
        const necessita = ctrl.controls.quantidade_necessaria.value;
        const novoValor = this.calcularQuantidadeConsumida(
          necessita,
          qtdPlanejada,
          unidade,
        );
        ctrl.controls.quantidade_consumida.setValue(novoValor);
      });
    });

    // === REAÇÃO: Controle de Validade ===
    effect(() => {
      const semValidade = this.semValidadeSignal();
      if (semValidade) {
        this.form.controls.data_validade.disable();
        this.form.controls.data_validade.setValue('');
      } else {
        this.form.controls.data_validade.enable();
      }
    });
  }

  // === MÉTODOS PÚBLICOS ===
  getInsumosParaMP(materiaPrimaId: number): InsumoEstoque[] {
    return this.insumosDisponiveis().get(materiaPrimaId) ?? [];
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/lote']);
  }

  async onSubmit(): Promise<void> {
    this.erro.set(null);
    this.fieldErrors.set({});

    const formValue = this.form.getRawValue();

    if (!this.validarComZod(formValue)) return;

    this.salvando.set(true);

    const dadosCriacao = this.buildPayload(formValue);

    try {
      const loteGerado = await lastValueFrom(this.loteService.criarLote(dadosCriacao));
      this.router.navigate(['/app/lote', loteGerado.id]);
    } catch (err) {
      this.handleSubmitError(err);
    } finally {
      this.salvando.set(false);
    }
  }

  // === MÉTODOS PRIVADOS ===
  private obterHojeLocal(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private obterTurnoAtual(): 'manha' | 'tarde' | 'noite' {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'manha';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noite';
  }

  private validarComZod(formValue: Record<string, unknown>): boolean {
    try {
      criarLoteSchema.parse(formValue);
      return true;
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((e) => {
          if (e.path[0]) {
            errors[e.path[0].toString()] = e.message;
          }
        });
        this.fieldErrors.set(errors);
        this.erro.set('Existem erros no formulário. Por favor, corrija-os.');
      }
      return false;
    }
  }

  private buildPayload(
    formValue: ReturnType<typeof this.form.getRawValue>,
  ): CriarLoteDTO {
    return {
      produto_id: formValue.produto_id,
      data_producao: formValue.data_producao,
      turno: formValue.turno,
      quantidade_planejada: formValue.quantidade_planejada,
      data_validade: formValue.sem_validade ? null : formValue.data_validade || null,
      observacoes: formValue.observacoes,
      consumos: formValue.consumos.map((c) => ({
        insumo_estoque_id: Number(c.insumo_estoque_id),
        quantidade_consumida: Number(c.quantidade_consumida),
      })),
    };
  }

  private handleSubmitError(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.status === 400 && err.error?.details) {
      const backendErrors: Record<string, string> = {};
      err.error.details.forEach((e: { campo?: string; mensagem: string }) => {
        const path = e.campo || 'geral';
        backendErrors[path] = e.mensagem;
      });
      this.fieldErrors.set(backendErrors);
      this.erro.set('Erro de validação no servidor. Verifique os campos destacados.');
    } else {
      this.erro.set(
        err instanceof HttpErrorResponse
          ? err.error?.message ||
              'Não foi possível criar o lote. Verifique se há estoque suficiente.'
          : 'Não foi possível criar o lote. Verifique se há estoque suficiente.',
      );
    }
  }

  private calcularQuantidadeConsumida(
    quantidadeBase: number,
    qtdPlanejada: number,
    unidade: string,
  ): number {
    const calculado = quantidadeBase * qtdPlanejada;
    return unidade === 'UN' ? Math.floor(calculado) : Number(calculado.toFixed(2));
  }
}
