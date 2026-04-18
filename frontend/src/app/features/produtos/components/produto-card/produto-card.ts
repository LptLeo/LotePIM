import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-produto-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produto-card.html'
})
export class ProdutoCardComponent {
  @Input({ required: true }) prod!: any;

  formatarData(data: string) {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
  }
}
