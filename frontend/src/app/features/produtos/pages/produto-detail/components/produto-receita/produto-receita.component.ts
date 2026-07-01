import { Component, input, output } from '@angular/core';
import type {
  Produto,
  ReceitaItem,
  MateriaPrima,
} from '../../../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-produto-receita',
  standalone: true,
  templateUrl: './produto-receita.component.html',
})
export class ProdutoReceitaComponent {
  // === INPUTS ===
  public produto = input.required<Produto>();
  public modoEdicao = input(false);
  public receitaEditada = input<ReceitaItem[]>([]);
  public mpDisponiveis = input<MateriaPrima[]>([]);
  public salvando = input(false);

  // === OUTPUTS ===
  public iniciarEdicao = output<void>();
  public cancelarEdicao = output<void>();
  public salvar = output<void>();
  public adicionarMp = output<number>();
  public removerMp = output<number>();
  public atualizarQtd = output<{ index: number; qtd: string }>();

  // === MÉTODOS ===
  public aoIniciarEdicao(): void {
    this.iniciarEdicao.emit();
  }

  public aoCancelarEdicao(): void {
    this.cancelarEdicao.emit();
  }

  public aoSalvar(): void {
    this.salvar.emit();
  }

  public aoAdicionarMp(idStr: string): void {
    const id = Number(idStr);
    if (id) {
      this.adicionarMp.emit(id);
    }
  }

  public aoRemoverMp(index: number): void {
    this.removerMp.emit(index);
  }

  public aoAtualizarQtd(index: number, qtd: string): void {
    this.atualizarQtd.emit({ index, qtd });
  }
}
