import { Router } from 'express';
import { LoteController } from '../controllers/lote.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { validateBody } from '../middlewares/validateBody.js';
import { criarLoteSchema, transicaoStatusSchema, vincularInsumosSchema } from '../dto/lote.dto.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';

const loteRoutes = Router();

const loteController = new LoteController();

loteRoutes.use(authGuard);

loteRoutes.post("/", roleGuard(PerfilUsuario.OPERADOR), validateBody(criarLoteSchema), loteController.create);
loteRoutes.get("/", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), loteController.getAll);
loteRoutes.post("/:id/insumos", roleGuard(PerfilUsuario.OPERADOR), validateBody(vincularInsumosSchema), loteController.vincularInsumos);
loteRoutes.patch("/:id/encerrar", roleGuard(PerfilUsuario.OPERADOR), loteController.encerrar);
loteRoutes.patch("/:id/status", roleGuard(PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), validateBody(transicaoStatusSchema), loteController.updateStatus);
loteRoutes.get("/:id", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), loteController.getDetalhes);

export default loteRoutes;