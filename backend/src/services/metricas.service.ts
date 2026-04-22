import { AppDataSource } from "../config/AppDataSource.js";
import { Between, In, MoreThanOrEqual, Not, type Repository } from "typeorm";
import { Lote, LoteStatus } from "../entities/Lote.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";

export type PeriodoDashboard = 'mes' | 'semana' | 'dia' | 'qualquer_momento';

export class MetricasService {
  private loteRepo: Repository<Lote>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
  }

  private getIntervalo(periodo: PeriodoDashboard, dataRef: Date) {
    const inicio = new Date(dataRef);
    const fim = new Date(dataRef);

    if (periodo === 'qualquer_momento') {
      // Qualquer momento: início dos tempos até agora
      const inicioEterno = new Date(0);
      fim.setHours(23, 59, 59, 999);
      return { atual: [inicioEterno, fim], passado: [inicioEterno, inicioEterno] };
    }

    if (periodo === 'mes') {
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      fim.setMonth(fim.getMonth() + 1, 0);
      fim.setHours(23, 59, 59, 999);
      
      const inicioPassado = new Date(inicio);
      inicioPassado.setMonth(inicioPassado.getMonth() - 1);
      const fimPassado = new Date(inicio);
      fimPassado.setDate(0);
      fimPassado.setHours(23, 59, 59, 999);
      
      return { atual: [inicio, fim], passado: [inicioPassado, fimPassado] };
    } else if (periodo === 'semana') {
      // Semana atual (últimos 7 dias a partir de hoje inclusive)
      inicio.setDate(inicio.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);

      const inicioPassado = new Date(inicio);
      inicioPassado.setDate(inicioPassado.getDate() - 7);
      const fimPassado = new Date(inicio);
      fimPassado.setMilliseconds(-1);

      return { atual: [inicio, fim], passado: [inicioPassado, fimPassado] };
    } else {
      // Dia atual
      inicio.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);

      const inicioPassado = new Date(inicio);
      inicioPassado.setDate(inicioPassado.getDate() - 1);
      const fimPassado = new Date(inicio);
      fimPassado.setMilliseconds(-1);

      return { atual: [inicio, fim], passado: [inicioPassado, fimPassado] };
    }
  }

  getDashboard = async (requisitante: Requisitante, periodoLotes: PeriodoDashboard = 'mes', periodoUnidades: PeriodoDashboard = 'mes') => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const agora = new Date();
    
    const intervaloLotes = this.getIntervalo(periodoLotes, agora);
    const intervaloUnidades = this.getIntervalo(periodoUnidades, agora);
    
    // Para as demais métricas (Top produtos, etc), usaremos o período de lotes como base ou manteremos mês? 
    // Vamos usar o período de lotes para manter consistência se possível, ou manter o mês como padrão para o resto.
    // O usuário só pediu configurações para os cards de Lotes e Unidades.
    const [inicioGeral, fimGeral] = intervaloLotes.atual;

    const [
      lotesAtual,
      lotesPassado,
      unidadesAtualRaw,
      unidadesPassadoRaw,
      aprovadosNoMes,
      totalInspecionadosNoMes,
      aguardandoInspecao,
      ultimosLotes,
      topProdutos,
      topFuncionarios,
    ] = await Promise.all([
      // Lotes
      this.loteRepo.count({
        where: { aberto_em: Between(intervaloLotes.atual[0], intervaloLotes.atual[1]) },
      }),
      this.loteRepo.count({
        where: { aberto_em: Between(intervaloLotes.passado[0], intervaloLotes.passado[1]) },
      }),
      // Unidades
      this.loteRepo
        .createQueryBuilder("lote")
        .select("COALESCE(SUM(lote.quantidade_planejada), 0)", "total")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: intervaloUnidades.atual[0], fim: intervaloUnidades.atual[1] })
        .getRawOne<{ total: string }>(),
      this.loteRepo
        .createQueryBuilder("lote")
        .select("COALESCE(SUM(lote.quantidade_planejada), 0)", "total")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: intervaloUnidades.passado[0], fim: intervaloUnidades.passado[1] })
        .getRawOne<{ total: string }>(),

      this.loteRepo.count({
        where: [
          { status: LoteStatus.APROVADO, encerrado_em: MoreThanOrEqual(inicioGeral) },
          { status: LoteStatus.APROVADO_RESTRICAO, encerrado_em: MoreThanOrEqual(inicioGeral) },
        ],
      }),

      this.loteRepo.count({
        where: {
          status: Not(In([LoteStatus.EM_PRODUCAO, LoteStatus.AGUARDANDO_INSPECAO])),
          encerrado_em: MoreThanOrEqual(inicioGeral),
        },
      }),

      this.loteRepo.count({
        where: { status: LoteStatus.AGUARDANDO_INSPECAO },
      }),

      this.loteRepo.find({
        order: { aberto_em: "DESC" },
        take: 10,
        relations: ["produto", "operador"],
      }),
      
      this.loteRepo
        .createQueryBuilder("lote")
        .leftJoin("lote.produto", "produto")
        .select("produto.nome", "nome")
        .addSelect("SUM(lote.quantidade_planejada)::INTEGER", "quantidade")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: inicioGeral, fim: fimGeral })
        .groupBy("produto.id")
        .addGroupBy("produto.nome")
        .orderBy("quantidade", "DESC")
        .limit(10)
        .getRawMany(),
      
      this.loteRepo
        .createQueryBuilder("lote")
        .leftJoin("lote.operador", "operador")
        .select("operador.nome", "nome")
        .addSelect("COUNT(lote.id)::INTEGER", "quantidade_lotes")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: inicioGeral, fim: fimGeral })
        .groupBy("operador.id")
        .addGroupBy("operador.nome")
        .orderBy("quantidade_lotes", "DESC")
        .limit(10)
        .getRawMany(),
    ]);

    const unidadesAtual = Number(unidadesAtualRaw?.total ?? "0");
    const unidadesPassado = Number(unidadesPassadoRaw?.total ?? "0");

    const calcularTendencia = (atual: number, passado: number) => {
      if (passado === 0) return atual > 0 ? 100 : 0;
      return Math.round(((atual - passado) / passado) * 100);
    };

    const taxaAprovacao = totalInspecionadosNoMes > 0
      ? Math.round((aprovadosNoMes / totalInspecionadosNoMes) * 100)
      : 0;

    return {
      lotes_mes: lotesAtual,
      lotes_tendencia: calcularTendencia(lotesAtual, lotesPassado),
      unidades_mes: unidadesAtual,
      unidades_tendencia: calcularTendencia(unidadesAtual, unidadesPassado),
      taxa_aprovacao_mes: taxaAprovacao,
      aguardando_inspecao: aguardandoInspecao,
      ultimos_lotes: ultimosLotes,
      top_produtos: topProdutos,
      top_funcionarios: topFuncionarios,
    };
  };
}