import { z } from "zod";

export const insumoVinculoSchema = z.object({
  nome_insumo: z
    .string({ message: "O nome do insumo é obrigatório." })
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(100, "O nome do insumo é muito longo."),

  codigo_insumo: z
    .string({ message: "O código do insumo é obrigatório." })
    .min(1, "Código do insumo não pode ser vazio."),

  lote_insumo: z
    .string({ message: "O lote do fornecedor é obrigatório." })
    .min(1, "Informe o lote do fornecedor para rastreabilidade."),

  lote_origem: z
    .string({ message: "O lote de origem é obrigatório." })
    .min(1, "Informe o lote de origem (interno ou externo)."),

  quantidade: z.coerce
    .number({ message: "A quantidade é obrigatória." })
    .positive("A quantidade usada deve ser maior que zero."),

  unidade: z
    .string({ message: "A unidade de medida é obrigatória." })
    .min(1, "Ex: kg, unid, m, etc."),
});

export const vincularInsumosSchema = z
  .array(insumoVinculoSchema)
  .min(1, "É necessário vincular pelo menos um insumo ao lote.");

export const queryRastreabilidadeSchema = z.object({
  termo: z
    .string({ message: "O termo de busca é obrigatório." })
    .min(1, "Digite um código ou lote para pesquisar."),
});

export type InsumoVinculoDTO = z.infer<typeof insumoVinculoSchema>;
export type VincularInsumosDTO = z.infer<typeof vincularInsumosSchema>;
export type QueryRastreabilidadeDTO = z.infer<typeof queryRastreabilidadeSchema>;