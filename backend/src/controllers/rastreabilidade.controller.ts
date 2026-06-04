import type { Request, Response } from 'express';
import { RastreabilidadeService } from '../services/rastreabilidade.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import type { PaginacaoQueryDto } from '../dto/paginacao.dto.js';

export class RastreabilidadeController {
  constructor(private readonly rastreabilidadeService: RastreabilidadeService) {}

  autocomplete = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query.q as string;
    const resultado = await this.rastreabilidadeService.autocomplete(
      q,
      getRequisitante(req),
    );
    res.json(resultado);
  });

  consultar = asyncHandler(async (req: Request, res: Response) => {
    const termo = req.query.termo as string;
    const resultado = await this.rastreabilidadeService.consultar(
      termo,
      req.query as unknown as PaginacaoQueryDto,
      getRequisitante(req),
    );
    res.json(resultado);
  });
}
