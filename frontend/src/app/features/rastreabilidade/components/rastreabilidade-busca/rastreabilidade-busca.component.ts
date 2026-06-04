import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AutocompleteSugestao } from '../../rastreabilidade.ts';

@Component({
  selector: 'app-rastreabilidade-busca',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rastreabilidade-busca.component.html',
})
export class RastreabilidadeBuscaComponent {
  @Input() termo = '';
  @Input() sugestoes: AutocompleteSugestao[] = [];
  @Input() mostrandoDropdown = false;
  @Input() buscandoSugestoes = false;
  @Input() buscando = false;
  @Input() erro: string | null = null;

  @Output() inputChange = new EventEmitter<Event>();
  @Output() focus = new EventEmitter<void>();
  @Output() blur = new EventEmitter<void>();
  @Output() search = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() selectSuggestion = new EventEmitter<AutocompleteSugestao>();

  onInput(event: Event) {
    this.inputChange.emit(event);
  }

  onFocus() {
    this.focus.emit();
  }

  onBlur() {
    this.blur.emit();
  }

  onSearch() {
    this.search.emit();
  }

  onClear() {
    this.clear.emit();
  }

  onSelect(sug: AutocompleteSugestao) {
    this.selectSuggestion.emit(sug);
  }
}
