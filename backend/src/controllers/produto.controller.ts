import type { Request, Response } from 'express';
import { ProdutoService } from '../services/produto.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { AppError } from '../errors/AppError.js';

export class ProdutoController {
  private produtoService: ProdutoService;

  constructor() {
    this.produtoService = new ProdutoService();
  }

  create = async (req: Request, res: Response) => {
    const novoProduto = await this.produtoService.createProduto(req.body, getRequisitante(req));

    return res.status(201).json(novoProduto);
  }

  getAll = async (req: Request, res: Response) => {
    const filtros: any = {};

    if (req.query.search) filtros.search = String(req.query.search);
    if (req.query.ativo !== undefined) filtros.ativo = req.query.ativo === 'true';
    if (req.query.sem_insumos !== undefined) filtros.sem_insumos = req.query.sem_insumos === 'true';
    if (req.query.sort) filtros.sort = String(req.query.sort);

    const produtos = await this.produtoService.getAllProdutos(getRequisitante(req), filtros);

    return res.status(200).json(produtos);
  }

  getMetrics = async (req: Request, res: Response) => {
    const metrics = await this.produtoService.getMetrics(getRequisitante(req));
    return res.status(200).json(metrics);
  }

  getCategorias = async (req: Request, res: Response) => {
    const categorias = await this.produtoService.getCategoriasAtivas(getRequisitante(req));
    return res.status(200).json(categorias);
  }

  sugerirSku = async (req: Request, res: Response) => {
    const { nome } = req.body;
    const sugestao = await this.produtoService.sugerirSku(nome, getRequisitante(req));
    return res.status(200).json(sugestao);
  }

  getById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) throw new AppError("ID do produto não fornecido.", 400);

    const produto = await this.produtoService.getProdutoById(Number(id), getRequisitante(req));

    return res.status(200).json(produto);
  }

  update = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) throw new AppError("ID do produto não fornecido.", 400);

    const produto = await this.produtoService.updateProduto(Number(id), req.body, getRequisitante(req));

    return res.status(200).json(produto);
  }

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) throw new AppError("ID do produto não fornecido.", 400);

    await this.produtoService.desativarProduto(Number(id), getRequisitante(req));

    return res.status(204).send();
  }
}
