import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FilterTab {
  id: string;
  label: string;
  hideBorder?: boolean;
}

@Component({
  selector: 'app-filter-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-tabs.html',
  host: {
    class: 'block w-full min-w-0'
  }
})
export class FilterTabsComponent {
  @Input({ required: true }) tabs!: FilterTab[];
  @Input({ required: true }) filtroAtivo!: string;
  @Input({ required: true }) contagem!: Record<string, number>;
  @Output() filtroMudou = new EventEmitter<string>();

  onFiltroClick(id: string) {
    this.filtroMudou.emit(id);
  }
}
