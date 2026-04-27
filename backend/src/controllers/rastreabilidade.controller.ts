import type { Request, Response, NextFunction } from "express";
import { RastreabilidadeService } from "../services/rastreabilidade.service.js";
import { queryRastreabilidadeSchema } from "../dto/rastreabilidade.dto.js";
import { getRequisitante } from "../utils/auth.utils.js";
import { z } from "zod";

export class RastreabilidadeController {
  private rastreabilidadeService: RastreabilidadeService;

  constructor() {
    this.rastreabilidadeService = new RastreabilidadeService();
  }

  autocomplete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = z.object({ q: z.string().min(2) }).parse(req.query);
      const resultado = await this.rastreabilidadeService.autocomplete(q, getRequisitante(req));
      return res.json(resultado);
    } catch (error) {
      next(error);
    }
  };

  consultar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { termo } = queryRastreabilidadeSchema.parse(req.query);
      const resultado = await this.rastreabilidadeService.consultar(termo, req.query as any, getRequisitante(req));
      return res.json(resultado);
    } catch (error) {
      next(error);
    }
  };
}