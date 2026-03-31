import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import jwt, { type JwtPayload } from "jsonwebtoken";

const getAccessSecret = () => {
  const value = process.env.JWT_SECRET;

  if (!value) {
    throw new AppError("JWT_SECRET não definido", 500);
  }

  return value;
};

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
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
    (req as { auth?: JwtPayload }).auth = payload;

    return next();
  } catch (error) {
    return next(new AppError("Token inválido ou expirado", 401));
  }
}