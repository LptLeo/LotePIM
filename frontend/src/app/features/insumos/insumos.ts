import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InsumosService } from './services/insumos.service';
import { finalize, map, startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import type { InsumoEstoque } from '../../shared/models/lote.models';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-insumos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './insumos.html',
})
export class Insumos implements OnInit {
  private insumosService = inject(InsumosService);
  private router = inject(Router);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

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

  formMp = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    categoria: ['', Validators.required],
    unidade_medida: ['UN', Validators.required]
  });

  skuPreviewMp = computed(() => {
    const nome = this.formMp.controls.nome.value;
    if (!nome || nome.length < 2) return 'MP-...';

    const base = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 12);

    return `MP-${base}`;
  });

  // -- Modal Registrar Entrada de Estoque --
  modalEstoqueAberto = signal(false);
  salvandoEstoque = signal(false);
  erroEstoque = signal<string | null>(null);

  formEstoque = this.fb.group({
    materia_prima_id: [null as number | null, Validators.required],
    numero_lote_fornecedor: ['', Validators.required],
    fornecedor: ['', Validators.required],
    quantidade_inicial: [null as number | null, [Validators.required, Validators.min(0.01)]],
    data_validade: [null as string | null],
    naoAplicaValidade: [false],
    turno: ['manha', Validators.required]
  });

  // toSignal converte o valueChanges observable em Signal, tornando computed() reativo
  private mpIdSelecionado = toSignal(
    this.formEstoque.controls.materia_prima_id.valueChanges.pipe(startWith(null))
  );

  unidadeSelecionada = computed(() => {
    const mpId = Number(this.mpIdSelecionado());
    if (!mpId) return '--';
    const mp = this.catalogoBase().find(item => item.id === mpId);
    return mp ? mp.unidade_medida : '--';
  });

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

  isVencendo(dataValidade: string | null): boolean {
    if (!dataValidade) return false;
    const hoje = new Date();
    const validade = new Date(dataValidade);
    const diffDays = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 15;
  }

  isVencido(dataValidade: string | null): boolean {
    if (!dataValidade) return false;
    return new Date(dataValidade) < new Date();
  }

  formatarData(data?: string | null): string {
    if (!data) return '—';
    const d = new Date(data);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  /** Formata a data de validade do form no padrão dd/mm/aaaa para exibição no campo customizado */
  dataValidadeFormatada(): string {
    const data = this.formEstoque.controls.data_validade.value;
    if (!data) return 'DD/MM/AAAA';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  // --- Modal Logic ---

  abrirModalNovaMp(): void {
    this.formMp.reset({ unidade_medida: 'UN' });
    this.erroMp.set(null);
    this.modalAberto.set(true);
  }

  fecharModalNovaMp(): void {
    this.modalAberto.set(false);
    this.erroMp.set(null);
  }

  salvarNovaMp(): void {
    if (this.formMp.invalid) {
      this.erroMp.set('Preencha os campos obrigatórios corretamente.');
      return;
    }

    this.salvandoMp.set(true);
    this.erroMp.set(null);

    const payload = this.formMp.getRawValue();

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
    this.formEstoque.reset({ turno: 'manha', naoAplicaValidade: false });
    this.erroEstoque.set(null);
    this.modalEstoqueAberto.set(true);
  }

  fecharModalEstoque(): void {
    this.modalEstoqueAberto.set(false);
    this.erroEstoque.set(null);
  }

  salvarEstoque(): void {
    if (this.formEstoque.invalid) {
      this.erroEstoque.set('Preencha os campos obrigatórios corretamente.');
      return;
    }

    const values = this.formEstoque.getRawValue();
    const mpId = Number(values.materia_prima_id);
    const mp = this.catalogoBase().find(item => item.id === mpId);

    // Validação extra de segurança para UN
    if (mp?.unidade_medida === 'UN' && !Number.isInteger(Number(values.quantidade_inicial))) {
      this.erroEstoque.set('Para Matérias-Primas com unidade "UN", a quantidade deve ser um número inteiro.');
      return;
    }

    const dataValidadeFinal = (!values.naoAplicaValidade && values.data_validade) ? values.data_validade : null;

    this.salvandoEstoque.set(true);
    this.erroEstoque.set(null);
    
    const payload = {
      materia_prima_id: mpId,
      numero_lote_fornecedor: values.numero_lote_fornecedor,
      fornecedor: values.fornecedor,
      quantidade_inicial: Number(values.quantidade_inicial),
      turno: values.turno,
      data_validade: dataValidadeFinal
    };

    this.insumosService.create(payload)
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
