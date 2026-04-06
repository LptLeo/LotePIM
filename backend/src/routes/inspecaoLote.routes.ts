import { Router } from "express";
import { InspecaoLoteController } from "../controllers/inspecaoLote.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { registrarInspecaoSchema } from "../dto/inspecaoLote.dto.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const inspecaoRoutes = Router({ mergeParams: true });
const inspecaoController = new InspecaoLoteController();

inspecaoRoutes.post("/", roleGuard(PerfilUsuario.INSPETOR), validateBody(registrarInspecaoSchema), inspecaoController.registrar);
inspecaoRoutes.get("/", roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR), inspecaoController.buscarPorLote);

export default inspecaoRoutes;