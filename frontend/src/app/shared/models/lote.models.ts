// ──────────────────────────────────────────────
// Modelos compartilhados — tipagem explícita
// Cada interface reflete exatamente o contrato da API
// ──────────────────────────────────────────────

export type LoteStatus =
  | 'em_producao'
  | 'aguardando_inspecao'
  | 'aprovado'
  | 'aprovado_restricao'
  | 'reprovado';

// ── Entidades Base ──

export interface MateriaPrima {
  id: number;
  nome: string;
  sku_interno: string;
  unidade_medida: 'KG' | 'L' | 'M' | 'UN';
  categoria: string;
}

export interface ReceitaItem {
  id: number;
  materiaPrima: MateriaPrima;
  quantidade: number;
  unidade: string;
}

export interface Produto {
  id: number;
  nome: string;
  sku: string;
  categoria: string;
  linha_padrao: string;
  percentual_ressalva: number;
  ativo: boolean;
  receita: ReceitaItem[];
  lotes?: any[];
}

export interface Operador {
  id: number;
  nome: string;
}

export interface InsumoEstoque {
  id: number;
  materiaPrima: MateriaPrima;
  numero_lote_fornecedor: string;
  numero_lote_interno: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  fornecedor: string;
  turno: string;
  data_validade: string | null;
  recebido_em: string;
}

export interface ConsumoInsumo {
  id: number;
  insumoEstoque: InsumoEstoque;
  quantidade_consumida: number;
  registrado_em: string;
}

export interface Inspecao {
  id: number;
  resultado_calculado: 'aprovado' | 'aprovado_restricao' | 'reprovado';
  quantidade_reprovada: number;
  descricao_desvio: string;
  inspecionado_em: string;
  inspetor: Operador;
}

// ── Lote de Produção ──

export interface LoteDetalhe {
  id: number;
  numero_lote: string;
  produto: Produto;
  data_producao: string;
  turno: string;
  operador: Operador;
  quantidade_planejada: number;
  status: LoteStatus;
  observacoes: string;
  data_validade: string | null;
  aberto_em: string;
  encerrado_em: string | null;
  consumos: ConsumoInsumo[];
  inspecao: Inspecao | null;
}

// ── Sugestão de Busca ──

export interface SugestaoItem {
  tipo: 'lote' | 'produto';
  id: number | null;
  label: string;
  sublabel: string;
  status?: LoteStatus;
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
    label: 'Aprovado com Restrição',
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
