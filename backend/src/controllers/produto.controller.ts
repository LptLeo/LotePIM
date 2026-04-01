import type { Request, Response } from 'express';
import { ProdutoService } from '../services/produto.service.js';
import { criarProdutoSchema, atualizarProdutoSchema } from '../dto/ProdutoDTO.js';
import { ZodError } from 'zod';
import { getRequisitante } from '../utils/auth.utils.js';

export class ProdutoController {
  private produtoService: ProdutoService;

  constructor() {
    this.produtoService = new ProdutoService();
  }

  create = async (req: Request, res: Response) => {
    try {
      const requisitante = getRequisitante(req);
      const validatedData = criarProdutoSchema.parse(req.body);

      const novoProduto = await this.produtoService.createProduto(validatedData, requisitante);

      return res.status(201).json(novoProduto);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      return res.status(400).json({ message: error.message });
    }
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const requisitante = getRequisitante(req);
      const filtros: any = {};

      if (req.query.search) filtros.search = String(req.query.search);
      if (req.query.ativo) filtros.ativo = req.query.ativo === 'true';

      const produtos = await this.produtoService.getAllProdutos(requisitante, filtros);

      return res.status(200).json(produtos);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const requisitante = getRequisitante(req);

      const produto = await this.produtoService.getProdutoById(Number(id), requisitante);

      return res.status(200).json(produto);
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  }

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = atualizarProdutoSchema.parse(req.body);
      const requisitante = getRequisitante(req);

      const produto = await this.produtoService.updateProduto(Number(id), validatedData, requisitante);

      return res.status(200).json(produto);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      return res.status(404).json({ message: error.message });
    }
  }

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const requisitante = getRequisitante(req);

      await this.produtoService.desativarProduto(Number(id), requisitante);

      return res.status(204).send();
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  }
}
