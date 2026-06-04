import { Router } from 'express';
import { UsuarioController } from '../controllers/usuario.controller.js';
import { UsuarioService } from '../services/usuario.service.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { Lote } from '../entities/Lote.js';
import { Inspecao } from '../entities/Inspecao.js';
import { Produto } from '../entities/Produto.js';
import { validateBody } from '../middlewares/validateBody.js';
import { validateQuery } from '../middlewares/validateQuery.js';
import {
  criarUsuarioSchema,
  atualizarUsuarioSchema,
  atualizarSenhaSchema,
  listUsuariosQuerySchema,
} from '../dto/usuario.dto.js';
import { appDataSource } from '../config/appDataSource.js';

const usuarioService = new UsuarioService({
  usuarioRepo: appDataSource.getRepository(Usuario),
  loteRepo: appDataSource.getRepository(Lote),
  inspecaoRepo: appDataSource.getRepository(Inspecao),
  produtoRepo: appDataSource.getRepository(Produto),
});
const usuarioController = new UsuarioController(usuarioService);
const usuarioRoutes = Router();

usuarioRoutes.get(
  '/',
  roleGuard(PerfilUsuario.GESTOR),
  validateQuery(listUsuariosQuerySchema),
  usuarioController.listar,
);
usuarioRoutes.get('/:id/stats', usuarioController.obterStats);
usuarioRoutes.get('/:id', usuarioController.buscarPorId);
usuarioRoutes.post(
  '/',
  roleGuard(PerfilUsuario.GESTOR),
  validateBody(criarUsuarioSchema),
  usuarioController.criar,
);
usuarioRoutes.patch(
  '/:id',
  validateBody(atualizarUsuarioSchema),
  usuarioController.atualizar,
);
usuarioRoutes.patch(
  '/:id/senha',
  validateBody(atualizarSenhaSchema),
  usuarioController.atualizarSenha,
);
usuarioRoutes.post(
  '/:id/reativar',
  roleGuard(PerfilUsuario.GESTOR),
  usuarioController.reativar,
);
usuarioRoutes.delete(
  '/:id',
  roleGuard(PerfilUsuario.GESTOR),
  usuarioController.desativar,
);

export default usuarioRoutes;
