import { z } from 'zod';
import { env } from '../config/env.js';

export const loginSchema = z.object({
  email: z.email({ error: 'E-mail inválido.' }),
  senha: z.string().min(env.SENHA_MIN_LENGTH, {
    error: `A senha deve ter no mínimo ${env.SENHA_MIN_LENGTH} caracteres.`,
  }),
});

export type LoginDTO = z.infer<typeof loginSchema>;
