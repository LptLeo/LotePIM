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
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { HeaderService } from './services/header.service.js';
import { AuthService } from '../../../core/services/auth.service.js';
import {
  NotificacaoService,
  Notificacao,
} from '../../../core/services/notificacao/notificacao.service.js';
import { SugestaoItem, LoteStatus, STATUS_CONFIG } from '../../models/lote.models.js';

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
  protected notificacaoService = inject(NotificacaoService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  //  Estado do usuário

  /** Mapeia os perfis do backend para nomes amigáveis */
  cargoFormatado = computed(() => {
    const perfil = this.authService.usuario()?.perfil;
    const mapa: Record<string, string> = {
      operador: 'Operador de Linha',
      inspetor: 'Inspetor de Qualidade',
      gestor: 'Gestor de Produção',
    };
    return mapa[perfil || ''] || 'Cargo';
  });

  goToPerfil() {
    this.router.navigate(['/app/perfil']);
  }

  goToConfiguracoes() {
    this.router.navigate(['/app/configuracoes']);
  }

  //  Estado da pesquisa

  termoPesquisa = '';
  sugestoes = signal<SugestaoItem[]>([]);
  carregando = signal(false);
  dropdownAberto = signal(false);
  notificacoesAbertas = signal(false);

  /** Sugestões filtradas por tipo, usadas no template */
  loteSugestoes = computed(() => this.sugestoes().filter((s) => s.tipo === 'lote'));
  produtoSugestoes = computed(() => this.sugestoes().filter((s) => s.tipo === 'produto'));

  private pesquisaSubject = new Subject<string>();
  private subscription?: Subscription;

  //  Lifecycle

  ngOnInit(): void {
    this.subscription = this.pesquisaSubject
      .pipe(
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
      )
      .subscribe((resultados) => {
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

  //  Handlers do input

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
      this.notificacoesAbertas.set(false);
    }
  }

  //  Ações de navegação

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
      const loteExato = this.loteSugestoes().find((s) => s.label === termo);
      if (loteExato?.id) {
        this.router.navigate(['/app/lote', loteExato.id]);
        return;
      }
      // Lote exato no padrão mas não encontrado nas sugestões → faz busca rápida
      this.headerService.buscarSugestoes(termo).subscribe((sugestoes) => {
        const lote = sugestoes.find((s) => s.tipo === 'lote' && s.label === termo);
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

  toggleNotificacoes(): void {
    this.notificacoesAbertas.update((v) => !v);
    if (this.notificacoesAbertas()) {
      this.fecharDropdown();
    }
  }
  marcarLida(id: number): void {
    this.notificacaoService.marcarComoLida(id);
  }

  clicarNotificacao(notificacao: Notificacao): void {
    // 1. Marca como lida
    if (!notificacao.lida) {
      this.notificacaoService.marcarComoLida(notificacao.id);
    }

    // 2. Fecha o painel
    this.notificacoesAbertas.set(false);

    // 3. Navega baseando-se no metadata
    const metadata = notificacao.metadata;
    if (metadata?.link) {
      const queryParams: { busca?: string; produtoId?: number; id?: number } = {};
      if (metadata.filtro) {
        queryParams.busca = metadata.filtro;
      }

      // Se houver um ID de referência, mapeia para o parâmetro correto dependendo do link
      if (metadata.idRef) {
        if (metadata.link.includes('lote/novo')) {
          queryParams.produtoId = metadata.idRef;
        } else {
          queryParams.id = metadata.idRef;
        }
      }

      // Converte link string em array de segmentos para o router
      const urlSegments = metadata.link.split('/').filter((s: string) => s.length > 0);
      this.router.navigate(urlSegments, { queryParams });
    }
  } /**
 * Formata a data da notificação seguindo a regra:
...
   * - Hoje: 'Hoje HH:mm'
   * - Ontem: 'Ontem HH:mm'
   * - Antes de ontem: 'DD/MM HH:mm'
   */
  formatarDataNotificacao(dataIso: string): string {
    const data = new Date(dataIso);
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);

    const isHoje = data.toDateString() === hoje.toDateString();
    const isOntem = data.toDateString() === ontem.toDateString();

    const horas = data.getHours().toString().padStart(2, '0');
    const minutos = data.getMinutes().toString().padStart(2, '0');
    const horario = `${horas}:${minutos}`;

    if (isHoje) return `Hoje ${horario}`;
    if (isOntem) return `Ontem ${horario}`;

    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes} ${horario}`;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  //  Utilitários de template

  getStatusConfig(status?: LoteStatus) {
    return (
      STATUS_CONFIG[status!] ?? {
        label: status ?? '',
        cor: '#ADAAAA',
        corBg: 'transparent',
        corBorda: '#484847',
      }
    );
  }
}
