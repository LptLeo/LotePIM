import { Router } from 'express';
import { ProdutoController } from '../controllers/produto.controller.js';
import { validateBody } from '../middlewares/validateBody.js';
import { atualizarProdutoSchema, criarProdutoSchema } from '../dto/produto.dto.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';

const produtoRoutes = Router();

const produtoController = new ProdutoController();

produtoRoutes.post("/", roleGuard(PerfilUsuario.GESTOR), validateBody(criarProdutoSchema), produtoController.create);
produtoRoutes.post("/sku-suggestion", roleGuard(PerfilUsuario.GESTOR), produtoController.sugerirSku);
produtoRoutes.get("/metrics", roleGuard(PerfilUsuario.GESTOR), produtoController.getMetrics);
produtoRoutes.get("/categorias", roleGuard(PerfilUsuario.GESTOR), produtoController.getCategorias);
produtoRoutes.get("/", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR), produtoController.getAll);
produtoRoutes.get("/:id", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR), produtoController.getById);
produtoRoutes.patch("/:id", roleGuard(PerfilUsuario.GESTOR), validateBody(atualizarProdutoSchema), produtoController.update);
produtoRoutes.delete("/:id", roleGuard(PerfilUsuario.GESTOR), produtoController.delete);

export default produtoRoutes;
