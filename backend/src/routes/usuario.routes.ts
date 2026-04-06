import { Router } from "express";
import { UsuarioController } from "../controllers/usuario.controller.js";
import { roleGuard } from "../middlewares/roleGuard.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { validateBody } from "../middlewares/validateBody.js";
import { CreateUsuarioDto, UpdateSenhaDto, UpdateUsuarioDto } from "../dto/usuario.dto.js";

const usuarioRoutes = Router();

const usuarioController = new UsuarioController();

usuarioRoutes.get('/', roleGuard(PerfilUsuario.GESTOR), usuarioController.findAll);
usuarioRoutes.get('/:id', usuarioController.findById);
usuarioRoutes.post('/', roleGuard(PerfilUsuario.GESTOR), validateBody(CreateUsuarioDto), usuarioController.create);
usuarioRoutes.patch('/:id', validateBody(UpdateUsuarioDto), usuarioController.update);
usuarioRoutes.patch('/:id/senha', validateBody(UpdateSenhaDto), usuarioController.updateSenha);
usuarioRoutes.delete('/:id', roleGuard(PerfilUsuario.GESTOR), usuarioController.delete);

export default usuarioRoutes;