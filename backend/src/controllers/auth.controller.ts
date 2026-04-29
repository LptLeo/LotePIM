import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import jwt from "jsonwebtoken";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
};

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response): Promise<void> => {
    const { usuario, tokenAcesso, tokenAtualizacao } = await this.authService.login(req.body);

    res.cookie("tokenAtualizacao", tokenAtualizacao, COOKIE_OPTIONS);
    res.status(200).json({ usuario, tokenAcesso });
  }

  refresh = async (req: Request, res: Response): Promise<void> => {
    const tokenAtualizacao = req.cookies.tokenAtualizacao;
    const tokens = await this.authService.refresh(tokenAtualizacao);

    res.cookie("tokenAtualizacao", tokens.tokenAtualizacao, COOKIE_OPTIONS);
    res.status(200).json({ tokenAcesso: tokens.tokenAcesso });
  }

  logout = async (req: Request, res: Response): Promise<void> => {
    const tokenAtualizacao = req.cookies.tokenAtualizacao;

    if (tokenAtualizacao) {
      try {
        // Decodifica sem verificar assinatura: o token pode estar expirado,
        // mas ainda precisamos do ID para invalidar a sessão no banco.
        const decoded = jwt.decode(tokenAtualizacao) as { id: number } | null;
        if (decoded?.id) {
          await this.authService.logout(decoded.id);
        }
      } catch { /* ignora erros de decodificação; limpa o cookie de qualquer forma */ }
    }

    res.clearCookie("tokenAtualizacao", { ...COOKIE_OPTIONS, maxAge: 0 });
    res.status(200).json({ message: "Logout realizado com sucesso." });
  }
}