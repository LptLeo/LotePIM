import { Router } from "express";
import * as ctrl from "../controllers/materiaPrima.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { criarMateriaPrimaSchema } from "../dto/materiaPrima.dto.js";
import { PaginacaoQueryDto } from "../dto/paginacao.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const router = Router();

router.get("/", validateQuery(PaginacaoQueryDto), ctrl.listar);
router.get("/categorias", ctrl.listarCategorias);
router.get("/:id", ctrl.buscarPorId);
// Apenas GESTOR pode cadastrar novas matérias-primas (ação administrativa)
router.post("/", roleGuard(PerfilUsuario.GESTOR), validateBody(criarMateriaPrimaSchema), ctrl.criar);

export default router;
