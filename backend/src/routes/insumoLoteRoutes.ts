import { Router } from "express";
import { InsumoLoteController } from "../controllers/InsumoLoteController.js";
import { InsumoLoteService } from "../services/InsumoLoteService.js";

const router = Router();
const insumoService = new InsumoLoteService();
const insumoController = new InsumoLoteController(insumoService);

router.get("/rastreabilidade", insumoController.rastreabilidadeReversa);
router.post("/lotes/:loteId/insumos", insumoController.vincular);
router.get("/lotes/:loteId/insumos", insumoController.listarPorLote);
router.delete("/insumos/:id", insumoController.remover);

export default router;