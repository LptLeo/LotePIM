import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { COOKIE_OPTIONS } from '../config/cookies.config.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tokenAcesso, tokenAtualizacao } = await this.authService.login(req.body);
    res.cookie('tokenAtualizacao', tokenAtualizacao, COOKIE_OPTIONS);
    res.status(200).json({ tokenAcesso });
  });

  refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tokenAtualizacao = req.cookies.tokenAtualizacao;
    const tokens = await this.authService.refresh(tokenAtualizacao);
    res.cookie('tokenAtualizacao', tokens.tokenAtualizacao, COOKIE_OPTIONS);
    res.status(200).json({ tokenAcesso: tokens.tokenAcesso });
  });

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tokenAtualizacao = req.cookies.tokenAtualizacao;
    if (tokenAtualizacao) {
      await this.authService.logout(tokenAtualizacao);
    }
    res.clearCookie('tokenAtualizacao', { ...COOKIE_OPTIONS });
    res.status(200).json({ message: 'Logout realizado com sucesso.' });
  });
}
