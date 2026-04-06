import { Router } from "express";
import { InspecaoLoteController } from "../controllers/inspecaoLote.controller.js";
import { authGuard } from "../middlewares/authGuard.js";
import { validateBody } from "../middlewares/validateBody.js";
import { registrarInspecaoSchema } from "../dto/inspecaoLote.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const inspecaoRoutes = Router();
const inspecaoController = new InspecaoLoteController();

inspecaoRoutes.use(authGuard);

inspecaoRoutes.post("/lotes/:loteId/inspecao", roleGuard(PerfilUsuario.INSPETOR), validateBody(registrarInspecaoSchema), inspecaoController.registrar);
inspecaoRoutes.get("/lotes/:loteId/inspecao", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), inspecaoController.buscarPorLote);

export default inspecaoRoutes;