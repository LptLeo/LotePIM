import {
  Component,
  input,
  output,
  signal,
  effect,
  ElementRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { InsumoEstoque } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-lotes-receber',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './lotes-receber.component.html',
  styles: [
    `
      .new-item-glow {
        box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
        border-color: rgba(0, 229, 255, 0.5) !important;
        animation: pulse-glow 2s infinite;
      }

      @keyframes pulse-glow {
        0% {
          box-shadow: 0 0 5px rgba(0, 229, 255, 0.2);
        }
        50% {
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.5);
        }
        100% {
          box-shadow: 0 0 5px rgba(0, 229, 255, 0.2);
        }
      }

      .card-enter {
        animation: card-entrar 300ms ease-out both;
      }

      @keyframes card-entrar {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .card-sair {
        animation: card-sair 200ms ease-in both;
      }

      @keyframes card-sair {
        to {
          opacity: 0;
          transform: scale(0.9);
        }
      }
    `,
  ],
})
export class LotesReceberComponent implements OnDestroy {
  // === INPUTS ===
  lotes = input<InsumoEstoque[]>([]);
  ehGestor = input<boolean>(false);

  // === OUTPUTS ===
  receber = output<number>();

  // === ESTADO LOCAL ===
  estaExpandido = signal(false);
  private idsNaoVistos = signal<Set<number>>(new Set());
  private idsConhecidos = new Set<number>();
  private observer?: IntersectionObserver;
  private el = inject(ElementRef);

  constructor() {
    effect(() => {
      const lotesAtuais = this.lotes();
      if (!lotesAtuais) return;
      const idsAtuais = lotesAtuais.map((l) => l.id);
      let mudou = false;
      idsAtuais.forEach((id) => {
        if (!this.idsConhecidos.has(id)) {
          this.idsNaoVistos.update((set) => {
            set.add(id);
            return set;
          });
          this.idsConhecidos.add(id);
          mudou = true;
        }
      });
      if (mudou) {
        requestAnimationFrame(() => this.observarCartoes());
      }
    });

    effect(() => {
      if (this.lotes().length > 0 || this.estaExpandido()) {
        requestAnimationFrame(() => this.configurarObservadores());
      }
    });
  }

  public alternar(): void {
    this.estaExpandido.update((v) => !v);
    if (this.estaExpandido()) {
      requestAnimationFrame(() => this.observarCartoes());
    }
  }

  public naoFoiVisto(id: number): boolean {
    return this.idsNaoVistos().has(id);
  }

  public ngOnDestroy(): void {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.aoMudarVisibilidade);
  }

  // === MÉTODOS PRIVADOS ===
  private configurarObservadores(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute('data-lote-id'));
            if (this.idsNaoVistos().has(id)) {
              if (document.visibilityState === 'visible') {
                setTimeout(() => this.marcarComoVisto(id), 2000);
              }
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    document.addEventListener('visibilitychange', this.aoMudarVisibilidade);
    this.observarCartoes();
  }

  private aoMudarVisibilidade = () => {
    if (document.visibilityState === 'visible') {
      this.observarCartoes();
    }
  };

  private observarCartoes(): void {
    if (!this.observer) return;
    setTimeout(() => {
      const cartoes = this.el.nativeElement.querySelectorAll('[data-lote-id]');
      cartoes.forEach((cartao: HTMLElement) => this.observer?.observe(cartao));
    }, 500);
  }

  private marcarComoVisto(id: number): void {
    this.idsNaoVistos.update((set) => {
      set.delete(id);
      return new Set(set);
    });
  }
}
