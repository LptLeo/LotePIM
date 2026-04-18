import { z } from "zod";

const turnoSchema = z.enum(["manha", "tarde", "noite"], {
  message: "Turno inválido. Valores aceitos: manha, tarde, noite.",
});

/** Cada item de consumo vincula um lote de InsumoEstoque à ordem de produção */
const consumoItemSchema = z.object({
  insumo_estoque_id: z.number().int().positive("ID do lote de insumo inválido."),
  quantidade_consumida: z.number().positive("A quantidade deve ser maior que zero."),
});

export const criarLoteSchema = z.object({
  produto_id: z.coerce
    .number({ message: "O produto é obrigatório." })
    .int()
    .positive("ID do produto inválido."),

  data_producao: z.coerce.date({
    message: "A data de produção é obrigatória e deve ser válida.",
  }),

  turno: turnoSchema,

  quantidade_planejada: z
    .number({ message: "A quantidade planejada é obrigatória." })
    .int()
    .positive("A quantidade deve ser maior que zero."),

  data_validade: z.coerce.date().nullable().optional().default(null),

  observacoes: z.string().max(1000).optional().default(""),

  /** Lista de lotes de insumo a consumir na abertura do lote */
  consumos: z
    .array(consumoItemSchema)
    .min(1, "É obrigatório vincular pelo menos 1 lote de insumo."),
});

export type CriarLoteDTO = z.infer<typeof criarLoteSchema>;

export const transicaoStatusSchema = z.object({
  status: z.enum([
    "em_producao",
    "aguardando_inspecao",
    "aprovado",
    "aprovado_restricao",
    "reprovado",
  ]),
});

export type TransicaoStatusDTO = z.infer<typeof transicaoStatusSchema>;
