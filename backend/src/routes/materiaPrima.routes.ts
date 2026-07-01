import { Router } from 'express';
import { validateBody } from '../middlewares/validateBody.js';
import { validateQuery } from '../middlewares/validateQuery.js';
import { criarMateriaPrimaSchema } from '../dto/materiaPrima.dto.js';
import { paginacaoQuerySchema } from '../dto/paginacao.dto.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';
import { MateriaPrimaController } from '../controllers/materiaPrima.controller.js';
import { MateriaPrimaService } from '../services/materiaPrima.service.js';
import { appDataSource } from '../config/appDataSource.js';
import { MateriaPrima } from '../entities/MateriaPrima.js';

const materiaPrimaService = new MateriaPrimaService(
  appDataSource.getRepository(MateriaPrima),
);
const materiaPrimaController = new MateriaPrimaController(materiaPrimaService);
const router = Router();

router.get('/', validateQuery(paginacaoQuerySchema), materiaPrimaController.listar);
router.get('/categorias', materiaPrimaController.listarCategorias);
router.get('/:id', materiaPrimaController.buscarPorId);
router.post(
  '/',
  roleGuard(PerfilUsuario.GESTOR),
  validateBody(criarMateriaPrimaSchema),
  materiaPrimaController.criar,
);

export default router;
