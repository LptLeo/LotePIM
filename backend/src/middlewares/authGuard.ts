import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppDataSource } from "../config/AppDataSource.js";
import { Usuario } from "../entities/Usuario.js";

const getAccessSecret = () => {
  const value = process.env.JWT_SECRET;

  if (!value) {
    throw new AppError("JWT_SECRET não definido", 500);
  }

  return value;
};

export const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Token ausente", 401));
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError("Token ausente", 401))
  }

  try {
    const payload = jwt.verify(token, getAccessSecret()) as JwtPayload;
    
    // Verificação de segurança: checar se o usuário ainda está ativo no banco
    const userRepo = AppDataSource.getRepository(Usuario);
    const user = await userRepo.findOne({ where: { id: Number(payload.id) }, select: ["ativo"] });

    if (!user || !user.ativo) {
      return next(new AppError("Sua conta foi desativada. Entre em contato com o administrador.", 403));
    }

    (req as { auth?: JwtPayload }).auth = payload;

    return next();
  } catch (error) {
    return next(new AppError("Token inválido ou expirado", 401));
  }
}