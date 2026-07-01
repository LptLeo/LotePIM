import { z } from 'zod';
import { paginacaoQuerySchema } from './paginacao.dto.js';

export const queryRastreabilidadeSchema = paginacaoQuerySchema.extend({
  termo: z.string().min(1, {
    error: 'Digite um número de lote, código ou lote de insumo para pesquisar.',
  }),
});

export type QueryRastreabilidadeDTO = z.infer<typeof queryRastreabilidadeSchema>;

export const autocompleteQuerySchema = z.object({
  q: z.string().min(2),
});
