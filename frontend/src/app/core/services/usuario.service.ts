import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

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

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/usuarios';

  getAll() {
    return this.http.get<UsuarioPerfil[]>(this.API_URL);
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
}
