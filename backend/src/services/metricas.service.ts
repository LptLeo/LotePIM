import { Between, In, MoreThanOrEqual, Not, type Repository } from 'typeorm';
import { Lote, LoteStatus } from '../entities/Lote.js';
import { PerfilUsuario } from '../entities/Usuario.js';
import { verificaPermissao, type Requisitante } from '../utils/auth.utils.js';

// === TIPOS ===

export type PeriodoDashboard = 'mes' | 'semana' | 'dia' | 'qualquer_momento';

export interface IntervaloPeriodo {
  atual: [Date, Date];
  passado: [Date, Date];
}

interface UnidadesRaw {
  total: string;
}

interface TopItemRaw {
  nome: string;
  quantidade?: string;
  quantidade_lotes?: string;
}

interface ResultadoDashboard {
  lotesAtual: number;
  lotesPassado: number;
  unidadesAtual: number;
  unidadesPassado: number;
  aprovadosNoPeriodo: number;
  totalInspecionadosNoPeriodo: number;
  aguardandoInspecao: number;
  ultimosLotes: Lote[];
  topProdutos: TopItemRaw[];
  topFuncionarios: TopItemRaw[];
}

export interface RespostaDashboard {
  lotes_mes: number;
  lotes_tendencia: number;
  unidades_mes: number;
  unidades_tendencia: number;
  taxa_aprovacao_mes: number;
  aguardando_inspecao: number;
  ultimos_lotes: Lote[];
  top_produtos: TopItemRaw[];
  top_funcionarios: TopItemRaw[];
}

export class MetricasService {
  constructor(private readonly loteRepo: Repository<Lote>) {}

  // === FUNÇÕES PÚBLICAS ===

  public async obterDashboard(
    requisitante: Requisitante,
    periodoLotes: PeriodoDashboard = 'mes',
    periodoUnidades: PeriodoDashboard = 'mes',
  ): Promise<RespostaDashboard> {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const agora = new Date();
    const intervaloLotes = this.calcularIntervalo(periodoLotes, agora);
    const intervaloUnidades = this.calcularIntervalo(periodoUnidades, agora);
    const [inicioGeral, fimGeral] = intervaloLotes.atual;

    const metricas = await this.buscarTodasMetricas(
      intervaloLotes,
      intervaloUnidades,
      inicioGeral,
      fimGeral,
    );

    const metricaLotes = this.calcularTendencia(
      metricas.lotesAtual,
      metricas.lotesPassado,
    );
    const metricaUnidades = this.calcularTendencia(
      metricas.unidadesAtual,
      metricas.unidadesPassado,
    );
    const taxaAprovacao = this.calcularTaxaAprovacao(
      metricas.aprovadosNoPeriodo,
      metricas.totalInspecionadosNoPeriodo,
    );

    return {
      lotes_mes: metricaLotes.atual,
      lotes_tendencia: metricaLotes.tendencia,
      unidades_mes: metricaUnidades.atual,
      unidades_tendencia: metricaUnidades.tendencia,
      taxa_aprovacao_mes: taxaAprovacao,
      aguardando_inspecao: metricas.aguardandoInspecao,
      ultimos_lotes: metricas.ultimosLotes,
      top_produtos: metricas.topProdutos,
      top_funcionarios: metricas.topFuncionarios,
    };
  }

  // === FUNÇÕES DE CÁLCULO DE PERÍODO ===

  private calcularIntervalo(periodo: PeriodoDashboard, dataRef: Date): IntervaloPeriodo {
    if (periodo === 'qualquer_momento')
      return this.criarIntervaloQualquerMomento(dataRef);
    if (periodo === 'mes') return this.criarIntervaloMensal(dataRef);
    if (periodo === 'semana') return this.criarIntervaloSemanal(dataRef);

    return this.criarIntervaloDiario(dataRef);
  }

  private criarIntervaloQualquerMomento(dataRef: Date): IntervaloPeriodo {
    const inicioEterno = new Date(0);
    const fim = new Date(dataRef);
    fim.setHours(23, 59, 59, 999);

    return {
      atual: [inicioEterno, fim],
      passado: [inicioEterno, inicioEterno],
    };
  }

  private criarIntervaloMensal(dataRef: Date): IntervaloPeriodo {
    const inicioAtual = new Date(dataRef);
    inicioAtual.setDate(1);
    inicioAtual.setHours(0, 0, 0, 0);

    const fimAtual = new Date(dataRef);
    fimAtual.setMonth(fimAtual.getMonth() + 1, 0);
    fimAtual.setHours(23, 59, 59, 999);

    const inicioPassado = new Date(inicioAtual);
    inicioPassado.setMonth(inicioPassado.getMonth() - 1);

    const fimPassado = new Date(inicioAtual);
    fimPassado.setDate(0);
    fimPassado.setHours(23, 59, 59, 999);

    return {
      atual: [inicioAtual, fimAtual],
      passado: [inicioPassado, fimPassado],
    };
  }

  private criarIntervaloSemanal(dataRef: Date): IntervaloPeriodo {
    const inicioAtual = new Date(dataRef);
    inicioAtual.setDate(inicioAtual.getDate() - 6);
    inicioAtual.setHours(0, 0, 0, 0);

    const fimAtual = new Date(dataRef);
    fimAtual.setHours(23, 59, 59, 999);

    const inicioPassado = new Date(inicioAtual);
    inicioPassado.setDate(inicioPassado.getDate() - 7);

    const fimPassado = new Date(inicioAtual);
    fimPassado.setMilliseconds(-1);

    return {
      atual: [inicioAtual, fimAtual],
      passado: [inicioPassado, fimPassado],
    };
  }

  private criarIntervaloDiario(dataRef: Date): IntervaloPeriodo {
    const inicioAtual = new Date(dataRef);
    inicioAtual.setHours(0, 0, 0, 0);

    const fimAtual = new Date(dataRef);
    fimAtual.setHours(23, 59, 59, 999);

    const inicioPassado = new Date(inicioAtual);
    inicioPassado.setDate(inicioPassado.getDate() - 1);

    const fimPassado = new Date(inicioAtual);
    fimPassado.setMilliseconds(-1);

    return {
      atual: [inicioAtual, fimAtual],
      passado: [inicioPassado, fimPassado],
    };
  }

  // === FUNÇÕES DE CONSULTA ===

  private async buscarTodasMetricas(
    intervaloLotes: IntervaloPeriodo,
    intervaloUnidades: IntervaloPeriodo,
    inicioGeral: Date,
    fimGeral: Date,
  ): Promise<ResultadoDashboard> {
    const [
      lotesAtual,
      lotesPassado,
      unidadesAtualRaw,
      unidadesPassadoRaw,
      aprovadosNoPeriodo,
      totalInspecionadosNoPeriodo,
      aguardandoInspecao,
      ultimosLotes,
      topProdutos,
      topFuncionarios,
    ] = await Promise.all([
      this.contarLotesNoIntervalo(intervaloLotes.atual),
      this.contarLotesNoIntervalo(intervaloLotes.passado),
      this.somarUnidadesNoIntervalo(intervaloUnidades.atual),
      this.somarUnidadesNoIntervalo(intervaloUnidades.passado),
      this.contarAprovadosNoPeriodo(inicioGeral),
      this.contarInspecionadosNoPeriodo(inicioGeral),
      this.contarAguardandoInspecao(),
      this.buscarUltimosLotes(),
      this.buscarTopProdutos(inicioGeral, fimGeral),
      this.buscarTopFuncionarios(inicioGeral, fimGeral),
    ]);

    return {
      lotesAtual,
      lotesPassado,
      unidadesAtual: Number(unidadesAtualRaw?.total ?? '0'),
      unidadesPassado: Number(unidadesPassadoRaw?.total ?? '0'),
      aprovadosNoPeriodo,
      totalInspecionadosNoPeriodo,
      aguardandoInspecao,
      ultimosLotes,
      topProdutos: topProdutos as TopItemRaw[],
      topFuncionarios: topFuncionarios as TopItemRaw[],
    };
  }

  private async contarLotesNoIntervalo(intervalo: [Date, Date]): Promise<number> {
    return this.loteRepo.count({
      where: { aberto_em: Between(intervalo[0], intervalo[1]) },
    });
  }

  private async somarUnidadesNoIntervalo(
    intervalo: [Date, Date],
  ): Promise<UnidadesRaw | undefined> {
    return this.loteRepo
      .createQueryBuilder('lote')
      .select('SUM(lote.quantidade_planejada)', 'total')
      .where('lote.aberto_em BETWEEN :inicio AND :fim', {
        inicio: intervalo[0],
        fim: intervalo[1],
      })
      .getRawOne<UnidadesRaw>();
  }

  private async contarAprovadosNoPeriodo(dataInicio: Date): Promise<number> {
    return this.loteRepo.count({
      where: [
        { status: LoteStatus.APROVADO, encerrado_em: MoreThanOrEqual(dataInicio) },
        {
          status: LoteStatus.APROVADO_RESTRICAO,
          encerrado_em: MoreThanOrEqual(dataInicio),
        },
      ],
    });
  }

  private async contarInspecionadosNoPeriodo(dataInicio: Date): Promise<number> {
    const statusNaoInspecionados = [
      LoteStatus.EM_PRODUCAO,
      LoteStatus.AGUARDANDO_INSPECAO,
    ];

    return this.loteRepo.count({
      where: {
        status: Not(In(statusNaoInspecionados)),
        encerrado_em: MoreThanOrEqual(dataInicio),
      },
    });
  }

  private async contarAguardandoInspecao(): Promise<number> {
    return this.loteRepo.count({
      where: { status: LoteStatus.AGUARDANDO_INSPECAO },
    });
  }

  private async buscarUltimosLotes(): Promise<Lote[]> {
    return this.loteRepo.find({
      order: { aberto_em: 'DESC' },
      take: 10,
      relations: ['produto', 'operador'],
    });
  }

  private async buscarTopProdutos(inicio: Date, fim: Date): Promise<TopItemRaw[]> {
    return this.loteRepo
      .createQueryBuilder('lote')
      .leftJoin('lote.produto', 'produto')
      .select('produto.nome', 'nome')
      .addSelect('SUM(lote.quantidade_planejada)', 'quantidade')
      .where('lote.aberto_em BETWEEN :inicio AND :fim', { inicio, fim })
      .groupBy('produto.id')
      .addGroupBy('produto.nome')
      .orderBy('quantidade', 'DESC')
      .limit(10)
      .getRawMany();
  }

  private async buscarTopFuncionarios(inicio: Date, fim: Date): Promise<TopItemRaw[]> {
    return this.loteRepo
      .createQueryBuilder('lote')
      .leftJoin('lote.operador', 'operador')
      .select('operador.nome', 'nome')
      .addSelect('COUNT(lote.id)', 'quantidade_lotes')
      .where('lote.aberto_em BETWEEN :inicio AND :fim', { inicio, fim })
      .groupBy('operador.id')
      .addGroupBy('operador.nome')
      .orderBy('quantidade_lotes', 'DESC')
      .limit(10)
      .getRawMany();
  }

  // === FUNÇÕES DE CÁLCULO ===

  private calcularTendencia(
    atual: number,
    passado: number,
  ): { atual: number; tendencia: number } {
    const tendencia =
      passado === 0
        ? atual > 0
          ? 100
          : 0
        : Math.round(((atual - passado) / passado) * 100);

    return { atual, tendencia };
  }

  private calcularTaxaAprovacao(aprovados: number, totalInspecionados: number): number {
    if (totalInspecionados === 0) return 0;

    return Math.round((aprovados / totalInspecionados) * 100);
  }
}
