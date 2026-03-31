import { z } from "zod";

export const LoginDTO = z.object({
  email: z.email("E-mail inválido."),
  senha: z.string().min(1, "Senha é obrigatória."),
});

export type LoginDTO = z.infer<typeof LoginDTO>;