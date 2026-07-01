import type { Request } from 'express';
import { PerfilUsuario } from '../entities/Usuario.js';
import { AppError } from '../errors/AppError.js';

export interface Requisitante {
  id: number;
  perfil: PerfilUsuario;
}

export const getRequisitante = (req: Request): Requisitante => {
  const auth = req.auth;

  if (!auth) throw new AppError('Usuário não autenticado', 401);

  return {
    id: auth.id,
    perfil: auth.perfil,
  };
};

export const verificaPermissao = (
  requisitante: Requisitante,
  permitidos: PerfilUsuario[],
  alvoId?: number,
) => {
  const { id, perfil } = requisitante;

  if (perfil === PerfilUsuario.GESTOR) return;

  const perfilPermitido = permitidos.includes(perfil);

  if (alvoId !== undefined) {
    const proprietarioId = id === alvoId;

    if (!proprietarioId && !perfilPermitido) throw new AppError('Acesso negado', 403);

    return;
  }

  if (!perfilPermitido)
    throw new AppError('Acesso negado: requer perfil: ' + permitidos.join(', '), 403);
};
