import type { Request, Response } from 'express';
import { UsuarioService } from '../services/usuario.service.js';
import type { PerfilUsuario } from '../entities/Usuario.js';

export class UsuarioController {
  private usuarioService: UsuarioService;

  constructor() {
    this.usuarioService = new UsuarioService();
  }

  private getRequisitante(req: Request) {
    const auth = (req as any).auth;
    return {
      id: Number(auth.id),
      perfil: auth.perfil as PerfilUsuario,
    };
  }

  findAll = async (req: Request, res: Response): Promise<void> => {
    const data = await this.usuarioService.findAll(this.getRequisitante(req));

    res.status(200).json(data);
  }

  findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const usuario = await this.usuarioService.findById(Number(id), this.getRequisitante(req));

    res.status(200).json(usuario);
  }

  getStats = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const stats = await this.usuarioService.getStats(Number(id), this.getRequisitante(req));

    res.status(200).json(stats);
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const usuario = await this.usuarioService.create(req.body, this.getRequisitante(req));

    res.status(201).json(usuario);
  }

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const atualizado = await this.usuarioService.update(Number(id), req.body, this.getRequisitante(req));

    res.status(200).json(atualizado);
  }

  updateSenha = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.usuarioService.updateSenha(Number(id), req.body, this.getRequisitante(req));

    res.status(204).json({ message: 'Senha atualizada com sucesso' });
  }

  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await this.usuarioService.delete(Number(id), this.getRequisitante(req));

    res.status(200).json({ message: 'Usuário inativado com sucesso' });
  }
}
