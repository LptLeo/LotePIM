import type { Request, Response } from "express";
import { MetricasService } from "../services/metricas.service.js";
import { getRequisitante } from "../utils/auth.utils.js";

export class MetricasController {
  private metricasService: MetricasService;

  constructor() {
    this.metricasService = new MetricasService();
  }

  getDashboard = async (req: Request, res: Response) => {
    const dashboard = await this.metricasService.getDashboard(getRequisitante(req));

    return res.status(200).json(dashboard);
  };
}