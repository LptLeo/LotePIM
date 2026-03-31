import { Router } from "express";
import usuarioRoutes from "./usuario.routes.js";

const routes = Router();

routes.use('/usuarios', usuarioRoutes);

export default routes;