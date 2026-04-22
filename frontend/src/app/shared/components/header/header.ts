import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from 'rxjs/operators';

import { HeaderService } from './services/header.service';
import { AuthService } from '../../../core/services/auth.service';
import { SugestaoItem, LoteStatus, STATUS_CONFIG } from '../../models/lote.models';

/** Padrão exato de número de lote gerado pelo backend */
const LOTE_REGEX = /^LOTE-\d{8}-\d{3}$/;

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  private headerService = inject(HeaderService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  // ── Estado do usuário ──────────────────────────────────────────────────
  
  /** Mapeia os perfis do backend para nomes amigáveis */
  cargoFormatado = computed(() => {
    const perfil = this.authService.usuario()?.perfil;
    const mapa: Record<string, string> = {
      operador: 'Operador de Linha',
      inspetor: 'Inspetor de Qualidade',
      gestor: 'Gestor de Produção'
    };
    return mapa[perfil || ''] || 'Cargo';
  });

  goToPerfil() {
    this.router.navigate(['/app/perfil']);
  }

  // ── Estado da pesquisa ──────────────────────────────────────────────────

  termoPesquisa = '';
  sugestoes = signal<SugestaoItem[]>([]);
  carregando = signal(false);
  dropdownAberto = signal(false);

  /** Sugestões filtradas por tipo, usadas no template */
  loteSugestoes = computed(() => this.sugestoes().filter(s => s.tipo === 'lote'));
  produtoSugestoes = computed(() => this.sugestoes().filter(s => s.tipo === 'produto'));

  private pesquisaSubject = new Subject<string>();
  private subscription?: Subscription;

  // ── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.subscription = this.pesquisaSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((termo) => {
        if (!termo || termo.trim().length < 2) {
          this.sugestoes.set([]);
          this.dropdownAberto.set(false);
          this.carregando.set(false);
          return of([]);
        }
        this.carregando.set(true);
        return this.headerService.buscarSugestoes(termo);
      }),
    ).subscribe((resultados) => {
      this.carregando.set(false);
      this.sugestoes.set(resultados);
      this.dropdownAberto.set(
        resultados.length > 0 || this.termoPesquisa.trim().length >= 2,
      );
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  // ── Handlers do input ───────────────────────────────────────────────────

  onInputChange(valor: string): void {
    this.termoPesquisa = valor;
    this.pesquisaSubject.next(valor);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.pesquisar();
    } else if (event.key === 'Escape') {
      this.fecharDropdown();
    }
  }

  /** Fecha o dropdown ao clicar fora do componente */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.fecharDropdown();
    }
  }

  // ── Ações de navegação ──────────────────────────────────────────────────

  /**
   * Executado ao apertar Enter ou clicar no ícone de busca.
   * - Lote exato encontrado → /app/lote/:id
   * - Qualquer outro termo → /app/lote?busca=TERMO
   */
  pesquisar(): void {
    const termo = this.termoPesquisa.trim();
    if (!termo) return;

    this.fecharDropdown();

    if (LOTE_REGEX.test(termo)) {
      const loteExato = this.loteSugestoes().find(s => s.label === termo);
      if (loteExato?.id) {
        this.router.navigate(['/app/lote', loteExato.id]);
        return;
      }
      // Lote exato no padrão mas não encontrado nas sugestões → faz busca rápida
      this.headerService.buscarSugestoes(termo).subscribe((sugestoes) => {
        const lote = sugestoes.find(s => s.tipo === 'lote' && s.label === termo);
        if (lote?.id) {
          this.router.navigate(['/app/lote', lote.id]);
        } else {
          this.router.navigate(['/app/lote'], { queryParams: { busca: termo } });
        }
      });
    } else {
      this.router.navigate(['/app/lote'], { queryParams: { busca: termo } });
    }
  }

  /**
   * Executado ao clicar em um item do dropdown.
   * - Lote → /app/lote/:id
   * - Produto → /app/lote?busca=NOME_PRODUTO
   */
  selecionarSugestao(sugestao: SugestaoItem): void {
    this.termoPesquisa = sugestao.label;
    this.fecharDropdown();

    if (sugestao.tipo === 'lote' && sugestao.id) {
      this.router.navigate(['/app/lote', sugestao.id]);
    } else {
      this.router.navigate(['/app/lote'], { queryParams: { busca: sugestao.label } });
    }
  }

  fecharDropdown(): void {
    this.dropdownAberto.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ── Utilitários de template ─────────────────────────────────────────────

  getStatusConfig(status?: LoteStatus) {
    return STATUS_CONFIG[status!] ?? { label: status ?? '', cor: '#ADAAAA', corBg: 'transparent', corBorda: '#484847' };
  }
}
