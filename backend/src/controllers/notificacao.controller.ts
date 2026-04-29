import type { Request, Response } from "express";
import { NotificacaoService } from "../services/notificacao.service.js";

export class NotificacaoController {
  private notificacaoService: NotificacaoService;

  constructor() {
    this.notificacaoService = new NotificacaoService();
  }

  listar = async (req: Request, res: Response): Promise<void> => {
    const usuarioId = Number((req as any).auth.id);
    const notificacoes = await this.notificacaoService.listarPorUsuario(usuarioId);
    res.status(200).json(notificacoes);
  }

  marcarComoLida = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const usuarioId = Number((req as any).auth.id);
    const notificacao = await this.notificacaoService.marcarComoLida(Number(id), usuarioId);
    res.status(200).json(notificacao);
  }
}