import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  Produto,
  InsumoEstoque,
  CriarLoteDTO,
} from '../../../../shared/models/lote.models.js';
import { finalize, of } from 'rxjs';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { LoteInsumoItemComponent } from './components/lote-insumo-item/lote-insumo-item.js';
import { criarLoteSchema } from '../../../../core/schemas/lote.schema.js';
import { ZodError } from 'zod';

/** Interface para o FormGroup de cada item de consumo */
export interface ConsumoFormGroup {
  materia_prima_id: FormControl<number>;
  materia_prima_nome: FormControl<string>;
  quantidade_necessaria: FormControl<number>;
  unidade: FormControl<string>;
  insumo_estoque_id: FormControl<number>;
  quantidade_consumida: FormControl<number>;
}

/** Interface para o FormGroup principal do Lote */
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
  imports: [CommonModule, ReactiveFormsModule, LoteInsumoItemComponent],
  templateUrl: './lote-novo.html',
})
export class LoteNovo implements OnInit {
  private fb = inject(FormBuilder);
  private loteService = inject(LoteFeatureService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private getHojeLocal(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private getTurnoAtual(): 'manha' | 'tarde' | 'noite' {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'manha';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noite';
  }

  /** Formulário Tipado */
  form = this.fb.nonNullable.group<LoteFormGroup>({
    produto_id: this.fb.nonNullable.control(0, [Validators.required, Validators.min(1)]),
    data_producao: this.fb.nonNullable.control(this.getHojeLocal(), [
      Validators.required,
    ]),
    turno: this.fb.nonNullable.control(this.getTurnoAtual(), [Validators.required]),
    quantidade_planejada: this.fb.nonNullable.control(0, [
      Validators.required,
      Validators.min(1),
    ]),
    data_validade: this.fb.nonNullable.control(''),
    sem_validade: this.fb.nonNullable.control(true),
    observacoes: this.fb.nonNullable.control(''),
    consumos: this.fb.array<FormGroup<ConsumoFormGroup>>([]),
  });

  /** Sinais reativos a partir dos controles do formulário */
  produtoIdSignal = toSignal(this.form.controls.produto_id.valueChanges, {
    initialValue: 0,
  });
  qtdPlanejadaSignal = toSignal(this.form.controls.quantidade_planejada.valueChanges, {
    initialValue: 0,
  });
  semValidadeSignal = toSignal(this.form.controls.sem_validade.valueChanges, {
    initialValue: true,
  });

  /** Resource para carregar os produtos cadastrados */
  produtosResource = rxResource({
    stream: () => this.loteService.getProdutos(),
  });

  produtos = computed(() => this.produtosResource.value() || []);

  /** Produto selecionado reagindo ao sinal do dropdown */
  produtoSelecionado = computed(() => {
    const id = Number(this.produtoIdSignal());
    return this.produtos().find((p) => p.id === id) ?? null;
  });

  /** Resource para carregar insumos disponíveis apenas para as matérias-primas da receita */
  insumosResource = rxResource({
    params: () => {
      const produto = this.produtoSelecionado();
      return produto?.receita?.map((r) => r.materiaPrima.id) || [];
    },
    stream: ({ params: mpIds }) => {
      if (!mpIds.length) return of([]);
      return this.loteService.getInsumosDisponiveis(mpIds);
    },
  });

  insumosList = computed(() => this.insumosResource.value() || []);

  /** Insumos em estoque disponíveis, agrupados por matéria-prima ID */
  insumosDisponiveis = computed(() => {
    const mapa = new Map<number, InsumoEstoque[]>();
    for (const insumo of this.insumosList()) {
      const mpId = insumo.materiaPrima.id;
      const lista = mapa.get(mpId) ?? [];
      lista.push(insumo);
      mapa.set(mpId, lista);
    }
    return mapa;
  });

  salvando = signal(false);
  erro = signal<string | null>(null);
  fieldErrors = signal<Record<string, string>>({});
  carregandoInsumos = computed(() => this.insumosResource.isLoading());

  constructor() {
    /**
     * Reação 1: Mudança de Produto
     * Reconstrói o FormArray de consumos de forma declarativa.
     */
    effect(() => {
      const produto = this.produtoSelecionado();
      this.consumosArray.clear();

      if (!produto || !produto.receita?.length) return;

      const qtdPlanejada = Number(this.qtdPlanejadaSignal()) || 1;

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

    /**
     * Reação 2: Mudança na Quantidade Planejada
     * Recalcula quantidades sugeridas de consumo sem subscrição manual.
     * Guarda de array vazio evita corrida com o Effect 1 durante troca de produto.
     */
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

    /**
     * Reação 3: Controle de Validade
     * Gerencia habilitação do campo de forma declarativa.
     */
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

  get consumosArray() {
    return this.form.controls.consumos;
  }

  get dataFormatada(): string {
    const data = this.form.controls.data_producao.value;
    if (!data) return 'DD/MM/AAAA';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  ngOnInit(): void {
    /** Pré-preenche o produto se vier via Query Param */
    const produtoIdParam = this.route.snapshot.queryParamMap.get('produtoId');
    if (produtoIdParam) {
      const pid = Number(produtoIdParam);
      if (!isNaN(pid) && pid > 0) {
        this.form.controls.produto_id.setValue(pid);
      }
    }
  }

  getInsumosParaMP(materiaPrimaId: number): InsumoEstoque[] {
    return this.insumosDisponiveis().get(materiaPrimaId) ?? [];
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/lote']);
  }

  onSubmit(): void {
    this.erro.set(null);
    this.fieldErrors.set({});

    const formValue = this.form.getRawValue();

    try {
      // Validação com Zod usando o valor bruto do formulário tipado
      criarLoteSchema.parse(formValue);
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
      return;
    }

    this.salvando.set(true);

    const payload: CriarLoteDTO = {
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

    this.loteService
      .createLote(payload)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (loteGerado) => {
          this.router.navigate(['/app/lote', loteGerado.id]);
        },
        error: (err) => {
          console.error('[LoteNovo] Erro ao criar lote:', err);

          // Se for erro de validação do backend (400) com detalhes por campo
          if (err.status === 400 && err.error?.details) {
            console.table(err.error.details);
            const backendErrors: Record<string, string> = {};
            err.error.details.forEach((e: any) => {
              const path = e.campo || 'geral';
              backendErrors[path] = e.mensagem;
            });
            this.fieldErrors.set(backendErrors);
            this.erro.set(
              'Erro de validação no servidor. Verifique os campos destacados.',
            );
          } else {
            this.erro.set(
              err.error?.message ||
                'Não foi possível criar o lote. Verifique se há estoque suficiente.',
            );
          }
        },
      });
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
