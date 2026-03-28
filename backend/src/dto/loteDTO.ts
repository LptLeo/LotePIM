import { z } from "zod";
import { Turno, LoteStatus } from "../entities/Lote.js";

const turnoSchema = z.enum(["manha", "tarde", "noite"], {
  error: "Turno inválido. Valores aceitos: manha, tarde, noite.",
});

const loteStatusSchema = z.enum(
  ["em_producao", "aguardando_inspecao", "aprovado", "aprovado_restricao", "reprovado"],
  { error: "Status inválido." }
);

const resultadoInspecaoSchema = z.enum(
  ["aprovado", "aprovado_restricao", "reprovado"],
  { error: "Resultado inválido. Valores aceitos: aprovado, aprovado_restricao, reprovado." }
);

export const criarLoteSchema = z.object({
  produto: z
    .string({ error: "O produto é obrigatório." })
    .min(1, "O produto não pode ser vazio."),

  data_producao: z
    .coerce.date({ error: "A data de produção é obrigatória e deve ser uma data válida." }),

  turno: turnoSchema,

  operador: z
    .string({ error: "O operador é obrigatório." })
    .min(1, "O operador não pode ser vazio."),

  quantidade_produzida: z
    .number({ error: "A quantidade produzida é obrigatória e deve ser um número." })
    .int("A quantidade produzida deve ser um número inteiro.")
    .positive("A quantidade produzida deve ser maior que zero."),

  observacoes: z
    .string()
    .max(1000, "Observações não podem ultrapassar 1000 caracteres.")
    .optional(),
});

export type LoteDTO = z.infer<typeof criarLoteSchema>;

export const insumoVinculoSchema = z.object({
  nome_insumo: z
    .string({ error: "O nome do insumo é obrigatório." })
    .min(1, "O nome do insumo não pode ser vazio."),

  codigo_insumo: z
    .string()
    .optional(),

  lote_fornecedor: z
    .string()
    .optional(),

  lote_origem: z
    .string()
    .optional(),

  quantidade_usada: z
    .number({ error: "A quantidade é obrigatória e deve ser um número." })
    .positive("A quantidade deve ser maior que zero."),

  unidade_medida: z
    .string({ error: "A unidade de medida é obrigatória." })
    .min(1, "A unidade de medida não pode ser vazia."),
});

export const vincularInsumosSchema = z
  .array(insumoVinculoSchema, { error: "A lista de insumos é obrigatória." })
  .min(1, "É necessário vincular pelo menos um insumo.");

export type InsumoVinculoDTO = z.infer<typeof insumoVinculoSchema>;

export const registrarInspecaoSchema = z
  .object({
    lote_id: z
      .number({ error: "O ID do lote é obrigatório." })
      .int("O ID do lote deve ser um número inteiro.")
      .positive("O ID do lote deve ser positivo."),

    inspetor: z
      .string({ error: "O ID do inspetor é obrigatório." })
      .min(1, "O ID do inspetor não pode ser vazio."),

    resultado: resultadoInspecaoSchema,

    quantidade_reprovada: z
      .number()
      .int("A quantidade reprovada deve ser um número inteiro.")
      .min(0, "A quantidade reprovada não pode ser negativa.")
      .default(0),

    descricao_desvio: z
      .string()
      .max(2000, "A descrição do desvio não pode ultrapassar 2000 caracteres.")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.resultado !== "aprovado") {
        return !!data.descricao_desvio && data.descricao_desvio.trim().length > 0;
      }
      return true;
    },
    {
      message: "A descrição do desvio é obrigatória quando o resultado não é 'aprovado'.",
      path: ["descricao_desvio"],
    }
  );

export type RegistrarInspecaoDTO = z.infer<typeof registrarInspecaoSchema>;

export const encerrarLoteSchema = z.object({
  id: z
    .number({ error: "O ID do lote é obrigatório." })
    .int("O ID do lote deve ser um número inteiro.")
    .positive("O ID do lote deve ser positivo."),
});

export type EncerrarLoteDTO = z.infer<typeof encerrarLoteSchema>;

export const filtrosLoteSchema = z
  .object({
    produto: z.string().optional(),

    status: loteStatusSchema.optional(),

    dataInicio: z
      .coerce.date({ error: "Data de início inválida." })
      .optional(),

    dataFim: z
      .coerce.date({ error: "Data de fim inválida." })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.dataInicio && data.dataFim) {
        return data.dataInicio <= data.dataFim;
      }
      return true;
    },
    {
      message: "A data de início não pode ser posterior à data de fim.",
      path: ["dataInicio"],
    }
  );

export type FiltrosLoteDTO = z.infer<typeof filtrosLoteSchema>;

export const consultaRastreabilidadeSchema = z.object({
  numero_lote: z
    .string({ error: "O número do lote é obrigatório." })
    .min(1, "O número do lote não pode ser vazio."),
});

export type ConsultaRastreabilidadeDTO = z.infer<typeof consultaRastreabilidadeSchema>;

export const rastreabilidadeReversaSchema = z.object({
  loteOrigem: z
    .string({ error: "O lote de origem do insumo é obrigatório." })
    .min(1, "O lote de origem não pode ser vazio."),
});

export type RastreabilidadeReversaDTO = z.infer<typeof rastreabilidadeReversaSchema>;

const transicoesPermitidas: Record<string, string[]> = {
  em_producao: ["aguardando_inspecao"],
  aguardando_inspecao: ["aprovado", "aprovado_restricao", "reprovado"],
  aprovado: [],
  aprovado_restricao: [],
  reprovado: [],
};

export function validarTransicaoStatus(statusAtual: string, novoStatus: string): boolean {
  const permitidas = transicoesPermitidas[statusAtual];
  if (!permitidas) return false;
  return permitidas.includes(novoStatus);
}

export const transicaoStatusSchema = z
  .object({
    statusAtual: loteStatusSchema,
    novoStatus: loteStatusSchema,
  })
  .refine(
    (data) => validarTransicaoStatus(data.statusAtual, data.novoStatus),
    {
      message: "Transição de status não permitida.",
      path: ["novoStatus"],
    }
  );

export type TransicaoStatusDTO = z.infer<typeof transicaoStatusSchema>;

export { Turno, LoteStatus };
