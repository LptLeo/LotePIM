import { Router } from 'express';
import { LoteController } from '../controllers/LoteController.js';

const loteRouter = Router();
const loteController = new LoteController();

loteRouter.post("/lotes", (req, res) => loteController.create(req, res));
loteRouter.get("/lotes", (req, res) => loteController.getAll(req, res));
loteRouter.post("/lotes/:id/insumos", (req, res) => loteController.vincularInsumos(req, res));
loteRouter.patch("/lotes/:id/encerrar", (req, res) => loteController.encerrar(req, res));
loteRouter.get("/lotes/:id", (req, res) => loteController.getDetalhes(req, res));
loteRouter.get("/lotes/reversa/:loteOrigem", (req, res) => loteController.reversa(req, res));

export default loteRouter;