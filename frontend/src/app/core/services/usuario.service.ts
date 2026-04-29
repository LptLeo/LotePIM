import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface RespostaPaginada<T> {
  itens: T[];
  meta: {
    totalItens: number;
    itensPorPagina: number;
    totalPaginas: number;
    paginaAtual: number;
  };
}

export interface UsuarioPerfil {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  criado_em: string;
  criadoPor?: { nome: string };
}

export interface UsuarioStats {
  lotes_produzidos: number;
  lotes_inspecionados: number;
  produtos_registrados: number;
}

export interface CreateUsuarioPayload {
  nome: string;
  email: string;
  perfil: 'operador' | 'inspetor' | 'gestor';
  senha: string;
  ativo: boolean;
}

export interface UpdateUsuarioPayload {
  nome?: string;
  email?: string;
}

export interface UpdateSenhaPayload {
  senha_atual: string;
  nova_senha: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/usuarios';

  getAll(filtros?: Record<string, string | number>) {
    let params = new HttpParams();

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<RespostaPaginada<UsuarioPerfil>>(this.API_URL, { params });
  }

  getPerfil(id: number) {
    return this.http.get<UsuarioPerfil>(`${this.API_URL}/${id}`);
  }

  getStats(id: number) {
    return this.http.get<UsuarioStats>(`${this.API_URL}/${id}/stats`);
  }

  create(payload: CreateUsuarioPayload) {
    return this.http.post<UsuarioPerfil>(this.API_URL, payload);
  }

  updatePerfil(id: number, payload: UpdateUsuarioPayload) {
    return this.http.patch<UsuarioPerfil>(`${this.API_URL}/${id}`, payload);
  }

  updateSenha(id: number, payload: UpdateSenhaPayload) {
    return this.http.patch<void>(`${this.API_URL}/${id}/senha`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  reativar(id: number) {
    return this.http.post<void>(`${this.API_URL}/${id}/reativar`, {});
  }
}
