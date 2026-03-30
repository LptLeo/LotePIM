import { z } from "zod";

export const criarProdutoSchema = z.object({
  codigo: z
    .string({ message: "O código do produto é obrigatório." })
    .min(1, "O código não pode ser vazio."),

  nome: z
    .string({ message: "O nome do produto é obrigatório." })
    .min(1, "O nome não pode ser vazio."),

  descricao: z
    .string()
    .optional(),

  linha: z
    .string({ message: "A linha de produção é obrigatória." })
    .min(1, "A linha não pode ser vazia."),

  ativo: z
    .boolean()
    .optional()
    .default(true),
});

export type CriarProdutoDTO = z.infer<typeof criarProdutoSchema>;

export const atualizarProdutoSchema = criarProdutoSchema.partial();

export type AtualizarProdutoDTO = z.infer<typeof atualizarProdutoSchema>;
