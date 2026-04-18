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

    const inicioDia = new Date(agora);
    inicioDia.setHours(0, 0, 0, 0);

    const fimDia = new Date(agora);
    fimDia.setHours(23, 59, 59, 999);

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const [
      lotesHoje,
      unidadesHoje,
      aprovadosNoMes,
      totalInspecionadosNoMes,
      aguardandoInspecao,
      ultimosLotes,
    ] = await Promise.all([
      this.loteRepo.count({
        where: { aberto_em: Between(inicioDia, fimDia) },
      }),

      this.loteRepo
        .createQueryBuilder("lote")
        .select("COALESCE(SUM(lote.quantidade_planejada), 0)", "total")
        .where("lote.aberto_em BETWEEN :inicio AND :fim", { inicio: inicioDia, fim: fimDia })
        .getRawOne<{ total: string }>(),

      this.loteRepo.count({
        where: [
          { status: LoteStatus.APROVADO, encerrado_em: MoreThanOrEqual(inicioMes) },
          { status: LoteStatus.APROVADO_RESTRICAO, encerrado_em: MoreThanOrEqual(inicioMes) },
        ],
      }),

      this.loteRepo.count({
        where: {
          status: Not(In([LoteStatus.EM_PRODUCAO, LoteStatus.AGUARDANDO_INSPECAO])),
          encerrado_em: MoreThanOrEqual(inicioMes),
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
    ]);

    const taxaAprovacao = totalInspecionadosNoMes > 0
      ? Math.round((aprovadosNoMes / totalInspecionadosNoMes) * 100)
      : 0;

    return {
      lotes_hoje: lotesHoje,
      unidades_hoje: Number(unidadesHoje?.total ?? "0"),
      taxa_aprovacao_mes: taxaAprovacao,
      aguardando_inspecao: aguardandoInspecao,
      ultimos_lotes: ultimosLotes,
    };
  };
}