import { z } from 'zod';
import { paginacaoQuerySchema } from './paginacao.dto.js';
import { LoteStatus } from '../entities/Lote.js';
import { dateOrNull, turnoSchema } from '../utils/zod.utils.js';

// === QUERIES ===

export const listLotesQuerySchema = paginacaoQuerySchema.extend({
  status: z.string().optional(),
});

export type ListLotesQueryDto = z.infer<typeof listLotesQuerySchema>;

export const sugestaoQuerySchema = z.object({
  q: z.string().min(1),
});

// === SCHEMAS DE CRIAÇÃO ===

const consumoItemSchema = z.object({
  insumo_estoque_id: z.coerce
    .number()
    .int()
    .positive({ error: 'ID do lote de insumo inválido.' }),
  quantidade_consumida: z.coerce
    .number()
    .positive({ error: 'A quantidade deve ser maior que zero.' }),
});

export const criarLoteSchema = z.object({
  produto_id: z.coerce
    .number({ error: 'O produto é obrigatório.' })
    .int()
    .positive({ error: 'ID do produto inválido.' }),

  data_producao: dateOrNull().refine((d) => d !== null, {
    error: 'Data de produçao obrigatória.',
  }),

  turno: turnoSchema,

  quantidade_planejada: z.coerce
    .number({ error: 'A quantidade planejada é obrigatória.' })
    .int()
    .positive({ error: 'A quantidade deve ser maior que zero.' }),

  data_validade: dateOrNull().optional().default(null),

  observacoes: z.string().max(1000).optional().default(''),

  consumos: z
    .array(consumoItemSchema)
    .min(1, { error: 'É obrigatório vincular pelo menos 1 lote de insumo.' }),
});

export type CriarLoteDTO = z.infer<typeof criarLoteSchema>;

// === SCHEMA DE TRANSIÇÃO DE STATUS ===

export const transicaoStatusSchema = z.object({
  status: z.enum([
    LoteStatus.EM_PRODUCAO,
    LoteStatus.AGUARDANDO_INSPECAO,
    LoteStatus.APROVADO,
    LoteStatus.APROVADO_RESTRICAO,
    LoteStatus.REPROVADO,
  ]),
});

export type TransicaoStatusDTO = z.infer<typeof transicaoStatusSchema>;
