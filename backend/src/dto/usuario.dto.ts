import { z } from 'zod';
import { PerfilUsuario } from '../entities/Usuario.js';
import { paginacaoQuerySchema } from './paginacao.dto.js';
import { env } from '../config/env.js';

const perfilUsuario = z.enum([
  PerfilUsuario.GESTOR,
  PerfilUsuario.INSPETOR,
  PerfilUsuario.OPERADOR,
]);

const senhaSchema = z
  .string()
  .min(env.SENHA_MIN_LENGTH, {
    error: `Senha deve ter no mínimo ${env.SENHA_MIN_LENGTH} caracteres`,
  })
  .max(env.SENHA_MAX_LENGTH, {
    error: `Senha deve ter no máximo ${env.SENHA_MAX_LENGTH} caracteres`,
  });

export const criarUsuarioSchema = z.object({
  email: z.email({ error: 'E-mail inválido' }),
  nome: z.string().min(1, { error: 'Nome é obrigatório' }),
  senha: senhaSchema,
  perfil: perfilUsuario,
  ativo: z.boolean().default(true),
});

export type CriarUsuarioDTO = z.infer<typeof criarUsuarioSchema>;

export const atualizarUsuarioSchema = z.object({
  nome: z.string().min(1).optional(),
  email: z.email().optional(),
  perfil: perfilUsuario.optional(),
  ativo: z.boolean().optional(),
});

export type AtualizarUsuarioDTO = z.infer<typeof atualizarUsuarioSchema>;

export const atualizarSenhaSchema = z.object({
  senha_atual: z.string().min(1, { error: 'Senha atual é obrigatória' }),
  nova_senha: senhaSchema,
});

export type AtualizarSenhaDTO = z.infer<typeof atualizarSenhaSchema>;

export const listUsuariosQuerySchema = paginacaoQuerySchema.extend({
  perfil: z
    .enum(['todos', ...Object.values(PerfilUsuario)] as [string, ...string[]])
    .optional(),
  ativo: z.enum(['todos', 'ativos', 'inativos']).optional(),
});

export type ListUsuariosQueryDto = z.infer<typeof listUsuariosQuerySchema>;
