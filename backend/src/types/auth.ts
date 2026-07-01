import { PerfilUsuario } from '../entities/Usuario.js';

export interface TokenPayload {
  id: number;
  nome: string;
  perfil: PerfilUsuario;
}
