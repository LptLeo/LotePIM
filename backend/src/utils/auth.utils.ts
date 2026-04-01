import type { Request } from "express";
import type { PerfilUsuario } from "../entities/Usuario.js";

export const getRequisitante = (req: Request) => {
  const auth = (req as any).auth;
  return {
    id: Number(auth.id),
    perfil: auth.perfil as PerfilUsuario,
  };
}