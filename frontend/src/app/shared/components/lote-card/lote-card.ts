import {
  Component,
  input,
  output,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { STATUS_CONFIG, type LoteDetalhe } from '../../models/lote.models.js';

@Component({
  selector: 'app-lote-card',
  standalone: true,
  templateUrl: './lote-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full min-w-0',
  },
})
export class LoteCardComponent implements OnInit, OnDestroy {
  lote = input.required<LoteDetalhe>();
  duracaoProducaoMs = input(2 * 60 * 1000);
  cardClick = output<number>();

  public animatedProgresso = 0;
  private cdr = inject(ChangeDetectorRef);
  private intervalId?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.atualizarProgresso();

    if (this.lote().status === 'em_producao') {
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

  public onClick(): void {
    this.cardClick.emit(this.lote().id);
  }

  public get config() {
    return (
      STATUS_CONFIG[this.lote().status] || {
        label: 'Status',
        cor: '#fff',
        corBg: '#000',
        corBorda: '#fff',
      }
    );
  }

  public get dataFormatada(): string {
    if (!this.lote().aberto_em) return '—';
    const date = new Date(this.lote().aberto_em);
    const d = date.toLocaleDateString('pt-BR').replace(/\//g, '.');
    const t = date.toLocaleTimeString('pt-BR');
    return `${d} | ${t}`;
  }

  private atualizarProgresso(): void {
    if (this.lote().status === 'em_producao' && this.lote().aberto_em) {
      const inicio = new Date(this.lote().aberto_em).getTime();
      const agora = new Date().getTime();
      const decorrido = agora - inicio;

      const porcentagem = Math.floor((decorrido / this.duracaoProducaoMs()) * 100);
      const novoProgresso = Math.min(Math.max(porcentagem, 0), 99);

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
}
