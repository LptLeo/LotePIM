import { Router } from "express";
import * as ctrl from "../controllers/inspecao.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { registrarInspecaoSchema } from "../dto/inspecao.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const router = Router({ mergeParams: true });

router.get("/", ctrl.buscarPorLote);
// Apenas INSPETOR (e GESTOR) podem registrar inspeções
router.post("/", roleGuard(PerfilUsuario.INSPETOR), validateBody(registrarInspecaoSchema), ctrl.registrar);

export default router;
