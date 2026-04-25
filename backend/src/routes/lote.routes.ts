import { Router } from "express";
import * as ctrl from "../controllers/lote.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { criarLoteSchema } from "../dto/lote.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/config", ctrl.getConfig);
router.get("/:id", ctrl.buscarPorId);
// Apenas OPERADOR (e GESTOR, que sempre passa) podem abrir lotes
router.post("/", roleGuard(PerfilUsuario.OPERADOR), validateBody(criarLoteSchema), ctrl.criar);

export default router;