import type { Request, Response } from 'express';
import type { SseService } from '../services/sse.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

export class EventsController {
  constructor(private readonly sseService: SseService) {}

  gerarTicket = asyncHandler(async (req: Request, res: Response) => {
    const requisitante = getRequisitante(req);
    const ticket = this.sseService.gerarTicket(requisitante.id);
    res.json({ ticket });
  });

  conectarStream = asyncHandler(async (req: Request, res: Response) => {
    const { ticket } = req.query as { ticket?: string };

    if (!ticket) {
      res.status(401).json({ message: 'Ticket ausente.' });
      return;
    }

    const userId = this.sseService.validarTicket(ticket);
    if (!userId) {
      res.status(401).json({ message: 'Ticket inválido ou expirado.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.sseService.adicionarCliente(res);

    req.on('close', () => {
      this.sseService.removerCliente(res);
    });
  });
}
