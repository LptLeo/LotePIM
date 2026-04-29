import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usuarioRoutes from "./usuario.routes.js";
import materiaPrimaRoutes from "./materiaPrima.routes.js";
import produtoRoutes from "./produto.routes.js";
import insumoEstoqueRoutes from "./insumoEstoque.routes.js";
import loteRoutes from "./lote.routes.js";
import inspecaoRoutes from "./inspecao.routes.js";
import metricasRoutes from "./metricas.routes.js";
import rastreabilidadeRoutes from "./rastreabilidade.routes.js";
import notificacaoRoutes from "./notificacao.routes.js";
import { authGuard } from "../middlewares/authGuard.js";

const routes = Router();

/** Rota pública de autenticação */
routes.use("/auth", authRoutes);

/** Guard: rotas abaixo exigem token JWT válido */
routes.use(authGuard);

routes.use("/usuarios", usuarioRoutes);
routes.use("/materias-primas", materiaPrimaRoutes);
routes.use("/produtos", produtoRoutes);
routes.use("/insumos-estoque", insumoEstoqueRoutes);
routes.use("/lotes", loteRoutes);
routes.use("/lotes/:loteId/inspecao", inspecaoRoutes);
routes.use("/metricas", metricasRoutes);
routes.use("/rastreabilidade", rastreabilidadeRoutes);
routes.use("/notificacoes", notificacaoRoutes);

export default routes;