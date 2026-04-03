import type { Request } from "express";
import type { PerfilUsuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";

export const getRequisitante = (req: Request) => {
  const auth = (req as any).auth;
  return {
    id: Number(auth.id),
    perfil: auth.perfil as PerfilUsuario,
  };
}

export interface Requisitante {
  id: number;
  perfil: PerfilUsuario;
}

export const verificaPermissao = (perfil: PerfilUsuario, permitidos: PerfilUsuario[]) => {
  if (!permitidos.includes(perfil)) {
    throw new AppError(`Acesso negado: apenas usuários com perfil ${permitidos.join(", ")} podem realizar esta operação.`, 403);
  }
}