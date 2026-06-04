//
// Modelo compartilhado de paginação
// Reflete exatamente o contrato da API (formatarRespostaPaginada)
//

export interface RespostaPaginada<T> {
  itens: T[];
  meta: {
    totalItens: number;
    itensPorPagina: number;
    totalPaginas: number;
    paginaAtual: number;
  };
}
