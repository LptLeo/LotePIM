import { Router } from 'express';
import { validateBody } from '../middlewares/validateBody.js';
import { loginSchema } from '../dto/login.dto.js';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { appDataSource } from '../config/appDataSource.js';
import { Usuario } from '../entities/Usuario.js';

const authService = new AuthService(appDataSource.getRepository(Usuario));
const authController = new AuthController(authService);
const authRoutes = Router();

authRoutes.post('/login', validateBody(loginSchema), authController.login);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);

export default authRoutes;
