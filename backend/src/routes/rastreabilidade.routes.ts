import { Router } from "express";
import { RastreabilidadeController } from "../controllers/rastreabilidade.controller.js";
import { authGuard } from "../middlewares/authGuard.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const rastreabilidadeRoutes = Router();
const rastreabilidadeController = new RastreabilidadeController();

rastreabilidadeRoutes.use(authGuard);

rastreabilidadeRoutes.get("/", roleGuard(PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR), rastreabilidadeController.consultar);

export default rastreabilidadeRoutes;