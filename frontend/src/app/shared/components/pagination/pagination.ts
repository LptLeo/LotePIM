import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationMeta {
  totalItens: number;
  itensPorPagina: number;
  totalPaginas: number;
  paginaAtual: number;
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
})
export class PaginationComponent {
  @Input({ required: true }) meta!: PaginationMeta;
  @Output() pageChange = new EventEmitter<number>();

  protected readonly Math = Math;

  pages = computed(() => {
    const total = Number(this.meta.totalPaginas);
    const current = Number(this.meta.paginaAtual);
    const range = 2; // Quantas páginas mostrar antes/depois da atual
    
    let start = Math.max(1, current - range);
    let end = Math.min(total, current + range);

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

  onPageClick(page: number | string) {
    const pageNum = Number(page);
    if (!isNaN(pageNum) && pageNum !== Number(this.meta.paginaAtual)) {
      this.pageChange.emit(pageNum);
    }
  }

  prevPage() {
    const current = Number(this.meta.paginaAtual);
    if (current > 1) {
      this.pageChange.emit(current - 1);
    }
  }

  nextPage() {
    const current = Number(this.meta.paginaAtual);
    const total = Number(this.meta.totalPaginas);
    if (current < total) {
      this.pageChange.emit(current + 1);
    }
  }
}
