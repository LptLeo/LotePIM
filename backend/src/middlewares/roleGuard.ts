import type { NextFunction, Request, Response } from "express"
import { PerfilUsuario } from "../entities/Usuario.js"
import { AppError } from "../errors/AppError.js";

export const roleGuard = (...perfisPermitidos: PerfilUsuario[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const usuarioLogado = (req as any).auth;

    if (!usuarioLogado) {
      return next(new AppError('Usuário não autenticado', 401));
    }

    if (usuarioLogado.perfil === PerfilUsuario.GESTOR) {
      return next();
    }

    const temPermissao = perfisPermitidos.includes(usuarioLogado.perfil);

    if (!temPermissao) {
      return next(new AppError(`Acesso negado: seu perfil (${usuarioLogado.perfil}) não tem permissão para realizar esta ação`, 403));
    }

    next();
  }
}