import { z } from 'zod';
import { paginacaoQuerySchema } from './paginacao.dto.js';

const statusProduto = z.enum([
  'ativos',
  'inativos',
  'com_insumos',
  'sem_insumos',
  'todos',
]);

const ordenacaoProduto = z.enum([
  'mais_recentes',
  'menos_recentes',
  'mais_produzidos',
  'menos_produzidos',
  'mais_lotes',
  'menos_lotes',
  'mais_insumos',
  'menos_insumos',
]);

export const listProdutosQuerySchema = paginacaoQuerySchema.extend({
  categoria: z.string().optional(),
  status: statusProduto.optional(),
  ordenacao: ordenacaoProduto.optional(),
  linha: z.string().optional(),
});

export type ListProdutosQueryDto = z.infer<typeof listProdutosQuerySchema>;

const receitaItemSchema = z
  .object({
    materia_prima_id: z
      .number()
      .int()
      .positive({ error: 'ID da matéria-prima inválido.' }),
    quantidade: z.number().positive({ error: 'A quantidade deve ser maior que zero.' }),
    unidade: z.string().min(1, { error: 'A unidade é obrigatória.' }),
  })
  .refine((val) => !(val.unidade === 'UN' && !Number.isInteger(val.quantidade)), {
    error:
      "Matérias-primas com unidade 'UN' não aceitam quantidades fracionadas na receita.",
    path: ['quantidade'],
  });

export const criarProdutoSchema = z.object({
  nome: z
    .string({ error: 'O nome do produto é obrigatório.' })
    .min(1, { error: 'O nome não pode ser vazio.' }),

  categoria: z
    .string({ error: 'A categoria é obrigatória.' })
    .min(1, { error: 'A categoria não pode ser vazia.' }),

  linha_padrao: z
    .string({ error: 'A linha de produção padrão é obrigatória.' })
    .min(1, { error: 'A linha não pode ser vazia.' }),

  percentual_ressalva: z
    .number({ error: 'O percentual de ressalva é obrigatório.' })
    .min(0, { error: 'O percentual não pode ser negativo.' })
    .max(100, { error: 'O percentual não pode ultrapassar 100.' }),

  ativo: z.boolean().optional().default(true),

  receita: z.array(receitaItemSchema).optional().default([]),
});

export type CriarProdutoDTO = z.infer<typeof criarProdutoSchema>;

export const atualizarProdutoSchema = criarProdutoSchema.partial();
export type AtualizarProdutoDTO = z.infer<typeof atualizarProdutoSchema>;

export const atualizarReceitaSchema = z.array(receitaItemSchema);
export type AtualizarReceitaDTO = z.infer<typeof atualizarReceitaSchema>;

export const alternarStatusProdutoSchema = z.object({
  ativo: z.boolean(),
});
export type AlternarStatusProdutoDTO = z.infer<typeof alternarStatusProdutoSchema>;
