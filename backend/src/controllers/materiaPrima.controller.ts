import type { Request, Response } from 'express';
import { getRequisitante } from '../utils/auth.utils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import type { PaginacaoQueryDto } from '../dto/paginacao.dto.js';
import type { MateriaPrimaService } from '../services/materiaPrima.service.js';

export class MateriaPrimaController {
  constructor(private readonly materiaPrimaService: MateriaPrimaService) {}

  criar = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.materiaPrimaService.criar(
      req.body,
      getRequisitante(req),
    );
    res.status(201).json(resultado);
  });

  listar = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.materiaPrimaService.listar(
      req.query as unknown as PaginacaoQueryDto,
      getRequisitante(req),
    );
    res.json(resultado);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.materiaPrimaService.buscarPorId(
      Number(req.params.id),
      getRequisitante(req),
    );
    res.json(resultado);
  });

  listarCategorias = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.materiaPrimaService.listarCategorias(
      getRequisitante(req),
    );
    res.json(resultado);
  });
}
