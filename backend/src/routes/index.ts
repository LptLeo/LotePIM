import { Router } from "express";
import usuarioRoutes from "./usuario.routes.js";
import produtoRoutes from "./produto.routes.js";

const routes = Router();

routes.use('/usuarios', usuarioRoutes);
routes.use('/produtos', produtoRoutes);

export default routes;