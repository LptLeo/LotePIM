import { Component, input, output, computed } from '@angular/core';

export interface PaginationMeta {
  totalItens: number;
  itensPorPagina: number;
  totalPaginas: number;
  paginaAtual: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.html',
})
export class PaginationComponent {
  meta = input.required<PaginationMeta>();
  pageChange = output<number>();

  protected readonly Math = Math;

  public pages = computed(() => {
    const total = Number(this.meta().totalPaginas);
    const current = Number(this.meta().paginaAtual);
    const range = 2;

    const start = Math.max(1, current - range);
    const end = Math.min(total, current + range);

    const pagesArr: (number | string)[] = [];

    if (start > 1) {
      pagesArr.push(1);
      if (start > 2) pagesArr.push('...');
    }

    for (let i = start; i <= end; i++) {
      pagesArr.push(i);
    }

    if (end < total) {
      if (end < total - 1) pagesArr.push('...');
      pagesArr.push(total);
    }

    return pagesArr;
  });

  public onPageClick(page: number | string): void {
    const pageNum = Number(page);
    if (!isNaN(pageNum) && pageNum !== Number(this.meta().paginaAtual)) {
      this.pageChange.emit(pageNum);
    }
  }

  public prevPage(): void {
    const current = Number(this.meta().paginaAtual);
    if (current > 1) {
      this.pageChange.emit(current - 1);
    }
  }

  public nextPage(): void {
    const current = Number(this.meta().paginaAtual);
    const total = Number(this.meta().totalPaginas);
    if (current < total) {
      this.pageChange.emit(current + 1);
    }
  }
}
