import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-produto-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produto-card.html',
  host: {
    class: 'block h-full min-w-0'
  }
})
export class ProdutoCardComponent {
  @Input({ required: true }) prod!: any;
  @Output() cardClick = new EventEmitter<number>();

  formatarData(data: string) {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
