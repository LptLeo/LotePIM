import { Router } from 'express';
import { validateBody } from '../middlewares/validateBody.js';
import { validateQuery } from '../middlewares/validateQuery.js';
import {
  criarLoteSchema,
  listLotesQuerySchema,
  sugestaoQuerySchema,
} from '../dto/lote.dto.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario, Usuario } from '../entities/Usuario.js';
import { LoteController } from '../controllers/lote.controller.js';
import { LoteService } from '../services/lote.service.js';
import { appDataSource } from '../config/appDataSource.js';
import { Lote } from '../entities/Lote.js';
import { Produto } from '../entities/Produto.js';
import { NotificacaoService } from '../services/notificacao.service.js';
import { Notificacao } from '../entities/Notificacao.js';
import { sseService } from '../services/sse.service.js';

const loteService = new LoteService({
  loteRepo: appDataSource.getRepository(Lote),
  produtoRepo: appDataSource.getRepository(Produto),
  usuarioRepo: appDataSource.getRepository(Usuario),
  notificacaoService: new NotificacaoService(
    appDataSource.getRepository(Notificacao),
    appDataSource.getRepository(Usuario),
  ),
  dataSource: appDataSource,
  sseService: sseService,
  tempoProducaoMinutos: Number(process.env.TEMPO_PRODUCAO_MINUTOS) || 2,
});
const loteController = new LoteController(loteService);
const loteRouter = Router();

loteRouter.get('/', validateQuery(listLotesQuerySchema), loteController.listar);
loteRouter.get('/config', loteController.getConfig);
loteRouter.get('/stats/contagem', loteController.getContagem);
loteRouter.get(
  '/busca',
  validateQuery(sugestaoQuerySchema),
  loteController.buscarSugestoes,
);
loteRouter.get('/:id', loteController.buscarPorId);
loteRouter.post(
  '/',
  roleGuard(PerfilUsuario.OPERADOR),
  validateBody(criarLoteSchema),
  loteController.criar,
);

export default loteRouter;
