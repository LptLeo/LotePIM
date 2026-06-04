import { z } from 'zod';

export const stringToBoolean = () => z.string().transform((v) => v === 'true');
export const stringToNumberArray = () =>
  z
    .string()
    .optional()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0),
    );

export const dateOrNull = (defaultValue: Date | null = null) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return defaultValue;
    if (typeof val === 'string' || typeof val === 'number' || val instanceof Date) {
      const date = new Date(val);
      return isNaN(date.getTime()) ? defaultValue : date;
    }
    return val;
  }, z.date().nullable());

export const turnoSchema = z.enum(['manha', 'tarde', 'noite'], {
  error: 'Turno inválido. Valores aceitos: manha, tarde, noite.',
});
