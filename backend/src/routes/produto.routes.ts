import { Router } from 'express';
import { validateBody } from '../middlewares/validateBody.js';
import { validateQuery } from '../middlewares/validateQuery.js';
import {
  criarProdutoSchema,
  atualizarReceitaSchema,
  listProdutosQuerySchema,
  alternarStatusProdutoSchema,
} from '../dto/produto.dto.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { Produto } from '../entities/Produto.js';
import { ReceitaItem } from '../entities/ReceitaItem.js';
import { MateriaPrima } from '../entities/MateriaPrima.js';
import { ProdutoService } from '../services/produto.service.js';
import { ProdutoController } from '../controllers/produto.controller.js';
import { appDataSource } from '../config/appDataSource.js';
import { NotificacaoService } from '../services/notificacao.service.js';
import { Notificacao } from '../entities/Notificacao.js';

const produtoService = new ProdutoService({
  produtoRepo: appDataSource.getRepository(Produto),
  receitaRepo: appDataSource.getRepository(ReceitaItem),
  mpRepo: appDataSource.getRepository(MateriaPrima),
  usuarioRepo: appDataSource.getRepository(Usuario),
  dataSource: appDataSource,
  notificacaoService: new NotificacaoService(
    appDataSource.getRepository(Notificacao),
    appDataSource.getRepository(Usuario),
  ),
});
const produtoController = new ProdutoController(produtoService);
const router = Router();

router.get(
  '/',
  roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR),
  validateQuery(listProdutosQuerySchema),
  produtoController.listar,
);
router.get(
  '/categorias',
  roleGuard(PerfilUsuario.GESTOR),
  produtoController.listarCategorias,
);
router.get('/linhas', roleGuard(PerfilUsuario.GESTOR), produtoController.listarLinhas);
router.get(
  '/contagem',
  roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR),
  produtoController.obterContagem,
);
router.get(
  '/:id',
  roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR),
  produtoController.buscarPorId,
);
router.post(
  '/',
  roleGuard(PerfilUsuario.GESTOR),
  validateBody(criarProdutoSchema),
  produtoController.criar,
);
router.patch(
  '/:id/receita',
  roleGuard(PerfilUsuario.GESTOR),
  validateBody(atualizarReceitaSchema),
  produtoController.atualizarReceita,
);
router.patch(
  '/:id/status',
  roleGuard(PerfilUsuario.GESTOR),
  validateBody(alternarStatusProdutoSchema),
  produtoController.alternarStatus,
);

export default router;
