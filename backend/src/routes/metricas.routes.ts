import { Router } from 'express';
import { MetricasController } from '../controllers/metricas.controller.js';
import { MetricasService } from '../services/metricas.service.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';
import { appDataSource } from '../config/appDataSource.js';
import { Lote } from '../entities/Lote.js';

const loteRepo = appDataSource.getRepository(Lote);
const service = new MetricasService(loteRepo);
const metricasController = new MetricasController(service);
const metricasRoutes = Router();

metricasRoutes.get(
  '/dashboard',
  roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR),
  metricasController.obterDashboard,
);

export default metricasRoutes;
