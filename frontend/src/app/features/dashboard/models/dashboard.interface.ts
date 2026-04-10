export interface ProdutoResumo {
  nome: string;
}

export interface UsuarioResumo {
  nome: string;
}

export interface LoteResumo {
  id: number;
  numero_lote: string;
  quantidade_prod: number;
  status: string;
  aberto_em: string | Date;
  produto: ProdutoResumo;
  operador: UsuarioResumo;
}

export interface DashboardData {
  lotes_hoje: number;
  unidades_hoje: number;
  taxa_aprovacao_mes: number;
  aguardando_inspecao: number;
  ultimos_lotes: LoteResumo[];
}
