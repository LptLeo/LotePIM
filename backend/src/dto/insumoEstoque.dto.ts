import { z } from "zod";
import { PaginacaoQueryDto } from "./paginacao.dto.js";

export const ListInsumosQueryDto = PaginacaoQueryDto.extend({
  materia_prima_id: z.string().optional(),
});

export type ListInsumosQueryDto = z.infer<typeof ListInsumosQueryDto>;

const turnoSchema = z.enum(["manha", "tarde", "noite"], {
  message: "Turno inválido. Valores aceitos: manha, tarde, noite.",
});

export const criarInsumoEstoqueSchema = z.object({
  materia_prima_id: z.coerce
    .number({ message: "A matéria-prima é obrigatória." })
    .int()
    .positive("ID da matéria-prima inválido."),

  numero_lote_fornecedor: z.string().optional().default(""),

  quantidade_inicial: z
    .number({ message: "A quantidade é obrigatória." })
    .positive("A quantidade deve ser maior que zero."),

  fornecedor: z
    .string({ message: "O fornecedor é obrigatório." })
    .min(1, "O fornecedor não pode ser vazio."),

  codigo_interno: z.string().optional().default(""),

  turno: turnoSchema,

  data_validade: z.coerce.date().nullable().optional().default(null),

  observacoes: z.string().max(1000).optional().default(""),
});

export type CriarInsumoEstoqueDTO = z.infer<typeof criarInsumoEstoqueSchema>;
