import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export const validateBody = (schema: ZodType<any, any, any>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    req.body = result.data;

    next();
  };
};