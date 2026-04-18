import { Router } from "express";
import * as ctrl from "../controllers/insumoEstoque.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { criarInsumoEstoqueSchema } from "../dto/insumoEstoque.dto.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/disponiveis", ctrl.listarDisponiveis);
router.get("/:id", ctrl.buscarPorId);
router.post("/", validateBody(criarInsumoEstoqueSchema), ctrl.criar);

export default router;
