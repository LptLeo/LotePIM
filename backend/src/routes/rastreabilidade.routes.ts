import { Router } from "express";
import { RastreabilidadeController } from "../controllers/rastreabilidade.controller.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

import { validateQuery } from "../middlewares/validateQuery.js";
import { PaginacaoQueryDto } from "../dto/paginacao.dto.js";

const rastreabilidadeRoutes = Router();
const rastreabilidadeController = new RastreabilidadeController();

const guard = roleGuard(PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR);

rastreabilidadeRoutes.get("/autocomplete", guard, rastreabilidadeController.autocomplete);
rastreabilidadeRoutes.get("/", guard, validateQuery(PaginacaoQueryDto), rastreabilidadeController.consultar);

export default rastreabilidadeRoutes;