import { Router } from 'express';
import { LoteController } from '../controllers/lote.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { validateBody } from '../middlewares/validateBody.js';
import { criarLoteSchema, detalhesLoteSchema, encerrarLoteSchema, transicaoStatusSchema, vincularInsumosSchema } from '../dto/lote.dto.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';

const loteRoutes = Router();

const loteController = new LoteController();

loteRoutes.use(authGuard);

loteRoutes.post("/", roleGuard(PerfilUsuario.OPERADOR), validateBody(criarLoteSchema), loteController.create);
loteRoutes.get("/", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), loteController.getAll);
loteRoutes.post("/insumos/:id", roleGuard(PerfilUsuario.OPERADOR), validateBody(vincularInsumosSchema), loteController.vincularInsumos);
loteRoutes.patch("/encerrar/:id", roleGuard(PerfilUsuario.OPERADOR), validateBody(encerrarLoteSchema), loteController.encerrar);
loteRoutes.patch("/status/:id", roleGuard(PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), validateBody(transicaoStatusSchema), loteController.updateStatus);
loteRoutes.get("/:id", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), validateBody(detalhesLoteSchema), loteController.getDetalhes);

export default loteRoutes;