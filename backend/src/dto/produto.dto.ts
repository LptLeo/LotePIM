import { z } from "zod";

/** Schema de um item da receita (matéria-prima + quantidade por unidade de produto) */
const receitaItemSchema = z.object({
  materia_prima_id: z.number().int().positive("ID da matéria-prima inválido."),
  quantidade: z.number().positive("A quantidade deve ser maior que zero."),
  unidade: z.string().min(1, "A unidade é obrigatória."),
}).superRefine((val, ctx) => {
  if (val.unidade === 'UN' && !Number.isInteger(val.quantidade)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Matérias-primas com unidade 'UN' não aceitam quantidades fracionadas na receita.",
      path: ["quantidade"],
    });
  }
});

export const criarProdutoSchema = z.object({
  nome: z
    .string({ message: "O nome do produto é obrigatório." })
    .min(1, "O nome não pode ser vazio."),

  categoria: z
    .string({ message: "A categoria é obrigatória." })
    .min(1, "A categoria não pode ser vazia."),

  linha_padrao: z
    .string({ message: "A linha de produção padrão é obrigatória." })
    .min(1, "A linha não pode ser vazia."),

  percentual_ressalva: z
    .number({ message: "O percentual de ressalva é obrigatório." })
    .min(0, "O percentual não pode ser negativo.")
    .max(100, "O percentual não pode ultrapassar 100."),

  ativo: z.boolean().optional().default(true),

  receita: z
    .array(receitaItemSchema)
    .optional()
    .default([]),
});

export type CriarProdutoDTO = z.infer<typeof criarProdutoSchema>;

export const atualizarProdutoSchema = criarProdutoSchema.partial();
export type AtualizarProdutoDTO = z.infer<typeof atualizarProdutoSchema>;

export const atualizarReceitaSchema = z.array(receitaItemSchema);
export type AtualizarReceitaDTO = z.infer<typeof atualizarReceitaSchema>;
