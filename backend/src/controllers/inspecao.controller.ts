import type { Request, Response, NextFunction } from "express";
import { InspecaoService } from "../services/inspecao.service.js";
import { getRequisitante } from "../utils/auth.utils.js";

const service = new InspecaoService();

export const registrar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loteId = Number(req.params.loteId);
    const resultado = await service.registrar(loteId, req.body, getRequisitante(req));
    res.status(201).json(resultado);
  } catch (e) { next(e); }
};

export const buscarPorLote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loteId = Number(req.params.loteId);
    const resultado = await service.buscarPorLote(loteId, getRequisitante(req));
    res.json(resultado);
  } catch (e) { next(e); }
};
