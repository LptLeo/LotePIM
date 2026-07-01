import type { Request, Response } from 'express';
import { InspecaoService } from '../services/inspecao.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

export class InspecaoController {
  constructor(private readonly inspecaoService: InspecaoService) {}

  registrar = asyncHandler(async (req: Request, res: Response) => {
    const loteId = Number(req.params.loteId);
    if (isNaN(loteId)) throw new AppError('ID do lote inválido', 400);
    const resultado = await this.inspecaoService.registrar({
      loteId,
      dto: req.body,
      requisitante: getRequisitante(req),
    });
    res.status(201).json(resultado);
  });

  buscarPorLote = asyncHandler(async (req: Request, res: Response) => {
    const loteId = Number(req.params.loteId);
    if (isNaN(loteId)) throw new AppError('ID do lote inválido', 400);
    const resultado = await this.inspecaoService.buscarPorLote(
      loteId,
      getRequisitante(req),
    );
    res.json(resultado);
  });
}
