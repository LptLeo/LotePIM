import { AppDataSource } from "../config/AppDataSource.js";
import { Between, In, MoreThanOrEqual, Not, type Repository } from "typeorm";
import { Lote, LoteStatus } from "../entities/Lote.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";

export class MetricasService {
  private loteRepo: Repository<Lote>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
  }

  getDashboard = async (requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const agora = new Date();

    // Datas para o mês atual
    const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMesAtual = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);

    // Datas para o mês passado
    const inicioMesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const fimMesPassado = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999);

    const [
      lotesMesAtual,
      lotesMesPassado,
      unidadesMesAtualRaw,
      unidadesMesPassadoRaw,
      aprovadosNoMes,
      totalInspecionadosNoMes,
      aguardandoInspecao,
      ultimosLotes,
      topProdutos,
      topFuncionarios,
    ] = await Promise.all([
      // Lotes mês atual
      this.loteRepo.count({
        where: { aberto_em: Between(inicioMesAtual, fimMesAtual) },
      }),
      // Lotes mês passado
      this.loteRepo.count({
        where: { aberto_em: Between(inicioMesPassado, fimMesPassado) },
      }),
      // Unidades mês atual
      this.loteRepo
        .createQueryBuilder("lote")
        .select("COALESCE(SUM(lote.quantidade_planejada), 0)", "total")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: inicioMesAtual, fim: fimMesAtual })
        .getRawOne<{ total: string }>(),
      // Unidades mês passado
      this.loteRepo
        .createQueryBuilder("lote")
        .select("COALESCE(SUM(lote.quantidade_planejada), 0)", "total")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: inicioMesPassado, fim: fimMesPassado })
        .getRawOne<{ total: string }>(),

      this.loteRepo.count({
        where: [
          { status: LoteStatus.APROVADO, encerrado_em: MoreThanOrEqual(inicioMesAtual) },
          { status: LoteStatus.APROVADO_RESTRICAO, encerrado_em: MoreThanOrEqual(inicioMesAtual) },
        ],
      }),

      this.loteRepo.count({
        where: {
          status: Not(In([LoteStatus.EM_PRODUCAO, LoteStatus.AGUARDANDO_INSPECAO])),
          encerrado_em: MoreThanOrEqual(inicioMesAtual),
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
      // Top 10 produtos no mês (por volume de unidades)
      this.loteRepo
        .createQueryBuilder("lote")
        .leftJoin("lote.produto", "produto")
        .select("produto.nome", "nome")
        .addSelect("SUM(lote.quantidade_planejada)::INTEGER", "quantidade")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: inicioMesAtual, fim: fimMesAtual })
        .groupBy("produto.id")
        .addGroupBy("produto.nome")
        .orderBy("quantidade", "DESC")
        .limit(10)
        .getRawMany(),
      // Top 10 funcionários (operadores) no mês (por número de lotes operados)
      this.loteRepo
        .createQueryBuilder("lote")
        .leftJoin("lote.operador", "operador")
        .select("operador.nome", "nome")
        .addSelect("COUNT(lote.id)::INTEGER", "quantidade_lotes")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: inicioMesAtual, fim: fimMesAtual })
        .groupBy("operador.id")
        .addGroupBy("operador.nome")
        .orderBy("quantidade_lotes", "DESC")
        .limit(10)
        .getRawMany(),
    ]);

    const unidadesMesAtual = Number(unidadesMesAtualRaw?.total ?? "0");
    const unidadesMesPassado = Number(unidadesMesPassadoRaw?.total ?? "0");

    // Cálculo de tendências (%)
    const calcularTendencia = (atual: number, passado: number) => {
      if (passado === 0) return atual > 0 ? 100 : 0;
      return Math.round(((atual - passado) / passado) * 100);
    };

    const taxaAprovacao = totalInspecionadosNoMes > 0
      ? Math.round((aprovadosNoMes / totalInspecionadosNoMes) * 100)
      : 0;

    return {
      lotes_mes: lotesMesAtual,
      lotes_tendencia: calcularTendencia(lotesMesAtual, lotesMesPassado),
      unidades_mes: unidadesMesAtual,
      unidades_tendencia: calcularTendencia(unidadesMesAtual, unidadesMesPassado),
      taxa_aprovacao_mes: taxaAprovacao,
      aguardando_inspecao: aguardandoInspecao,
      ultimos_lotes: ultimosLotes,
      top_produtos: topProdutos,
      top_funcionarios: topFuncionarios,
    };
  };
}