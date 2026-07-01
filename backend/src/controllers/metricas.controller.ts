import type { Request, Response } from 'express';
import { MetricasService, type PeriodoDashboard } from '../services/metricas.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

export class MetricasController {
  constructor(private readonly metricasService: MetricasService) {}

  obterDashboard = asyncHandler(async (req: Request, res: Response) => {
    const periodoLotes = req.query.periodoLotes as PeriodoDashboard;
    const periodoUnidades = req.query.periodoUnidades as PeriodoDashboard;

    const dashboard = await this.metricasService.obterDashboard(
      getRequisitante(req),
      periodoLotes,
      periodoUnidades,
    );

    res.json(dashboard);
  });
}
