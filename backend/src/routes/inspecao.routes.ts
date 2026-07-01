import { Router } from 'express';
import { validateBody } from '../middlewares/validateBody.js';
import { registrarInspecaoSchema } from '../dto/inspecao.dto.js';
import { appDataSource } from '../config/appDataSource.js';
import { Inspecao } from '../entities/Inspecao.js';
import { Lote } from '../entities/Lote.js';
import { Usuario } from '../entities/Usuario.js';
import { InspecaoService } from '../services/inspecao.service.js';
import { InspecaoController } from '../controllers/inspecao.controller.js';
import { sseService } from '../services/sse.service.js';

const inspecaoService = new InspecaoService(
  appDataSource.getRepository(Inspecao),
  appDataSource.getRepository(Lote),
  appDataSource.getRepository(Usuario),
  appDataSource,
  sseService,
);
const inspecaoController = new InspecaoController(inspecaoService);
const inspecaoRoutes = Router({ mergeParams: true });

inspecaoRoutes.get('/', inspecaoController.buscarPorLote);
inspecaoRoutes.post(
  '/',
  validateBody(registrarInspecaoSchema),
  inspecaoController.registrar,
);

export default inspecaoRoutes;
