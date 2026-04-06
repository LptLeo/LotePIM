import { Router } from "express";
import { InsumoLoteController } from "../controllers/insumoLote.controller.js";
import { authGuard } from "../middlewares/authGuard.js";
import { validateBody } from "../middlewares/validateBody.js";
import { vincularInsumosSchema } from "../dto/insumoLote.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const insumoRoutes = Router({ mergeParams: true });
const insumoController = new InsumoLoteController();

insumoRoutes.use(authGuard);

insumoRoutes.post("/", roleGuard(PerfilUsuario.OPERADOR), validateBody(vincularInsumosSchema), insumoController.vincular);
insumoRoutes.get("/", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), insumoController.listarPorLote);
insumoRoutes.delete("/:id", roleGuard(PerfilUsuario.OPERADOR), insumoController.remover);

export default insumoRoutes;