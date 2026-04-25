import { Router } from "express";
import * as ctrl from "../controllers/insumoEstoque.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { criarInsumoEstoqueSchema } from "../dto/insumoEstoque.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/disponiveis", ctrl.listarDisponiveis);
router.get("/:id", ctrl.buscarPorId);
// Apenas OPERADOR (e GESTOR) podem registrar entradas de insumo no estoque
router.post("/", roleGuard(PerfilUsuario.OPERADOR), validateBody(criarInsumoEstoqueSchema), ctrl.criar);

export default router;
