import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';
import { appDataSource } from '../config/appDataSource.js';
import { Usuario } from '../entities/Usuario.js';
import { env } from '../config/env.js';
import { findOneByOrFail } from '../utils/orm.utils.js';
import type { TokenPayload } from '../types/auth.js';

const userRepo = appDataSource.getRepository(Usuario);

export const authGuard = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token ausente ou inválido', 401));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Token ausente', 401));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    const user = await findOneByOrFail(userRepo, { id: payload.id }, 'Usuário', 403);

    if (!user.ativo) {
      return next(
        new AppError(
          'Sua conta foi desativada. Entre em contato com o administrador.',
          403,
        ),
      );
    }

    req.auth = payload;

    return next();
  } catch {
    return next(new AppError('Token inválido ou expirado', 401));
  }
};
