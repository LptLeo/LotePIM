import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timer, Subscription } from 'rxjs';

export interface Notificacao {
  id: number;
  mensagem: string;
  tipo: 'sistema' | 'estoque' | 'inspecao' | 'produto';
  lida: boolean;
  criado_em: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacaoService implements OnDestroy {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/notificacoes';
  private pollingSub?: Subscription;

  notificacoes = signal<Notificacao[]>([]);
  naoLidasCount = signal<number>(0);

  carregarNotificacoes() {
    // Busca inicial e em tempo real a cada 15 segundos
    if (!this.pollingSub) {
      this.pollingSub = timer(0, 15000).subscribe(() => {
        this.buscarDoServidor();
      });
    }
  }

  private buscarDoServidor() {
    this.http.get<Notificacao[]>(this.API_URL).subscribe(data => {
      this.notificacoes.set(data);
      this.atualizarContagem(data);
    });
  }

  marcarComoLida(id: number) {
    this.http.patch<Notificacao>(`${this.API_URL}/${id}/lida`, {}).subscribe(atualizada => {
      const atualizadas = this.notificacoes().map(n => n.id === id ? atualizada : n);
      this.notificacoes.set(atualizadas);
      this.atualizarContagem(atualizadas);
    });
  }

  private atualizarContagem(lista: Notificacao[]) {
    this.naoLidasCount.set(lista.filter(n => !n.lida).length);
  }

  ngOnDestroy() {
    this.pollingSub?.unsubscribe();
  }
}

