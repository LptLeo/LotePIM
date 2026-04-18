import { AppDataSource } from "../config/AppDataSource.js";
import type { Repository } from "typeorm";
import { Lote } from "../entities/Lote.js";
import { InsumoEstoque } from "../entities/InsumoEstoque.js";
import { ConsumoInsumo } from "../entities/ConsumoInsumo.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import { PerfilUsuario } from "../entities/Usuario.js";

export class RastreabilidadeService {
  private loteRepo: Repository<Lote>;
  private consumoRepo: Repository<ConsumoInsumo>;
  private insumoRepo: Repository<InsumoEstoque>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.consumoRepo = AppDataSource.getRepository(ConsumoInsumo);
    this.insumoRepo = AppDataSource.getRepository(InsumoEstoque);
  }

  /** Autocomplete: busca simultânea em Lote e InsumoEstoque */
  autocomplete = async (q: string, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR]);

    const termo = `%${q}%`;

    const [lotes, insumos] = await Promise.all([
      this.loteRepo
        .createQueryBuilder("l")
        .leftJoinAndSelect("l.produto", "p")
        .where("l.numero_lote LIKE :termo", { termo })
        .limit(6)
        .getMany(),
      this.insumoRepo
        .createQueryBuilder("ie")
        .leftJoinAndSelect("ie.materiaPrima", "mp")
        .where("ie.numero_lote_interno LIKE :termo", { termo })
        .orWhere("ie.numero_lote_fornecedor LIKE :termo", { termo })
        .limit(6)
        .getMany(),
    ]);

    return [
      ...lotes.map((l) => ({
        id: l.id,
        texto_exibicao: l.numero_lote,
        subtexto: l.produto?.nome ?? "—",
        tipo: "LOTE_PRODUTO" as const,
        status: l.status,
      })),
      ...insumos.map((ie) => ({
        id: ie.id,
        texto_exibicao: ie.numero_lote_interno,
        subtexto: `${ie.materiaPrima?.nome ?? "—"} · Forn: ${ie.numero_lote_fornecedor}`,
        tipo: "LOTE_INSUMO" as const,
        status: null,
      })),
    ];
  };

  /** Consulta por número de lote de produção */
  private consultarPorLote = async (termo: string) => {
    const lote = await this.loteRepo.findOne({
      where: { numero_lote: termo },
      relations: [
        "produto",
        "operador",
        "consumos",
        "consumos.insumoEstoque",
        "consumos.insumoEstoque.materiaPrima",
        "inspecao",
        "inspecao.inspetor",
      ],
    });

    if (!lote) throw new AppError(`Nenhum lote encontrado com o número '${termo}'.`, 404);
    return lote;
  };

  /** Consulta reversa por código de lote de insumo */
  private consultarPorInsumo = async (termo: string) => {
    const consumos = await this.consumoRepo
      .createQueryBuilder("ci")
      .leftJoinAndSelect("ci.insumoEstoque", "ie")
      .leftJoinAndSelect("ie.materiaPrima", "mp")
      .leftJoinAndSelect("ci.lote", "lote")
      .leftJoinAndSelect("lote.produto", "produto")
      .leftJoinAndSelect("lote.operador", "operador")
      .where("ie.numero_lote_interno = :termo", { termo })
      .orWhere("ie.numero_lote_fornecedor = :termo", { termo })
      .getMany();

    if (consumos.length === 0) {
      throw new AppError(`Nenhum lote encontrado utilizando o insumo '${termo}'.`, 404);
    }

    const lotesMap = new Map<number, {
      numero_lote: string;
      produto: string;
      data_producao: Date;
      status: string;
      insumos_correspondentes: { nome: string; lote_interno: string; quantidade: number }[];
    }>();

    for (const consumo of consumos) {
      const lote = consumo.lote;
      const entry = lotesMap.get(lote.id);
      const insumoInfo = {
        nome: consumo.insumoEstoque.materiaPrima.nome,
        lote_interno: consumo.insumoEstoque.numero_lote_interno,
        quantidade: Number(consumo.quantidade_consumida),
      };

      if (entry) {
        entry.insumos_correspondentes.push(insumoInfo);
      } else {
        lotesMap.set(lote.id, {
          numero_lote: lote.numero_lote,
          produto: lote.produto.nome,
          data_producao: lote.data_producao,
          status: lote.status,
          insumos_correspondentes: [insumoInfo],
        });
      }
    }

    return Array.from(lotesMap.values());
  };

  consultar = async (termo: string, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR]);

    const ehLoteProduto = /^LOT-\d{8}-\d{3}$/.test(termo);

    if (ehLoteProduto) {
      return {
        tipo: "lote" as const,
        resultado: await this.consultarPorLote(termo),
      };
    }

    return {
      tipo: "insumo" as const,
      resultado: await this.consultarPorInsumo(termo),
    };
  };
}