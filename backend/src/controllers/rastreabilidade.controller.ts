import type { Request, Response } from "express";
import { RastreabilidadeService } from "../services/rastreabilidade.service.js";
import { queryRastreabilidadeSchema } from "../dto/rastreabilidade.dto.js";
import { getRequisitante } from "../utils/auth.utils.js";

export class RastreabilidadeController {
  private rastreabilidadeService: RastreabilidadeService;

  constructor() {
    this.rastreabilidadeService = new RastreabilidadeService();
  }

  consultar = async (req: Request, res: Response) => {
    const { termo } = queryRastreabilidadeSchema.parse(req.query);

    const resultado = await this.rastreabilidadeService.consultar(termo, getRequisitante(req));

    return res.json(resultado);
  };
}