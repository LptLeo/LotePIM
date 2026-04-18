import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-produto-filter-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './produto-filter-button.html'
})
export class ProdutoFilterButtonComponent {
  @Input({ required: true }) value!: string;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) count!: number | string;
  @Input({ required: true }) active!: boolean;
  @Input() isWarning: boolean = false;

  @Output() action = new EventEmitter<string>();
}
