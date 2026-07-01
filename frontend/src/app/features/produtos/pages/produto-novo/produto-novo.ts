import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProdutosService, CriarProdutoPayload } from '../../services/produtos.service.js';
import { lastValueFrom } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { WizardBaseComponent } from './components/wizard-base/wizard-base.component.js';
import { WizardReceitaComponent } from './components/wizard-receita/wizard-receita.component.js';

@Component({
  selector: 'app-produto-novo',
  standalone: true,
  imports: [ReactiveFormsModule, WizardBaseComponent, WizardReceitaComponent],
  templateUrl: './produto-novo.html',
})
export class ProdutoNovo {
  // === DEPENDÊNCIAS ===
  private fb = inject(FormBuilder);
  private produtosService = inject(ProdutosService);
  private router = inject(Router);

  // === ESTADO ===
  public etapaAtual = signal<1 | 2>(1);
  public salvando = signal(false);
  public erro = signal<string | null>(null);

  // === RECURSOS ===
  private categoriasResource = rxResource({
    stream: () => this.produtosService.listarCategorias(),
  });

  private mpsResource = rxResource({
    stream: () => this.produtosService.listarMateriasPrimas(),
  });

  public categoriasExistentes = computed(() => this.categoriasResource.value() || []);
  public materiasPrimas = computed(() => this.mpsResource.value() || []);

  // === FORMULÁRIOS ===
  public formBase = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    categoria: ['', [Validators.required]],
    linha_padrao: ['Linha A', [Validators.required]],
    percentual_ressalva: [
      10,
      [Validators.required, Validators.min(0), Validators.max(100)],
    ],
    ativo: [true],
  });

  public skuPreview = computed(() => {
    const nome = this.formBase.controls.nome.value;
    if (!nome || nome.length < 2) return 'PRD-...';

    const base = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 12);

    return `PRD-${base}`;
  });

  public receitaArray = this.fb.array<FormGroup>([]);

  public mpIdsNaReceita = computed(() => {
    return this.receitaArray.controls.map(
      (fg) => fg.get('materia_prima_id')?.value as number,
    );
  });

  public mpDisponiveis = computed(() => {
    const idsUsados = this.mpIdsNaReceita();
    return this.materiasPrimas().filter((mp) => !idsUsados.includes(mp.id));
  });

  // === NAVEGAÇÃO DO WIZARD ===
  public avancarEtapa(): void {
    if (this.formBase.invalid) {
      this.formBase.markAllAsTouched();
      return;
    }
    this.etapaAtual.set(2);
  }

  public voltarEtapa(): void {
    this.etapaAtual.set(1);
  }

  // === MANIPULAÇÃO DA RECEITA ===
  public adicionarItemReceita(materiaPrimaId: number): void {
    const mpId = Number(materiaPrimaId);
    if (!mpId) return;

    const indexExistente = this.receitaArray.controls.findIndex(
      (c) => c.get('materia_prima_id')?.value === mpId,
    );

    if (indexExistente !== -1) {
      const control = this.receitaArray.controls[indexExistente];
      const qtdeAtual = Number(control.get('quantidade')?.value) || 0;
      control.get('quantidade')?.setValue(qtdeAtual + 1);
      return;
    }

    const mp = this.materiasPrimas().find((m) => m.id === mpId);
    if (!mp) return;

    this.receitaArray.push(
      this.fb.nonNullable.group({
        materia_prima_id: [mp.id],
        materia_prima_nome: [mp.nome],
        unidade_medida: [mp.unidade_medida],
        quantidade: [1, [Validators.required, Validators.min(0.01)]],
        unidade: [mp.unidade_medida, [Validators.required]],
      }),
    );
  }

  public removerItemReceita(index: number): void {
    this.receitaArray.removeAt(index);
  }

  // === SUBMIT ===
  public voltarParaLista(): void {
    this.router.navigate(['/app/produtos']);
  }

  async onSubmit(): Promise<void> {
    if (this.formBase.invalid) {
      this.erro.set('Preencha todos os campos obrigatórios da base do produto.');
      return;
    }

    this.erro.set(null);
    this.salvando.set(true);

    const base = this.formBase.getRawValue();

    const payload: CriarProdutoPayload = {
      nome: base.nome,
      categoria: base.categoria,
      linha_padrao: base.linha_padrao,
      percentual_ressalva: base.percentual_ressalva,
      ativo: base.ativo,
      receita: this.receitaArray.controls.map((fg) => ({
        materia_prima_id: fg.get('materia_prima_id')?.value,
        quantidade: Number(fg.get('quantidade')?.value),
        unidade: fg.get('unidade')?.value,
      })),
    };

    try {
      await lastValueFrom(this.produtosService.criar(payload));
      this.router.navigate(['/app/produtos']);
    } catch (err) {
      this.erro.set(
        err instanceof HttpErrorResponse
          ? err.error?.message || 'Não foi possível salvar o produto.'
          : 'Não foi possível salvar o produto.',
      );
    } finally {
      this.salvando.set(false);
    }
  }
}
