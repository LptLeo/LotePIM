import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoteDetalhe, STATUS_CONFIG } from '../../models/lote.models';

@Component({
  selector: 'app-lote-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lote-card.html',
  host: {
    class: 'block h-full min-w-0'
  }
})
export class LoteCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) lote!: LoteDetalhe;
  @Output() cardClick = new EventEmitter<number>();

  private cdr = inject(ChangeDetectorRef);

  animatedProgresso = 0;
  private intervalId: any;

  ngOnInit() {
    // Definimos o progresso logo após a renderização inicial para ativar a transição
    setTimeout(() => {
      this.atualizarProgresso();
    }, 100);

    // Se estiver em produção, fazemos o "tick" para atualizar a barra e a porcentagem dinamicamente
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
    return STATUS_CONFIG[this.lote.status];
  }

  atualizarProgresso() {
    if (this.lote.status === 'em_producao' && this.lote.aberto_em) {
      const inicio = new Date(this.lote.aberto_em).getTime();
      const agora = new Date().getTime();
      const decorrido = agora - inicio;
      
      // O tempo de produção configurado no backend demo é de 2 minutos (120.000 ms)
      const tempoTotal = 2 * 60 * 1000;
      
      const p = Math.floor((decorrido / tempoTotal) * 100);
      
      // Limita a barra entre 0 e 99% enquanto o status for 'em_producao'
      this.animatedProgresso = Math.min(Math.max(p, 0), 99);
    } else {
      this.animatedProgresso = 100;
    }
    
    // Força o Angular a perceber a mudança no setInterval e atualizar a tela imediatamente
    this.cdr.markForCheck();
  }

  get dataFormatada(): string {
    if (!this.lote.aberto_em) return '—';
    const date = new Date(this.lote.aberto_em);
    const d = date.toLocaleDateString('pt-BR').replace(/\//g, '.');
    const t = date.toLocaleTimeString('pt-BR');
    return `${d} | ${t}`;
  }
}
