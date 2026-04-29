import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoteDetalhe, STATUS_CONFIG } from '../../models/lote.models.js';

@Component({
  selector: 'app-lote-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lote-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-w-0'
  }
})
export class LoteCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) lote!: LoteDetalhe;
  @Input() duracaoProducaoMs: number = 2 * 60 * 1000;
  @Output() cardClick = new EventEmitter<number>();

  private cdr = inject(ChangeDetectorRef);

  animatedProgresso = 0;
  private intervalId: any;

  ngOnInit() {
    // Calcula o progresso inicial imediatamente
    this.atualizarProgresso();

    // Se estiver em produção, faz o "tick" a cada segundo
    if (this.lote.status === 'em_producao') {
      this.intervalId = setInterval(() => {
        this.atualizarProgresso();
      }, 1000);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  onClick() {
    this.cardClick.emit(this.lote.id);
  }

  get config() {
    return STATUS_CONFIG[this.lote.status] || { label: 'Status', cor: '#fff', corBg: '#000', corBorda: '#fff' };
  }

  atualizarProgresso() {
    if (this.lote.status === 'em_producao' && this.lote.aberto_em) {
      const inicio = new Date(this.lote.aberto_em).getTime();
      const agora = new Date().getTime();
      const decorrido = agora - inicio;
      
      const p = Math.floor((decorrido / this.duracaoProducaoMs) * 100);
      
      // Limita a barra entre 0 e 99% enquanto o status for 'em_producao'
      const novoProgresso = Math.min(Math.max(p, 0), 99);
      
      if (this.animatedProgresso !== novoProgresso) {
        this.animatedProgresso = novoProgresso;
        this.cdr.markForCheck();
      }
    } else {
      if (this.animatedProgresso !== 100) {
        this.animatedProgresso = 100;
        this.cdr.markForCheck();
      }
    }
  }

  get dataFormatada(): string {
    if (!this.lote.aberto_em) return '—';
    const date = new Date(this.lote.aberto_em);
    const d = date.toLocaleDateString('pt-BR').replace(/\//g, '.');
    const t = date.toLocaleTimeString('pt-BR');
    return `${d} | ${t}`;
  }
}
