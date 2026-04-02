import { z } from 'zod';
import { PerfilUsuario } from '../entities/Usuario.js';

export const CreateUsuarioDto = z.object({
  email: z.email('E-mail inválido'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  perfil: z.enum(PerfilUsuario, 'Perfil inválido'),
  ativo: z.boolean().default(true),
});

export const UpdateUsuarioDto = z.object({
  nome: z.string().min(1).optional(),
  email: z.email().optional(),
  perfil: z.enum(PerfilUsuario).optional(),
  ativo: z.boolean().optional(),
});

export const UpdateSenhaDto = z.object({
  senha_atual: z.string().min(8, 'Senha atual é obrigatória'),
  nova_senha: z.string().min(8, 'Nova senha deve ter no mínimo 8 caracteres'),
});

export type CreateUsuarioDto = z.infer<typeof CreateUsuarioDto>;
export type UpdateUsuarioDto = z.infer<typeof UpdateUsuarioDto>;
export type UpdateSenhaDto = z.infer<typeof UpdateSenhaDto>;