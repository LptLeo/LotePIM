import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InsumosService } from './services/insumos.service';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import type { InsumoEstoque } from '../../shared/models/lote.models';

import { MetricCardsComponent } from './components/metric-cards/metric-cards.component';
import { EstoqueListComponent } from './components/estoque-list/estoque-list.component';
import { CatalogoTableComponent } from './components/catalogo-table/catalogo-table.component';
import { NovaMpModalComponent } from './components/nova-mp-modal/nova-mp-modal.component';
import { RegistrarEntradaModalComponent } from './components/registrar-entrada-modal/registrar-entrada-modal.component';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [
    CommonModule,
    MetricCardsComponent,
    EstoqueListComponent,
    CatalogoTableComponent,
    NovaMpModalComponent,
    RegistrarEntradaModalComponent
  ],
  templateUrl: './insumos.html',
})
export class Insumos implements OnInit {
  private insumosService = inject(InsumosService);
  private router = inject(Router);
  authService = inject(AuthService);

  abaAtiva = signal<'estoque' | 'catalogo'>('estoque');

  insumosBase = signal<InsumoEstoque[]>([]);
  catalogoBase = signal<any[]>([]);
  categoriasMp = signal<string[]>([]);

  carregando = signal(true);
  erro = signal<string | null>(null);
  termoPesquisa = signal('');

  // -- Modal Nova MP --
  modalAberto = signal(false);
  salvandoMp = signal(false);
  erroMp = signal<string | null>(null);

  // -- Modal Registrar Entrada de Estoque --
  modalEstoqueAberto = signal(false);
  salvandoEstoque = signal(false);
  erroEstoque = signal<string | null>(null);

  /** Listagem filtrada para estoque */
  insumos = computed(() => {
    const lista = this.insumosBase();
    const termo = this.termoPesquisa().toLowerCase().trim();
    if (!termo) return lista;
    return lista.filter(ie =>
      ie.materiaPrima?.nome.toLowerCase().includes(termo) ||
      ie.numero_lote_interno.toLowerCase().includes(termo) ||
      ie.fornecedor.toLowerCase().includes(termo)
    );
  });

  /** Listagem filtrada para catálogo */
  catalogo = computed(() => {
    const lista = this.catalogoBase();
    const termo = this.termoPesquisa().toLowerCase().trim();
    if (!termo) return lista;
    return lista.filter(mp =>
      mp.nome.toLowerCase().includes(termo) ||
      mp.sku_interno.toLowerCase().includes(termo) ||
      mp.categoria.toLowerCase().includes(termo)
    );
  });

  /** Métricas computadas localmente */
  totalRegistros = computed(() => this.insumosBase().length);
  totalComSaldo = computed(() => this.insumosBase().filter(ie => Number(ie.quantidade_atual) > 0).length);
  totalEsgotados = computed(() => this.insumosBase().filter(ie => Number(ie.quantidade_atual) === 0).length);

  totalCatalogo = computed(() => this.catalogoBase().length);

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.carregando.set(true);
    
    // Carrega ambas as listas
    this.insumosService.getAll().subscribe({
      next: (dados) => this.insumosBase.set(dados),
      error: () => this.erro.set('Erro ao carregar insumos de estoque.'),
      complete: () => this.verificarFimCarregamento()
    });

    this.insumosService.getMateriasPrimas().subscribe({
      next: (dados) => this.catalogoBase.set(dados),
      error: () => console.error('Erro ao carregar catálogo.'),
      complete: () => this.verificarFimCarregamento()
    });

    this.insumosService.getCategoriasMateriasPrimas().subscribe({
      next: (dados) => this.categoriasMp.set(dados),
      error: () => console.error('Erro ao carregar categorias.'),
      complete: () => this.verificarFimCarregamento()
    });
  }

  private loadCount = 0;
  verificarFimCarregamento(): void {
    this.loadCount++;
    if (this.loadCount >= 3) {
      this.carregando.set(false);
      this.loadCount = 0;
    }
  }

  setAba(aba: 'estoque' | 'catalogo'): void {
    this.abaAtiva.set(aba);
    this.termoPesquisa.set('');
  }

  onSearch(event: Event): void {
    this.termoPesquisa.set((event.target as HTMLInputElement).value);
  }

  // --- Modal Logic ---

  abrirModalNovaMp(): void {
    this.erroMp.set(null);
    this.modalAberto.set(true);
  }

  fecharModalNovaMp(): void {
    this.modalAberto.set(false);
    this.erroMp.set(null);
  }

  salvarNovaMp(payload: any): void {
    this.salvandoMp.set(true);
    this.erroMp.set(null);

    this.insumosService.criarMateriaPrima(payload)
      .pipe(finalize(() => this.salvandoMp.set(false)))
      .subscribe({
        next: (novaMp) => {
          this.catalogoBase.update(lista => [...lista, novaMp]);
          this.fecharModalNovaMp();
        },
        error: (err) => {
          console.error('Erro ao criar matéria-prima:', err);
          let msg = 'Erro ao salvar matéria-prima.';
          if (err.error?.details && Array.isArray(err.error.details)) {
            msg += '\n\n' + err.error.details.map((d: any) => d.mensagem).join('\n');
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          this.erroMp.set(msg);
        }
      });
  }

  // --- Modal Estoque Logic ---

  abrirModalEstoque(): void {
    this.erroEstoque.set(null);
    this.modalEstoqueAberto.set(true);
  }

  fecharModalEstoque(): void {
    this.modalEstoqueAberto.set(false);
    this.erroEstoque.set(null);
  }

  salvarEstoque(payload: any): void {
    const mpId = Number(payload.materia_prima_id);
    const mp = this.catalogoBase().find(item => item.id === mpId);

    // Validação extra de segurança para UN
    if (mp?.unidade_medida === 'UN' && !Number.isInteger(Number(payload.quantidade_inicial))) {
      this.erroEstoque.set('Para Matérias-Primas com unidade "UN", a quantidade deve ser um número inteiro.');
      return;
    }

    const dataValidadeFinal = (!payload.naoAplicaValidade && payload.data_validade) ? payload.data_validade : null;

    this.salvandoEstoque.set(true);
    this.erroEstoque.set(null);
    
    const formattedPayload = {
      materia_prima_id: mpId,
      numero_lote_fornecedor: payload.numero_lote_fornecedor,
      fornecedor: payload.fornecedor,
      quantidade_inicial: Number(payload.quantidade_inicial),
      turno: payload.turno,
      data_validade: dataValidadeFinal
    };

    this.insumosService.create(formattedPayload)
      .pipe(finalize(() => this.salvandoEstoque.set(false)))
      .subscribe({
        next: (novoLote) => {
          this.insumosBase.update(lista => [novoLote, ...lista]);
          this.fecharModalEstoque();
        },
        error: (err) => {
          console.error('Erro ao registrar estoque:', err);
          let msg = 'Erro ao registrar entrada.';
          if (err.error?.details && Array.isArray(err.error.details)) {
            msg += '\n\n' + err.error.details.map((d: any) => d.mensagem).join('\n');
          } else if (err.error?.message) {
            msg = err.error.message;
          }
          this.erroEstoque.set(msg);
        }
      });
  }
}
