import { z } from "zod";

export const criarMateriaPrimaSchema = z.object({
  nome: z
    .string({ message: "O nome da matéria-prima é obrigatório." })
    .min(2, "O nome deve ter pelo menos 2 caracteres."),
  unidade_medida: z.enum(["KG", "L", "M", "UN"], {
    message: "Unidade inválida. Valores aceitos: KG, L, M, UN.",
  }),
  categoria: z
    .string({ message: "A categoria é obrigatória." })
    .min(1, "A categoria não pode ser vazia."),
});

export type CriarMateriaPrimaDTO = z.infer<typeof criarMateriaPrimaSchema>;
