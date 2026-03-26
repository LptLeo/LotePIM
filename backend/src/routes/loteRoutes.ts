import { Router } from 'express';
import { LoteController } from '../controllers/LoteController';

const routes = Router();
const loteController = new LoteController();

// Rotas para /app/lotes
routes.post('/', (req, res) => loteController.criar(req, res));
routes.get('/', (req, res) => loteController.listar(req, res));

export default routes;