import { Router } from "express";
import { NotificacaoController } from "../controllers/notificacao.controller.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";

const router = Router();
const ctrl = new NotificacaoController();

// Todos os usuários autenticados podem ver suas próprias notificações
router.get("/", roleGuard(PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR), ctrl.listar);
router.patch("/:id/lida", roleGuard(PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR), ctrl.marcarComoLida);

export default router;