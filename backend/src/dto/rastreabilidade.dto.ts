import { z } from "zod";

export const queryRastreabilidadeSchema = z.object({
  termo: z
    .string("O termo de busca é obrigatório.")
    .min(1, "Digite um número de lote, código ou lote de insumo para pesquisar."),
});

export type QueryRastreabilidadeDTO = z.infer<typeof queryRastreabilidadeSchema>;