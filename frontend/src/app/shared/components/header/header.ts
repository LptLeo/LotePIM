import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

import { HeaderService } from './services/header.service.js';
import { AuthService } from '../../../core/services/auth.service.js';
import {
  NotificacaoService,
  Notificacao,
} from '../../../core/services/notificacao/notificacao.service.js';
import { SugestaoItem, LoteStatus, STATUS_CONFIG } from '../../models/lote.models.js';

const LOTE_REGEX = /^LOTE-\d{8}-\d{3}$/;

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private headerService = inject(HeaderService);
  protected authService = inject(AuthService);
  protected notificacaoService = inject(NotificacaoService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  //  Estado do usuário

  public cargoFormatado = computed(() => {
    const perfil = this.authService.usuario()?.perfil;
    const mapa: Record<string, string> = {
      operador: 'Operador de Linha',
      inspetor: 'Inspetor de Qualidade',
      gestor: 'Gestor de Produção',
    };
    return mapa[perfil || ''] || 'Cargo';
  });

  public goToPerfil(): void {
    this.router.navigate(['/app/perfil']);
  }

  public goToConfiguracoes(): void {
    this.router.navigate(['/app/configuracoes']);
  }

  //  Estado da pesquisa

  public termoPesquisa = signal('');
  public carregando = signal(false);
  public dropdownAberto = signal(false);
  public notificacoesAbertas = signal(false);

  /** Sugestões filtradas por tipo, usadas no template */
  public loteSugestoes = computed(() =>
    this.sugestoes().filter((s) => s.tipo === 'lote'),
  );
  public produtoSugestoes = computed(() =>
    this.sugestoes().filter((s) => s.tipo === 'produto'),
  );

  private resultados$ = toObservable(this.termoPesquisa).pipe(
    debounceTime(400),
    distinctUntilChanged(),
    switchMap((termo) => {
      if (!termo || termo.trim().length < 2) {
        return of([] as SugestaoItem[]);
      }
      this.carregando.set(true);
      return this.headerService
        .buscarSugestoes(termo)
        .pipe(tap(() => this.carregando.set(false)));
    }),
    tap((resultados) => {
      this.dropdownAberto.set(
        resultados.length > 0 || this.termoPesquisa().trim().length >= 2,
      );
    }),
  );

  public sugestoes = toSignal(this.resultados$, { initialValue: [] as SugestaoItem[] });

  //  Handlers do input

  public onInputChange(valor: string): void {
    this.termoPesquisa.set(valor);
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.pesquisar();
    } else if (event.key === 'Escape') {
      this.fecharDropdown();
    }
  }

  /** Fecha o dropdown ao clicar fora do componente */
  @HostListener('document:click', ['$event'])
  // usado pelo @HostListener
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.fecharDropdown();
      this.notificacoesAbertas.set(false);
    }
  }

  //  Ações de navegação

  public pesquisar(): void {
    const termo = this.termoPesquisa().trim();
    if (!termo) return;

    this.fecharDropdown();

    if (LOTE_REGEX.test(termo)) {
      const loteExato = this.loteSugestoes().find((s) => s.label === termo);
      if (loteExato?.id) {
        this.router.navigate(['/app/lote', loteExato.id]);
        return;
      }
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

  public selecionarSugestao(sugestao: SugestaoItem): void {
    this.termoPesquisa.set(sugestao.label);
    this.fecharDropdown();

    if (sugestao.tipo === 'lote' && sugestao.id) {
      this.router.navigate(['/app/lote', sugestao.id]);
    } else {
      this.router.navigate(['/app/lote'], { queryParams: { busca: sugestao.label } });
    }
  }

  public fecharDropdown(): void {
    this.dropdownAberto.set(false);
  }

  public toggleNotificacoes(): void {
    this.notificacoesAbertas.update((v) => !v);
    if (this.notificacoesAbertas()) {
      this.fecharDropdown();
    }
  }
  public marcarLida(id: number): void {
    this.notificacaoService.marcarComoLida(id);
  }

  public clicarNotificacao(notificacao: Notificacao): void {
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
  }

  public formatarDataNotificacao(dataIso: string): string {
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

  public logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  //  Utilitários de template

  public getStatusConfig(status?: LoteStatus) {
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
