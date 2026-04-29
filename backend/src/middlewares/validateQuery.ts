import type { NextFunction, Request, Response } from 'express';
import type { ZodObject } from 'zod';

/**
 * Middleware para validar e transformar parâmetros de query (URL).
 */
export const validateQuery = (schema: ZodObject<any, any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      
      // Substitui o objeto de query pelo objeto validado e transformado pelo Zod
      Object.defineProperty(req, 'query', {
        value: validated,
        writable: true,
        configurable: true,
        enumerable: true
      });
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
