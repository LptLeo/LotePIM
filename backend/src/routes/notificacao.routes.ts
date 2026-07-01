import { Router } from 'express';
import { NotificacaoController } from '../controllers/notificacao.controller.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { NotificacaoService } from '../services/notificacao.service.js';
import { appDataSource } from '../config/appDataSource.js';
import { Notificacao } from '../entities/Notificacao.js';

const notificacaoService = new NotificacaoService(
  appDataSource.getRepository(Notificacao),
  appDataSource.getRepository(Usuario),
);
const notificacaoController = new NotificacaoController(notificacaoService);
const notificacaoRouter = Router();

notificacaoRouter.get(
  '/',
  roleGuard(PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR),
  notificacaoController.listar,
);
notificacaoRouter.patch(
  '/:id/lida',
  roleGuard(PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR),
  notificacaoController.marcarComoLida,
);

export default notificacaoRouter;
