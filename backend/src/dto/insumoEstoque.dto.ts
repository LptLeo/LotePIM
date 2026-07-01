import { z } from 'zod';
import { paginacaoQuerySchema } from './paginacao.dto.js';
import {
  stringToBoolean,
  stringToNumberArray,
  dateOrNull,
  turnoSchema,
} from '../utils/zod.utils.js';

export const listInsumosQuerySchema = paginacaoQuerySchema.extend({
  materiaPrimaId: z.coerce.number().int().positive().optional(),
  esgotado: stringToBoolean().optional(),
  fornecedor: z.string().optional(),
  status: z
    .string()
    .optional()
    .default('')
    .transform((v) => (v ? v.split(',') : [])),
  ordenarPor: z
    .enum(['menor_estoque', 'maior_estoque', 'mais_recente', 'menos_recente'])
    .optional(),
});

export type ListInsumosQueryDto = z.infer<typeof listInsumosQuerySchema>;

export const listarDisponiveisQuerySchema = z.object({
  ids: stringToNumberArray(),
});

export type ListarDisponiveisQueryDto = z.infer<typeof listarDisponiveisQuerySchema>;

export const criarInsumoEstoqueSchema = z.object({
  materiaPrimaId: z.coerce
    .number({ error: 'A matéria-prima é obrigatória.' })
    .int()
    .positive({ error: 'ID da matéria-prima inválido.' }),

  numero_lote_fornecedor: z.string().optional().default(''),

  quantidade_inicial: z
    .number({ error: 'A quantidade é obrigatória.' })
    .positive({ error: 'A quantidade deve ser maior que zero.' }),

  fornecedor: z
    .string({ error: 'O fornecedor é obrigatório.' })
    .min(1, { error: 'O fornecedor não pode ser vazio.' }),

  codigo_interno: z.string().optional().default(''),

  turno: turnoSchema,

  data_validade: dateOrNull().optional().default(null),

  status: z
    .enum(['a_caminho', 'pendente', 'disponivel'])
    .optional()
    .default('disponivel'),

  observacoes: z.string().max(1000).optional().default(''),
});

export const criarInsumoEstoqueBulkSchema = z.object({
  itens: z
    .array(criarInsumoEstoqueSchema)
    .min(1, { error: 'A lista de itens não pode estar vazia.' }),
});

export type CriarInsumoEstoqueDTO = z.infer<typeof criarInsumoEstoqueSchema>;
export type CriarInsumoEstoqueBulkDTO = z.infer<typeof criarInsumoEstoqueBulkSchema>;
