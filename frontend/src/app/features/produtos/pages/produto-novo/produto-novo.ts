import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProdutosService } from '../../services/produtos.service';
import { LoteFeatureService } from '../../../lote/services/lote.service';
import { InsumoMaster } from '../../../../shared/models/lote.models';
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
  private loteFeatureService = inject(LoteFeatureService); // Para reaproveitar a chamada de insumosPadrão
  private router = inject(Router);

  salvando = signal(false);
  gerandoSku = signal(false);
  erro = signal<string | null>(null);

  // Combobox values
  categoriasExistentes = signal<string[]>([]);
  insumosExistentes = signal<InsumoMaster[]>([]);
  
  // Chip control
  insumosSelecionados = signal<InsumoMaster[]>([]);

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    codigo: ['', [Validators.required]],
    descricao: [''],
    versao: ['1.0.0', [Validators.required]],
    linha: ['', [Validators.required]], // "linha" na DB significa Categoria
    ativo: [true]
  });

  ngOnInit() {
    this.carregarDadosApoio();
  }

  carregarDadosApoio() {
    this.produtosService.getCategorias().subscribe({
      next: (ctgs: any) => this.categoriasExistentes.set(ctgs),
      error: (e: any) => console.error("Falha ao carregar categorias:", e)
    });

    this.loteFeatureService.getInsumosMaster().subscribe({
      next: (ins: any) => this.insumosExistentes.set(ins),
      error: (e: any) => console.error("Falha ao carregar insumos mestre:", e)
    });
  }

  onInsumoSelected(event: Event) {
    const id = Number((event.target as HTMLSelectElement).value);
    if (!id) return;

    const insumo = this.insumosExistentes().find(i => i.id === id);
    if (insumo && !this.insumosSelecionados().find(i => i.id === id)) {
      this.insumosSelecionados.update(lista => [...lista, insumo]);
    }
    // Reset selection logic omitted since we reset the dropdown visually in HTML usually
    (event.target as HTMLSelectElement).value = "";
  }

  removerInsumoSelecionado(id: number) {
    this.insumosSelecionados.update(lista => lista.filter(i => i.id !== id));
  }

  gerarSkuParaNome() {
    const nomeAtual = this.form.get('nome')?.value;
    if (!nomeAtual || nomeAtual.trim().length === 0) {
      this.erro.set("Digite o nome do produto primeiro para gerar um SKU.");
      setTimeout(() => this.erro.set(null), 3000);
      return;
    }

    this.gerandoSku.set(true);
    this.produtosService.sugerirSku(nomeAtual)
      .pipe(finalize(() => this.gerandoSku.set(false)))
      .subscribe({
        next: (res: any) => {
          this.form.patchValue({ codigo: res.sku });
        },
        error: (err: any) => {
          this.erro.set(err.error?.message || "Erro ao gerar SKU.");
          setTimeout(() => this.erro.set(null), 3000);
        }
      });
  }

  voltarParaLista() {
    this.router.navigate(['/app/produtos']);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.erro.set(null);
    this.salvando.set(true);

    const payload = {
      ...this.form.value,
      insumos_padrao: this.insumosSelecionados().map(i => i.id)
    };

    this.produtosService.criarProduto(payload)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: () => {
          // Toast or similar feedback could hook here
          this.router.navigate(['/app/produtos']);
        },
        error: (err: any) => {
          this.erro.set("Não foi possível salvar o produto: " + (err.error?.message || err.message));
        }
      });
  }
}
