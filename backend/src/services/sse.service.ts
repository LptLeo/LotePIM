import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { logger } from '../utils/logger.js';

interface Ticket {
  userId: number;
  expira_em: Date;
}

export class SseService {
  private readonly clientes = new Set<Response>();
  private readonly tickets = new Map<string, Ticket>();

  constructor(heartbeatIntervalMs: number = 30_000) {
    setInterval(() => this.executarHeartbeat(), heartbeatIntervalMs).unref();
  }

  // === FUNÇÕES PÚBLICAS ===

  public get quantidadeClientes(): number {
    return this.clientes.size;
  }

  public adicionarCliente(res: Response): void {
    this.clientes.add(res);
    logger.info(`Cliente SSE conectado. Total: ${this.clientes.size}`);
  }

  public removerCliente(res: Response): void {
    this.clientes.delete(res);
    logger.info(`Cliente SSE desconectado. Total: ${this.clientes.size}`);
  }

  public emitir(evento: string, dados: object): void {
    const payload = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`;

    for (const res of this.clientes) {
      try {
        res.write(payload);
      } catch {
        this.removerCliente(res);
      }
    }
  }

  public gerarTicket(userId: number): string {
    const ticket = randomUUID();
    const expiraEm = new Date(Date.now() + 30_000);
    this.tickets.set(ticket, { userId, expira_em: expiraEm });
    return ticket;
  }

  public validarTicket(ticket: string): number | null {
    const info = this.tickets.get(ticket);

    if (!info) return null;

    if (info.expira_em < new Date()) {
      this.tickets.delete(ticket);
      return null;
    }

    this.tickets.delete(ticket);
    return info.userId;
  }

  // === FUNÇÕES PRIVADAS ===

  private executarHeartbeat(): void {
    for (const res of this.clientes) {
      try {
        res.write(':ping\n\n');
      } catch {
        this.removerCliente(res);
      }
    }
  }
}

export const sseService = new SseService();
