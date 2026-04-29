import type { Request, Response, NextFunction } from "express";
import { InsumoEstoqueService } from "../services/insumoEstoque.service.js";
import { getRequisitante } from "../utils/auth.utils.js";

const service = new InsumoEstoqueService();

export const criar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.criar(req.body, getRequisitante(req));
    res.status(201).json(resultado);
  } catch (e) { next(e); }
};

export const listar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.listar(req.query as any, getRequisitante(req));
    res.json(resultado);
  } catch (e) { next(e); }
};

export const buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.buscarPorId(Number(req.params.id), getRequisitante(req));
    res.json(resultado);
  } catch (e) { next(e); }
};

/** Endpoint para o funil do operador: lista insumos disponíveis filtrados por matérias-primas */
export const listarDisponiveis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = (req.query.ids as string || "")
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);

    const resultado = await service.listarDisponiveis(ids, getRequisitante(req));
    res.json(resultado);
  } catch (e) { next(e); }
};
