import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProdutosService, CriarProdutoPayload } from '../../services/produtos.service';
import type { MateriaPrima } from '../../../../shared/models/lote.models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-produto-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './produto-novo.html',
})
export class ProdutoNovo implements OnInit {
  private fb = inject(FormBuilder);
  private produtosService = inject(ProdutosService);
  private router = inject(Router);

  /** Controle do wizard de 2 etapas */
  etapaAtual = signal<1 | 2>(1);

  salvando = signal(false);
  erro = signal<string | null>(null);

  categoriasExistentes = signal<string[]>([]);
  materiasPrimas = signal<MateriaPrima[]>([]);

  // ─── Formulário da Etapa 1: Dados Base ───
  formBase = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    categoria: ['', [Validators.required]],
    linha_padrao: ['Linha A', [Validators.required]],
    percentual_ressalva: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    ativo: [true],
  });

  /** SKU gerado automaticamente — preview apenas */
  skuPreview = computed(() => {
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

  // ─── Formulário da Etapa 2: Receita ───
  receitaArray = this.fb.array<FormGroup>([]);

  /** Matérias-primas já adicionadas à receita (IDs) */
  mpIdsNaReceita = computed(() => {
    return this.receitaArray.controls.map(
      (fg) => fg.get('materia_prima_id')?.value as number
    );
  });

  /** Matérias-primas disponíveis para adicionar (filtradas) */
  mpDisponiveis = computed(() => {
    const idsUsados = this.mpIdsNaReceita();
    return this.materiasPrimas().filter((mp) => !idsUsados.includes(mp.id));
  });

  ngOnInit(): void {
    this.produtosService.getCategorias().subscribe({
      next: (ctgs) => this.categoriasExistentes.set(ctgs),
      error: () => {},
    });

    this.produtosService.getMateriasPrimas().subscribe({
      next: (mps) => this.materiasPrimas.set(mps),
      error: (e) => console.error('Falha ao carregar catálogo:', e),
    });
  }

  // ─── Navegação do Wizard ───

  avancarEtapa(): void {
    if (this.formBase.invalid) {
      this.formBase.markAllAsTouched();
      return;
    }
    this.etapaAtual.set(2);
  }

  voltarEtapa(): void {
    this.etapaAtual.set(1);
  }

  // ─── Manipulação da Receita ───

  adicionarItemReceita(materiaPrimaId: number): void {
    const mpId = Number(materiaPrimaId);
    if (!mpId) return;

    // Verifica se já existe na receita
    const indexExistente = this.receitaArray.controls.findIndex(
      (c) => c.get('materia_prima_id')?.value === mpId
    );

    if (indexExistente !== -1) {
      // Já existe, aumenta a quantidade
      const control = this.receitaArray.controls[indexExistente];
      const qtdeAtual = Number(control.get('quantidade')?.value) || 0;
      control.get('quantidade')?.setValue(qtdeAtual + 1);
      return;
    }

    // Se não existir, adiciona nova linha
    const mp = this.materiasPrimas().find((m) => m.id === mpId);
    if (!mp) return;

    this.receitaArray.push(
      this.fb.nonNullable.group({
        materia_prima_id: [mp.id],
        materia_prima_nome: [mp.nome],
        unidade_medida: [mp.unidade_medida],
        quantidade: [1, [Validators.required, Validators.min(0.01)]],
        unidade: [mp.unidade_medida, [Validators.required]],
      })
    );
  }

  removerItemReceita(index: number): void {
    this.receitaArray.removeAt(index);
  }

  // ─── Submit Final ───

  voltarParaLista(): void {
    this.router.navigate(['/app/produtos']);
  }

  onSubmit(): void {
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

    this.produtosService
      .criarProduto(payload)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/app/produtos']),
        error: (err) =>
          this.erro.set(err.error?.message || 'Não foi possível salvar o produto.'),
      });
  }
}
