import { Router } from 'express';
import { ProdutoController } from '../controllers/produto.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { validateBody } from '../middlewares/validateBody.js';
import { atualizarProdutoSchema, criarProdutoSchema } from '../dto/ProdutoDTO.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';

const produtoRoutes = Router();

const produtoController = new ProdutoController();

produtoRoutes.use(authGuard);

produtoRoutes.post("/", roleGuard(PerfilUsuario.GESTOR), validateBody(criarProdutoSchema), produtoController.create);
produtoRoutes.get("/", produtoController.getAll);
produtoRoutes.get("/:id", produtoController.getById);
produtoRoutes.put("/:id", roleGuard(PerfilUsuario.GESTOR), validateBody(atualizarProdutoSchema), produtoController.update);
produtoRoutes.delete("/:id", roleGuard(PerfilUsuario.GESTOR), produtoController.delete);

export default produtoRoutes;
