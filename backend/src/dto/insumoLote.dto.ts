import { z } from "zod";

export const insumoVinculoSchema = z.object({
  nome_insumo: z.string().min(2, "O nome deve ter pelo menos 2 caracteres.").max(100, "O nome do insumo deve ter no máximo 100 caracteres."),
  codigo_insumo: z.preprocess((val) => val === "" ? undefined : val, z.string().min(1, "Código do insumo não pode ser vazio.").optional()),
  lote_insumo: z.preprocess((val) => val === "" ? undefined : val, z.string().min(1, "Informe o lote do fornecedor para rastreabilidade.").optional()),
  quantidade: z.coerce.number().positive("A quantidade deve ser maior que zero."),
  unidade: z.string().min(1, "Unidade de medida inválida. Use: kg, g, L, mL, m, cm, mm, unid, etc."),
});

export const vincularInsumosSchema = z.array(insumoVinculoSchema).min(1, "É necessário vincular pelo menos um insumo ao lote.");

export type InsumoVinculoDTO = z.infer<typeof insumoVinculoSchema>;
export type VincularInsumosDTO = z.infer<typeof vincularInsumosSchema>;