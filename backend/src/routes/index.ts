import { Router } from "express";
import usuarioRoutes from "./usuario.routes.js";
import produtoRoutes from "./produto.routes.js";
import loteRoutes from "./lote.routes.js";
import insumoRoutes from "./insumoLote.routes.js";
import rastreabilidadeRoutes from "./rastreabilidade.routes.js";
import inspecaoRoutes from "./inspecaoLote.routes.js";

const routes = Router();

routes.use('/usuarios', usuarioRoutes);
routes.use('/produtos', produtoRoutes);
routes.use('/lotes', loteRoutes);
routes.use('/insumos', insumoRoutes);
routes.use('/rastreabilidade', rastreabilidadeRoutes);
routes.use('/inspecao', inspecaoRoutes);

export default routes;