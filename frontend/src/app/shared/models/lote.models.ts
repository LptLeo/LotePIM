// ──────────────────────────────────────────────
// Modelos compartilhados para lotes e pesquisa
// ──────────────────────────────────────────────

export type LoteStatus =
  | 'em_producao'
  | 'aguardando_inspecao'
  | 'aprovado'
  | 'aprovado_restricao'
  | 'reprovado';

export interface SugestaoItem {
  tipo: 'lote' | 'produto';
  id: number | null;
  label: string;
  sublabel: string;
  status?: LoteStatus;
}

export interface Produto {
  id: number;
  nome: string;
}

export interface Operador {
  id: number;
  nome: string;
}

export interface InsumoLote {
  id: number;
  nome_insumo: string;
  codigo_insumo?: string;
  lote_insumo?: string;
  quantidade: number;
}

export interface InspecaoLote {
  id: number;
  resultado: LoteStatus;
  descricao_desvio?: string;
  inspecionado_em?: string;
  inspetor: Operador;
}

export interface LoteDetalhe {
  id: number;
  numero_lote: string;
  produto: Produto;
  data_producao: string;
  turno: string;
  operador: Operador;
  quantidade_prod: number;
  quantidade_repr: number;
  status: LoteStatus;
  observacoes?: string;
  aberto_em: string;
  encerrado_em?: string;
  insumos?: InsumoLote[];
  inspecao?: InspecaoLote;
}

// ──────────────────────────────────────────────
// Helpers de status
// ──────────────────────────────────────────────

export interface StatusConfig {
  label: string;
  cor: string;
  corBg: string;
  corBorda: string;
}

export const STATUS_CONFIG: Record<LoteStatus, StatusConfig> = {
  em_producao: {
    label: 'Em Produção',
    cor: '#00E5FF',
    corBg: 'rgba(0,229,255,0.1)',
    corBorda: '#00E5FF',
  },
  aguardando_inspecao: {
    label: 'Aguardando Inspeção',
    cor: '#DFFF00',
    corBg: 'rgba(223,255,0,0.1)',
    corBorda: '#DFFF00',
  },
  aprovado: {
    label: 'Aprovado',
    cor: '#9EEE35',
    corBg: 'rgba(58,93,31,0.4)',
    corBorda: '#9EEE35',
  },
  aprovado_restricao: {
    label: 'Com Restrição',
    cor: '#A0AEC0',
    corBg: 'rgba(74,85,104,0.4)',
    corBorda: '#718096',
  },
  reprovado: {
    label: 'Reprovado',
    cor: '#fca5a5',
    corBg: 'rgba(69,10,10,0.6)',
    corBorda: '#dc2626',
  },
};
