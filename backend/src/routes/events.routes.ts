import { Router } from 'express';
import { EventsController } from '../controllers/events.controller.js';
import { sseService } from '../services/sse.service.js';
import { authGuard } from '../middlewares/authGuard.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { PerfilUsuario } from '../entities/Usuario.js';

const eventsController = new EventsController(sseService);
const router = Router();

router.post(
  '/ticket',
  authGuard,
  roleGuard(PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR),
  eventsController.gerarTicket,
);
router.get('/stream', eventsController.conectarStream);

export default router;
