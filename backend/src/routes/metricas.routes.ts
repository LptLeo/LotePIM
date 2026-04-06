import { Router } from "express";
import { MetricasController } from "../controllers/metricas.controller.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const metricasRoutes = Router();
const metricasController = new MetricasController();

metricasRoutes.get(
  "/dashboard",
  roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR),
  metricasController.getDashboard
);

export default metricasRoutes;