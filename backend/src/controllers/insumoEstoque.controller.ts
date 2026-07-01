import type { Request, Response } from 'express';
import { InsumoEstoqueService } from '../services/insumoEstoque.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import type {
  ListarDisponiveisQueryDto,
  ListInsumosQueryDto,
} from '../dto/insumoEstoque.dto.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

export class InsumoEstoqueController {
  constructor(private readonly service: InsumoEstoqueService) {}

  receberLoteInsumo = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.service.receberLoteInsumo(
      req.body,
      getRequisitante(req),
    );
    res.status(201).json(resultado);
  });

  receberLoteInsumoBulk = asyncHandler(async (req: Request, res: Response) => {
    const resultados = await this.service.receberLoteInsumoBulk(
      req.body,
      getRequisitante(req),
    );
    res.status(201).json(resultados);

    if (process.env.NODE_ENV !== 'test') {
      const requisitante = getRequisitante(req);
      this.service.simularChegadaDeLotes(resultados, requisitante);
    }
  });

  listar = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListInsumosQueryDto;
    const resultado = await this.service.listar(query, getRequisitante(req));
    res.json(resultado);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.service.buscarPorId(
      Number(req.params.id),
      getRequisitante(req),
    );
    res.json(resultado);
  });

  atualizarStatus = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.service.atualizarStatus(
      Number(req.params.id),
      req.body.status,
      getRequisitante(req),
    );
    res.json(resultado);
  });

  getContagem = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.service.obterResumoDeEstoque(getRequisitante(req));
    res.json(resultado);
  });

  listarDisponiveis = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.query as unknown as ListarDisponiveisQueryDto;
    const resultado = await this.service.listarInsumosDisponiveisPorMateriaPrima(
      ids,
      getRequisitante(req),
    );
    res.json(resultado);
  });
}
