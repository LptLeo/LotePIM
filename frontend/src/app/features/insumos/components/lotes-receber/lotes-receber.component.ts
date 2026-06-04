import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ElementRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import type { InsumoEstoque } from '../../../../shared/models/lote.models.js';

@Component({
  selector: 'app-lotes-receber',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lotes-receber.component.html',
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(-20px) scale(0.95)' }),
            stagger('100ms', [
              animate(
                '300ms ease-out',
                style({ opacity: 1, transform: 'translateY(0) scale(1)' }),
              ),
            ]),
          ],
          { optional: true },
        ),
        query(
          ':leave',
          [
            animate(
              '200ms ease-in',
              style({
                opacity: 0,
                transform: 'scale(0.9)',
                height: 0,
                margin: 0,
                padding: 0,
              }),
            ),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
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
    `,
  ],
})
export class LotesReceberComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() lotes: InsumoEstoque[] = [];
  @Input() isGestor = false;
  @Output() receber = new EventEmitter<number>();

  isExpanded = signal(false);

  // Armazena IDs de lotes que ainda não foram "vistos" pelo usuário
  unseenIds = signal<Set<number>>(new Set());
  private knownIds = new Set<number>();
  private observer?: IntersectionObserver;
  private el = inject(ElementRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lotes'] && this.lotes) {
      const currentIds = this.lotes.map((l) => l.id);

      // Detecta novos IDs que acabaram de chegar via SSE ou carregamento
      let mudou = false;
      currentIds.forEach((id) => {
        if (!this.knownIds.has(id)) {
          this.unseenIds.update((set) => {
            set.add(id);
            return set;
          });
          this.knownIds.add(id);
          mudou = true;
        }
      });

      if (mudou) {
        this.observeCards();
      }
    }
  }

  ngAfterViewInit(): void {
    this.setupVisibilityListeners();
  }

  private setupVisibilityListeners(): void {
    // 1. Intersection Observer: Detecta quando o card aparece fisicamente na tela
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute('data-lote-id'));
            if (this.unseenIds().has(id)) {
              // Se o usuário está com a aba ativa, marca como visto em 2s
              if (document.visibilityState === 'visible') {
                setTimeout(() => this.markAsSeen(id), 2000);
              }
            }
          }
        });
      },
      { threshold: 0.5 }, // Pelo menos 50% do card visível
    );

    // 2. Page Visibility API: Se o usuário voltar do Alt+Tab, re-checa o que está visível
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.observeCards();
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.observeCards();
    }
  };

  private observeCards(): void {
    if (!this.observer) return;

    // Pequeno delay para garantir que o DOM renderizou após o OnChanges
    setTimeout(() => {
      const cards = this.el.nativeElement.querySelectorAll('[data-lote-id]');
      cards.forEach((card: HTMLElement) => this.observer?.observe(card));
    }, 500);
  }

  private markAsSeen(id: number): void {
    this.unseenIds.update((set) => {
      set.delete(id);
      return new Set(set); // Nova instância para disparar reatividade do Signal
    });
  }

  isUnseen(id: number): boolean {
    return this.unseenIds().has(id);
  }

  toggle(): void {
    this.isExpanded.update((v) => !v);
    if (this.isExpanded()) {
      this.observeCards();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
