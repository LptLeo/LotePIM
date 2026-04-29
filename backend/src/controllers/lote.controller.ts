import type { Request, Response, NextFunction } from "express";
import { LoteService } from "../services/lote.service.js";
import { getRequisitante } from "../utils/auth.utils.js";

const service = new LoteService();

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

export const getContagem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.getContagemPorStatus(getRequisitante(req));
    res.json(resultado);
  } catch (e) { next(e); }
};

export const buscarPorId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.buscarPorId(Number(req.params.id), getRequisitante(req));
    res.json(resultado);
  } catch (e) { next(e); }
};

/** Retorna o tempo de produção configurado (para a barra de progresso do frontend) */
export const getConfig = async (_req: Request, res: Response, _next: NextFunction) => {
  res.json({ tempo_producao_minutos: service.getTempoProducao() });
};