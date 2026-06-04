import { Router } from 'express';
import { validateBody } from '../middlewares/validateBody.js';
import { validateQuery } from '../middlewares/validateQuery.js';
import {
  criarInsumoEstoqueSchema,
  criarInsumoEstoqueBulkSchema,
  listarDisponiveisQuerySchema,
  listInsumosQuerySchema,
} from '../dto/insumoEstoque.dto.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { Notificacao } from '../entities/Notificacao.js';
import { InsumoEstoqueService } from '../services/insumoEstoque.service.js';
import { appDataSource } from '../config/appDataSource.js';
import { InsumoEstoque } from '../entities/InsumoEstoque.js';
import { NotificacaoService } from '../services/notificacao.service.js';
import { sseService } from '../services/sse.service.js';
import { InsumoEstoqueController } from '../controllers/insumoEstoque.controller.js';

const insumoEstoqueRepo = appDataSource.getRepository(InsumoEstoque);
const notificacaoService = new NotificacaoService(
  appDataSource.getRepository(Notificacao),
  appDataSource.getRepository(Usuario),
);
const dataSource = appDataSource;

const service = new InsumoEstoqueService(
  insumoEstoqueRepo,
  notificacaoService,
  dataSource,
  sseService,
);
const insumoEstoqueController = new InsumoEstoqueController(service);
const router = Router();

router.get(
  '/',
  roleGuard(PerfilUsuario.OPERADOR),
  validateQuery(listInsumosQuerySchema),
  insumoEstoqueController.listar,
);
router.get(
  '/stats/contagem',
  roleGuard(PerfilUsuario.OPERADOR),
  insumoEstoqueController.getContagem,
);
router.get(
  '/disponiveis',
  roleGuard(PerfilUsuario.OPERADOR),
  validateQuery(listarDisponiveisQuerySchema),
  insumoEstoqueController.listarDisponiveis,
);
router.get(
  '/:id',
  roleGuard(PerfilUsuario.OPERADOR),
  insumoEstoqueController.buscarPorId,
);
router.patch(
  '/:id/status',
  roleGuard(PerfilUsuario.OPERADOR),
  insumoEstoqueController.atualizarStatus,
);
// Apenas OPERADOR (e GESTOR) podem registrar entradas de insumo no estoque
router.post(
  '/bulk',
  roleGuard(PerfilUsuario.OPERADOR),
  validateBody(criarInsumoEstoqueBulkSchema),
  insumoEstoqueController.receberLoteInsumoBulk,
);
router.post(
  '/',
  roleGuard(PerfilUsuario.OPERADOR),
  validateBody(criarInsumoEstoqueSchema),
  insumoEstoqueController.receberLoteInsumo,
);

export default router;
