import { AppDataSource } from "../config/AppDataSource.js";
import type { Repository } from "typeorm";
import { Lote } from "../entities/Lote.js";
import { InsumoLote } from "../entities/InsumoLote.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import { PerfilUsuario } from "../entities/Usuario.js";

export class RastreabilidadeService {
  private loteRepo: Repository<Lote>;
  private insumoLoteRepo: Repository<InsumoLote>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.insumoLoteRepo = AppDataSource.getRepository(InsumoLote);
  }

  // Consulta por número de lote — retorna dados do lote, insumos e inspeção
  consultarPorLote = async (termo: string, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR]);

    const lote = await this.loteRepo.findOne({
      where: { numero_lote: termo },
      relations: ["produto", "operador", "insumos", "inspecao", "inspecao.inspetor"],
    });

    if (!lote) throw new AppError(`Nenhum lote encontrado com o número '${termo}'.`, 404);

    return lote;
  };

  // Consulta reversa por insumo
  consultarPorInsumo = async (termo: string, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const insumos = await this.insumoLoteRepo.find({
      where: [
        { codigo_insumo: termo },
        { lote_insumo: termo },
      ],
      relations: ["lote", "lote.produto", "lote.operador", "lote.inspecao"],
    });

    if (insumos.length === 0) {
      throw new AppError(`Nenhum lote encontrado utilizando o insumo '${termo}'.`, 404);
    }

    const lotesMap = new Map<number, {
      numero_lote: string;
      produto: string;
      data_producao: Date;
      status: string;
      insumos_correspondentes: { nome_insumo: string; codigo_insumo?: string; lote_insumo?: string }[];
    }>();

    for (const insumo of insumos) {
      const lote = insumo.lote;
      const entry = lotesMap.get(lote.id);

      const insumoInfo = {
        nome_insumo: insumo.nome_insumo,
        ...(insumo.codigo_insumo ? { codigo_insumo: insumo.codigo_insumo } : {}),
        ...(insumo.lote_insumo ? { lote_insumo: insumo.lote_insumo } : {}),
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

  // Ponto de entrada único
  consultar = async (termo: string, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR, PerfilUsuario.INSPETOR, PerfilUsuario.OPERADOR]);

    // Números de lote seguem o padrão LOTE-YYYYMMDD-NNN
    const ehNumeroLote = /^LOTE-\d{8}-\d{3}$/.test(termo);

    if (ehNumeroLote) {
      return {
        tipo: "lote" as const,
        resultado: await this.consultarPorLote(termo, requisitante),
      };
    }

    return {
      tipo: "insumo" as const,
      resultado: await this.consultarPorInsumo(termo, requisitante),
    };
  };
}