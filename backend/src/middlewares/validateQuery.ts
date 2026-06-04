import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export const validateQuery =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(result.error);
    }

    req.query = result.data as unknown as typeof req.query;
    next();
  };
