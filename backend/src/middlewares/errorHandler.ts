import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Dados inválidos",
      details: err.issues.map(i => ({ campo: i.path[0], mensagem: i.message }))
    })
  }

  console.error(err);

  return res.status(500).json({ message: "Erro interno do servidor" })
};