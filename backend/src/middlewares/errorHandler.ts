import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Dados inválidos',
      details: err.issues.map((i) => ({ campo: i.path[0], mensagem: i.message })),
    });
  }

  logger.error(String(err));

  const details = err instanceof Error ? err.message : String(err);
  return res.status(500).json({ message: 'Erro interno do servidor', details });
};
