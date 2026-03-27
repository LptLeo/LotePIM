import { Router } from 'express';
import { LoteController } from '../controllers/LoteController.js';

const routes = Router();
const loteController = new LoteController();

// Rotas para /app/lotes
routes.post('/', (req, res) => loteController.create(req, res));
routes.get('/', (req, res) => loteController.getAll(req, res));

export default routes;