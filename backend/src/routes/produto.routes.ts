import { Router } from "express";
import * as ctrl from "../controllers/produto.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { criarProdutoSchema, atualizarReceitaSchema } from "../dto/produto.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/categorias", ctrl.listarCategorias);
router.get("/:id", ctrl.buscarPorId);
// Apenas GESTOR pode criar produtos e alterar receitas (regra de negócio #1)
router.post("/", roleGuard(PerfilUsuario.GESTOR), validateBody(criarProdutoSchema), ctrl.criar);
router.patch("/:id/receita", roleGuard(PerfilUsuario.GESTOR), validateBody(atualizarReceitaSchema), ctrl.atualizarReceita);

export default router;
