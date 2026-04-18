import { Router } from "express";
import * as ctrl from "../controllers/produto.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { criarProdutoSchema, atualizarReceitaSchema } from "../dto/produto.dto.js";

const router = Router();

router.get("/", ctrl.listar);
router.get("/categorias", ctrl.listarCategorias);
router.get("/:id", ctrl.buscarPorId);
router.post("/", validateBody(criarProdutoSchema), ctrl.criar);
router.patch("/:id/receita", validateBody(atualizarReceitaSchema), ctrl.atualizarReceita);

export default router;
