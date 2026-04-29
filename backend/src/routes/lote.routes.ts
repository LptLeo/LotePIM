import { Router } from "express";
import * as ctrl from "../controllers/lote.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { criarLoteSchema, transicaoStatusSchema, ListLotesQueryDto } from "../dto/lote.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const router = Router();

router.get("/", validateQuery(ListLotesQueryDto), ctrl.listar);
router.get("/config", ctrl.getConfig);
router.get("/stats/contagem", ctrl.getContagem);
router.get("/:id", ctrl.buscarPorId);
// Apenas OPERADOR pode abrir lotes (regra de negócio #2)
router.post("/", roleGuard(PerfilUsuario.OPERADOR), validateBody(criarLoteSchema), ctrl.criar);

export default router;