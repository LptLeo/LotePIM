import { Router } from "express";
import * as ctrl from "../controllers/materiaPrima.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { criarMateriaPrimaSchema } from "../dto/materiaPrima.dto.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/categorias", ctrl.listarCategorias);
router.get("/:id", ctrl.buscarPorId);
router.post("/", validateBody(criarMateriaPrimaSchema), ctrl.criar);

export default router;
