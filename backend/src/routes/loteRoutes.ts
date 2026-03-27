import { Router } from 'express';
import { LoteController } from '../controllers/LoteController.js';

const router = Router();
const loteController = new LoteController();

router.post("/lotes", (req, res) => loteController.create(req, res));
router.get("/lotes", (req, res) => loteController.getAll(req, res));
router.post("/lotes/:id/insumos", (req, res) => loteController.vincularInsumos(req, res));
router.patch("/lotes/:id/encerrar", (req, res) => loteController.encerrar(req, res));
router.get("/lotes/:id", (req, res) => loteController.getDetalhes(req, res));
router.get("/lotes/reversa/:loteOrigem", (req, res) => loteController.reversa(req, res));

export default router;