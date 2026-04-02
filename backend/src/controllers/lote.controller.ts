import type { Request, Response } from 'express';
import { LoteService } from '../services/lote.service.js';
import type { LoteStatus } from '../entities/Lote.js';
import { getRequisitante } from '../utils/auth.utils.js';

export class LoteController {
  private loteService: LoteService;

  constructor() {
    this.loteService = new LoteService();
  }

  create = async (req: Request, res: Response) => {
    const novoLote = await this.loteService.createLote(req.body, getRequisitante(req));

    return res.status(201).json(novoLote);
  }

  getAll = async (req: Request, res: Response) => {
    const filtros = {
      produto_id: req.query.produto_id as string,
      status: req.query.status as LoteStatus,
      dataInicio: req.query.dataInicio ? new Date(req.query.dataInicio as string) : undefined,
      dataFim: req.query.dataFim ? new Date(req.query.dataFim as string) : undefined
    }

    const lotes = await this.loteService.getAllLotes(getRequisitante(req), filtros);

    return res.status(200).json(lotes);
  }

  vincularInsumos = async (req: Request, res: Response) => {
    const { id } = req.params;
    const insumos = req.body;

    const resultado = await this.loteService.vincularInsumos(Number(id), insumos, getRequisitante(req));

    return res.json(resultado);
  }

  encerrar = async (req: Request, res: Response) => {
    const { id } = req.params;
    const loteEncerrado = await this.loteService.encerrarProducao(Number(id), getRequisitante(req));

    return res.json(loteEncerrado);
  }

  getDetalhes = async (req: Request, res: Response) => {
    const { id } = req.params;
    const detalhes = await this.loteService.getLoteById(Number(id), getRequisitante(req));

    return res.json(detalhes);
  }

  updateStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const loteAtualizado = await this.loteService.updateStatus(Number(id), status, getRequisitante(req));

    return res.json(loteAtualizado);
  }
}