import type { Request, Response } from "express";
import { MetricasService, type PeriodoDashboard } from "../services/metricas.service.js";
import { getRequisitante } from "../utils/auth.utils.js";

export class MetricasController {
  private metricasService: MetricasService;

  constructor() {
    this.metricasService = new MetricasService();
  }

  getDashboard = async (req: Request, res: Response) => {
    const periodoLotes = req.query.periodoLotes as PeriodoDashboard;
    const periodoUnidades = req.query.periodoUnidades as PeriodoDashboard;

    const dashboard = await this.metricasService.getDashboard(getRequisitante(req), periodoLotes, periodoUnidades);

    return res.status(200).json(dashboard);
  };
}