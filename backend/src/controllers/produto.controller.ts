import type { Request, Response } from 'express';
import { ProdutoService } from '../services/produto.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { AppError } from '../errors/AppError.js';
import type { ListProdutosQueryDto } from '../dto/produto.dto.js';

export class ProdutoController {
  constructor(private readonly produtoService: ProdutoService) {}

  criar = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.produtoService.criar(req.body, getRequisitante(req));
    res.status(201).json(resultado);
  });

  listar = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListProdutosQueryDto;
    const resultado = await this.produtoService.listar(query, getRequisitante(req));
    res.json(resultado);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do produto inválido', 400);
    const resultado = await this.produtoService.buscarPorId(id, getRequisitante(req));
    res.json(resultado);
  });

  obterContagem = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.produtoService.obterContagem(getRequisitante(req));
    res.json(resultado);
  });

  listarCategorias = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.produtoService.listarCategorias(getRequisitante(req));
    res.json(resultado);
  });

  listarLinhas = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.produtoService.listarLinhas(getRequisitante(req));
    res.json(resultado);
  });

  atualizarReceita = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do produto inválido', 400);
    const resultado = await this.produtoService.atualizarReceita(
      id,
      req.body,
      getRequisitante(req),
    );
    res.json(resultado);
  });

  alternarStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do produto inválido', 400);
    const resultado = await this.produtoService.alternarStatus(
      id,
      req.body.ativo,
      getRequisitante(req),
    );
    res.json(resultado);
  });
}
