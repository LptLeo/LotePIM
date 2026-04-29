import { z } from 'zod';

// Aceita string (do query params) ou number (se já transformado)
const coageNumber = z.union([z.string(), z.number()]).optional().transform(v => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
});

export const PaginacaoQueryDto = z.object({
  pagina: coageNumber.transform(v => (v !== undefined ? Math.max(1, v) : 1)),
  limite: coageNumber.transform(v => (v !== undefined ? Math.min(1000, Math.max(1, v)) : 10)),
  busca: z.string().optional(),
});

export type PaginacaoQueryDto = z.infer<typeof PaginacaoQueryDto>;

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
  query: PaginacaoQueryDto
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
