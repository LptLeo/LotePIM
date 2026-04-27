import type { NextFunction, Request, Response } from 'express';
import type { ZodObject } from 'zod';

/**
 * Middleware para validar e transformar parâmetros de query (URL).
 * Resolve o problema de "read-only" do req.query em algumas versões do Node/Express.
 */
export const validateQuery = (schema: ZodObject<any, any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      
      // Sobrescreve as propriedades validadas uma a uma.
      // Se req.query for um getter protegido, tentamos redefinir a propriedade no objeto req.
      try {
        Object.keys(validated).forEach(key => {
          (req.query as any)[key] = validated[key];
        });
      } catch (e) {
        // Fallback: Se falhar a escrita direta, redefinimos o descritor da propriedade query
        const descriptor = Object.getOwnPropertyDescriptor(req, 'query');
        if (!descriptor || descriptor.configurable) {
          Object.defineProperty(req, 'query', {
            value: validated,
            writable: true,
            configurable: true,
            enumerable: true
          });
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
