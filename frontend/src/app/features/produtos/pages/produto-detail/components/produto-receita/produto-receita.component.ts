import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Produto } from '../../../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-produto-receita',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produto-receita.component.html',
})
export class ProdutoReceitaComponent {
  @Input() produto!: Produto;
  @Input() modoEdicao: boolean = false;
  @Input() receitaEditada: any[] = [];
  @Input() mpDisponiveis: any[] = [];
  @Input() salvando: boolean = false;

  @Output() iniciarEdicao = new EventEmitter<void>();
  @Output() cancelarEdicao = new EventEmitter<void>();
  @Output() salvar = new EventEmitter<void>();
  @Output() addMp = new EventEmitter<number>();
  @Output() removeMp = new EventEmitter<number>();
  @Output() updateQtd = new EventEmitter<{ index: number; qtd: string }>();

  onIniciarEdicao() {
    this.iniciarEdicao.emit();
  }

  onCancelarEdicao() {
    this.cancelarEdicao.emit();
  }

  onSalvar() {
    this.salvar.emit();
  }

  onAddMp(idStr: string) {
    const id = Number(idStr);
    if (id) {
      this.addMp.emit(id);
    }
  }

  onRemoveMp(index: number) {
    this.removeMp.emit(index);
  }

  onUpdateQtd(index: number, qtd: string) {
    this.updateQtd.emit({ index, qtd });
  }
}
