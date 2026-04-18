import { Router } from "express";
import * as ctrl from "../controllers/lote.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { criarLoteSchema } from "../dto/lote.dto.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/config", ctrl.getConfig);
router.get("/:id", ctrl.buscarPorId);
router.post("/", validateBody(criarLoteSchema), ctrl.criar);

export default router;