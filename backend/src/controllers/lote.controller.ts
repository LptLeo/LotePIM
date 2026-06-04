import type { Request, Response } from 'express';
import { getRequisitante } from '../utils/auth.utils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import type { ListLotesQueryDto } from '../dto/lote.dto.js';
import type { LoteService } from '../services/lote.service.js';

export class LoteController {
  constructor(private readonly loteService: LoteService) {}

  criar = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.loteService.criar(req.body, getRequisitante(req));
    res.status(201).json(resultado);
  });

  listar = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListLotesQueryDto;
    const resultado = await this.loteService.listar(query, getRequisitante(req));
    res.json(resultado);
  });

  getContagem = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.loteService.obterContagemPorStatus(getRequisitante(req));
    res.json(resultado);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.loteService.buscarPorId(
      Number(req.params.id),
      getRequisitante(req),
    );
    res.json(resultado);
  });

  buscarSugestoes = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query.q as string;
    if (!q) {
      res.json([]);
      return;
    }

    const resultado = await this.loteService.buscarSugestoes(q, getRequisitante(req));
    res.json(resultado);
  });

  getConfig = async (_req: Request, res: Response) => {
    res.json({ tempo_producao_minutos: this.loteService.obterTempoProducao() });
  };
}
