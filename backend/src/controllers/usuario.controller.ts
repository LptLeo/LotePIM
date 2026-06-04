import type { Request, Response } from 'express';
import { UsuarioService } from '../services/usuario.service.js';
import { getRequisitante } from '../utils/auth.utils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { AppError } from '../errors/AppError.js';
import type { ListUsuariosQueryDto } from '../dto/usuario.dto.js';

export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  listar = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.usuarioService.listar(
      req.query as unknown as ListUsuariosQueryDto,
      getRequisitante(req),
    );
    res.json(data);
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do usuário inválido', 400);
    const usuario = await this.usuarioService.buscarPorId(id, getRequisitante(req));
    res.json(usuario);
  });

  obterStats = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do usuário inválido', 400);
    const stats = await this.usuarioService.obterStats(id, getRequisitante(req));
    res.json(stats);
  });

  criar = asyncHandler(async (req: Request, res: Response) => {
    const usuario = await this.usuarioService.criar(req.body, getRequisitante(req));
    res.status(201).json(usuario);
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do usuário inválido', 400);
    const atualizado = await this.usuarioService.atualizar(
      id,
      req.body,
      getRequisitante(req),
    );
    res.json(atualizado);
  });

  atualizarSenha = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do usuário inválido', 400);
    await this.usuarioService.atualizarSenha(id, req.body, getRequisitante(req));
    res.status(200).json({ message: 'Senha atualizada com sucesso' });
  });

  desativar = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do usuário inválido', 400);
    await this.usuarioService.desativar(id, getRequisitante(req));
    res.json({ message: 'Usuário inativado com sucesso' });
  });

  reativar = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('ID do usuário inválido', 400);
    await this.usuarioService.reativar(id, getRequisitante(req));
    res.json({ message: 'Usuário reativado com sucesso' });
  });
}
