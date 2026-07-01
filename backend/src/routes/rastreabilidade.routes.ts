import { Router } from 'express';
import { RastreabilidadeController } from '../controllers/rastreabilidade.controller.js';
import { RastreabilidadeService } from '../services/rastreabilidade.service.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { validateQuery } from '../middlewares/validateQuery.js';
import { PerfilUsuario } from '../entities/Usuario.js';
import { Lote } from '../entities/Lote.js';
import { ConsumoInsumo } from '../entities/ConsumoInsumo.js';
import { InsumoEstoque } from '../entities/InsumoEstoque.js';
import { appDataSource } from '../config/appDataSource.js';
import {
  queryRastreabilidadeSchema,
  autocompleteQuerySchema,
} from '../dto/rastreabilidade.dto.js';

const rastreabilidadeService = new RastreabilidadeService(
  appDataSource.getRepository(Lote),
  appDataSource.getRepository(ConsumoInsumo),
  appDataSource.getRepository(InsumoEstoque),
);
const rastreabilidadeController = new RastreabilidadeController(rastreabilidadeService);
const rastreabilidadeRoutes = Router();

const guard = roleGuard(
  PerfilUsuario.GESTOR,
  PerfilUsuario.INSPETOR,
  PerfilUsuario.OPERADOR,
);

rastreabilidadeRoutes.get(
  '/autocomplete',
  guard,
  validateQuery(autocompleteQuerySchema),
  rastreabilidadeController.autocomplete,
);
rastreabilidadeRoutes.get(
  '/',
  guard,
  validateQuery(queryRastreabilidadeSchema),
  rastreabilidadeController.consultar,
);

export default rastreabilidadeRoutes;
