import { Router } from "express";
import { RastreabilidadeController } from "../controllers/rastreabilidade.controller.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const rastreabilidadeRoutes = Router();
const rastreabilidadeController = new RastreabilidadeController();

rastreabilidadeRoutes.get("/", roleGuard(PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR), rastreabilidadeController.consultar);

export default rastreabilidadeRoutes;