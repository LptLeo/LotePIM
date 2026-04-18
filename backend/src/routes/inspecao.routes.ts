import { Router } from "express";
import * as ctrl from "../controllers/inspecao.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { registrarInspecaoSchema } from "../dto/inspecao.dto.js";

const router = Router({ mergeParams: true });

router.get("/", ctrl.buscarPorLote);
router.post("/", validateBody(registrarInspecaoSchema), ctrl.registrar);

export default router;
