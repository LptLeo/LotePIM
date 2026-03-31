import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateBody } from "../middlewares/validateBody.js";
import { LoginDTO } from "../dto/login.dto.js";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post('/login', validateBody(LoginDTO), authController.login);

export default authRoutes;