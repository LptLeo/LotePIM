import { z } from 'zod';

export const paginacaoQuerySchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(1000).default(10),
  busca: z.string().optional(),
});

export type PaginacaoQueryDto = z.infer<typeof paginacaoQuerySchema>;

export interface RespostaPaginada<T> {
  itens: T[];
  meta: {
    totalItens: number;
    itensPorPagina: number;
    totalPaginas: number;
    paginaAtual: number;
  };
}

export function formatarRespostaPaginada<T>(
  data: [T[], number],
  query: PaginacaoQueryDto,
): RespostaPaginada<T> {
  const [itens, totalItens] = data;
  const totalPaginas = Math.ceil(totalItens / query.limite);

  return {
    itens,
    meta: {
      totalItens,
      itensPorPagina: query.limite,
      totalPaginas,
      paginaAtual: query.pagina,
    },
  };
}
