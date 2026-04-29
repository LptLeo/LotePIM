export interface ProdutoResumo {
  nome: string;
}

export interface UsuarioResumo {
  nome: string;
}

export interface LoteResumo {
  id: number;
  numero_lote: string;
  quantidade_planejada: number;
  status: string;
  aberto_em: string | Date;
  produto: ProdutoResumo;
  operador: UsuarioResumo;
}

export interface DashboardData {
  lotes_mes: number;
  lotes_tendencia: number;
  unidades_mes: number;
  unidades_tendencia: number;
  taxa_aprovacao_mes: number;
  aguardando_inspecao: number;
  ultimos_lotes: LoteResumo[];
  top_produtos?: { nome: string; quantidade: number }[];
  top_funcionarios?: { nome: string; quantidade_lotes: number }[];
}
