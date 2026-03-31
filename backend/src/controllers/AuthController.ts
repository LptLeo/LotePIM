import type { Request, Response } from "express";
import { AuthService } from "../services/AuthService.js";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response): Promise<void> {
    const resultado = await this.authService.login(req.body);

    res.status(200).json(resultado);
  }

  async register(req: Request, res: Response): Promise<void> {
    const resultado = await this.authService.register(req.body);

    res.status(201).json(resultado);
  }
}