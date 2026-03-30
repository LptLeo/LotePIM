import type { Request, Response } from 'express';
import { ProdutoService } from '../services/ProdutoService.js';
import { criarProdutoSchema, atualizarProdutoSchema } from '../dto/ProdutoDTO.js';
import { ZodError } from 'zod';

export class ProdutoController {
  private produtoService: ProdutoService;

  constructor() {
    this.produtoService = new ProdutoService();
  }

  async create(req: Request, res: Response) {
    try {
      const validatedData = criarProdutoSchema.parse(req.body);
      const novoProduto = await this.produtoService.createProduto(validatedData);

      return res.status(201).json(novoProduto);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      return res.status(400).json({ message: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const filtros: any = {};
      if (req.query.search) filtros.search = String(req.query.search);
      if (req.query.ativo) filtros.ativo = req.query.ativo === 'true';

      const produtos = await this.produtoService.getAllProdutos(filtros);

      return res.status(200).json(produtos);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const produto = await this.produtoService.getProdutoById(id as string);

      return res.status(200).json(produto);
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = atualizarProdutoSchema.parse(req.body);

      const produto = await this.produtoService.updateProduto(id as string, validatedData);

      return res.status(200).json(produto);
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      return res.status(404).json({ message: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.produtoService.desativarProduto(id as string);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(404).json({ message: error.message });
    }
  }
}
