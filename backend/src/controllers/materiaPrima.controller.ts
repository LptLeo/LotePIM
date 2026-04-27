import type { Request, Response, NextFunction } from "express";
import { MateriaPrimaService } from "../services/materiaPrima.service.js";
import { getRequisitante } from "../utils/auth.utils.js";

const service = new MateriaPrimaService();

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

export const listarCategorias = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resultado = await service.listarCategorias(getRequisitante(req));
    res.json(resultado);
  } catch (e) { next(e); }
};
