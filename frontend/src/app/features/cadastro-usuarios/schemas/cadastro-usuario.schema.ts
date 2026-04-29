import { z } from 'zod';

export const perfilUsuarioSchema = z.enum(['operador', 'inspetor', 'gestor']);

export const cadastroUsuarioPayloadSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.email('E-mail inválido'),
  perfil: perfilUsuarioSchema,
  senha: z.string().min(1, 'Senha é obrigatória'),
  ativo: z.boolean(),
});

export type CadastroUsuarioPayload = z.infer<typeof cadastroUsuarioPayloadSchema>;
