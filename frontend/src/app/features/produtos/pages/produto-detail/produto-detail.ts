import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProdutosService } from '../../services/produtos.service.js';
import { Produto } from '../../../../shared/models/lote.models.js';
import { finalize } from 'rxjs';

import { ProdutoInfoCardsComponent } from './components/produto-info-cards/produto-info-cards.component.js';
import { ProdutoReceitaComponent } from './components/produto-receita/produto-receita.component.js';

@Component({
  selector: 'app-produto-detail',
  standalone: true,
  imports: [CommonModule, ProdutoInfoCardsComponent, ProdutoReceitaComponent],
  templateUrl: './produto-detail.html',
})
export class ProdutoDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private produtosService = inject(ProdutosService);

  produto = signal<Produto | null>(null);
  carregando = signal<boolean>(true);
  erro = signal<string | null>(null);

  materiasPrimas = signal<any[]>([]);
  modoEdicaoReceita = signal<boolean>(false);
  receitaEditada = signal<any[]>([]);
  salvandoReceita = signal<boolean>(false);

  mpDisponiveis = computed(() => {
    const idsUsados = this.receitaEditada().map((r: any) => r.materiaPrima.id);
    return this.materiasPrimas().filter((mp) => !idsUsados.includes(mp.id));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregarProduto(Number(id));
      this.carregarMateriasPrimas();
    } else {
      this.erro.set('ID do produto não informado.');
      this.carregando.set(false);
    }
  }

  carregarMateriasPrimas(): void {
    this.produtosService.getMateriasPrimas().subscribe({
      next: (mps) => this.materiasPrimas.set(mps),
      error: (e) => console.error('Erro ao carregar matérias-primas', e)
    });
  }

  carregarProduto(id: number): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.produtosService.getProdutoById(id)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (data) => {
          this.produto.set(data);
          // Inicializa o estado de edição com uma cópia profunda da receita
          this.receitaEditada.set(JSON.parse(JSON.stringify(data.receita || [])));
        },
        error: (err) => {
          console.error('Erro ao carregar produto:', err);
          this.erro.set('Não foi possível carregar os detalhes do produto. Ele pode não existir ou o servidor está offline.');
        }
      });
  }

  iniciarEdicaoReceita(): void {
    this.modoEdicaoReceita.set(true);
    const prod = this.produto();
    if (prod) {
      this.receitaEditada.set(JSON.parse(JSON.stringify(prod.receita || [])));
    }
  }

  cancelarEdicaoReceita(): void {
    this.modoEdicaoReceita.set(false);
    const prod = this.produto();
    if (prod) {
      this.receitaEditada.set(JSON.parse(JSON.stringify(prod.receita || [])));
    }
  }

  adicionarMateriaPrima(mpId: number): void {
    const mp = this.materiasPrimas().find(m => m.id === Number(mpId));
    if (!mp) return;

    this.receitaEditada.update(receita => {
      return [...receita, {
        id: 0, // novo item
        materiaPrima: mp,
        quantidade: 1,
        unidade: mp.unidade_medida
      }];
    });
  }

  removerItemReceita(index: number): void {
    this.receitaEditada.update(receita => {
      const nova = [...receita];
      nova.splice(index, 1);
      return nova;
    });
  }

  atualizarQuantidade(index: number, novaQtd: string): void {
    const qtd = Number(novaQtd);
    if (isNaN(qtd) || qtd <= 0) return;
    
    this.receitaEditada.update(receita => {
      const nova = [...receita];
      nova[index].quantidade = qtd;
      return nova;
    });
  }

  salvarReceita(): void {
    const prod = this.produto();
    if (!prod) return;

    this.salvandoReceita.set(true);
    const payload = this.receitaEditada().map(item => ({
      materia_prima_id: item.materiaPrima.id,
      quantidade: item.quantidade,
      unidade: item.unidade
    }));

    this.produtosService.atualizarReceita(prod.id, payload)
      .pipe(finalize(() => this.salvandoReceita.set(false)))
      .subscribe({
        next: (atualizado) => {
          this.produto.set(atualizado);
          this.receitaEditada.set(JSON.parse(JSON.stringify(atualizado.receita || [])));
          this.modoEdicaoReceita.set(false);
        },
        error: (err) => {
          console.error('Erro ao salvar receita:', err);
          
          let errorMsg = err.error?.message || 'Erro ao salvar a receita.';
          
          if (err.error?.details && Array.isArray(err.error.details)) {
            const details = err.error.details.map((d: any) => d.mensagem).join('\n');
            if (details) {
              errorMsg += `\n\nDetalhes:\n${details}`;
            }
          }
          
          alert(errorMsg);
          // O modo de edição NÃO é fechado se der erro, permitindo que o usuário conserte e salve de novo.
        }
      });
  }

  voltarParaLista(): void {
    this.router.navigate(['/app/produtos']);
  }
}
