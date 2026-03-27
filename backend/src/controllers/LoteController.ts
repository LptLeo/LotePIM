import { Request, Response } from 'express';

export class LoteController {
  // Simulação de banco de dados para exemplo inicial
private static lotes: any[] = [];

  // US01 - Abrir novo lote [cite: 137, 149, 150]
async criar(req: Request, res: Response) {
    const { produto_id, turno, quantidade_prod, operador_id } = req.body;

    // RNF01 - O número do lote deve ser gerado pelo backend [cite: 142]
    const novoNumeroLote = `LOT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const novoLote = {
    id: this.lotes.length + 1,
    numero_lote: novoNumeroLote,
    produto_id,
    turno,
    quantidade_prod,
    operador_id,
    status: 'em_producao', // Status inicial obrigatório [cite: 150, 154]
    aberto_em: new Date()
    };

    this.lotes.push(novoLote);
    return res.status(201).json(novoLote);
}

  // Listagem com filtros [cite: 101, 140]
async listar(req: Request, res: Response) {
    return res.json(this.lotes);
}
}