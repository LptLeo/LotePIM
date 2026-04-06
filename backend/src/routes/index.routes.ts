import { Router } from "express";
import usuarioRoutes from "./usuario.routes.js";
import produtoRoutes from "./produto.routes.js";
import loteRoutes from "./lote.routes.js";
import insumoRoutes from "./insumoLote.routes.js";
import rastreabilidadeRoutes from "./rastreabilidade.routes.js";
import inspecaoRoutes from "./inspecaoLote.routes.js";
import authRoutes from "./auth.routes.js";
import { authGuard } from "../middlewares/authGuard.js";

const routes = Router();

routes.use('/auth', authRoutes);

routes.use(authGuard);

routes.use('/usuarios', usuarioRoutes);
routes.use('/produtos', produtoRoutes);
routes.use('/lotes', loteRoutes);
routes.use('/lotes/:loteId/insumos', insumoRoutes);
routes.use('/lotes/:loteId/inspecao', inspecaoRoutes);
routes.use('/rastreabilidade', rastreabilidadeRoutes);

export default routes;