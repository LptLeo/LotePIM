import type { Request, Response } from 'express';
import { NotificacaoService } from '../services/notificacao.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { AppError } from '../errors/AppError.js';

export class NotificacaoController {
  constructor(private readonly notificacaoService: NotificacaoService) {}

  listar = asyncHandler(async (req: Request, res: Response) => {
    const { id: usuarioId } = getRequisitante(req);
    const notificacoes = await this.notificacaoService.listarPorUsuario(usuarioId);
    res.json(notificacoes);
  });

  marcarComoLida = asyncHandler(async (req: Request, res: Response) => {
    const idParam = Number(req.params.id);
    if (isNaN(idParam)) throw new AppError('ID da notificação inválido', 400);
    const { id: usuarioId } = getRequisitante(req);
    const notificacao = await this.notificacaoService.marcarComoLida(idParam, usuarioId);
    res.json(notificacao);
  });
}
