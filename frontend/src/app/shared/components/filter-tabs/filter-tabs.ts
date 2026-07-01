import { Component, input, output } from '@angular/core';

export interface FilterTab {
  id: string;
  label: string;
  hideBorder?: boolean;
}

@Component({
  selector: 'app-filter-tabs',
  standalone: true,
  templateUrl: './filter-tabs.html',
  host: {
    class: 'block w-full min-w-0',
  },
})
export class FilterTabsComponent {
  tabs = input.required<FilterTab[]>();
  filtroAtivo = input.required<string>();
  contagem = input.required<Record<string, number>>();
  filtroMudou = output<string>();

  public onFiltroClick(id: string): void {
    this.filtroMudou.emit(id);
  }
}
