import { AppDataSource } from "../config/AppDataSource.js";
import { Repository } from "typeorm";
import { InsumoLote } from "../entities/InsumoLote.js";
import { Lote, LoteStatus } from "../entities/Lote.js";

import type { InsumoVinculoDTO } from "../dto/InsumoLoteDTO.js";

export class InsumoLoteService {
  private insumoLoteRepo: Repository<InsumoLote>;
  private loteRepo: Repository<Lote>;

  constructor() {
    this.insumoLoteRepo = AppDataSource.getRepository(InsumoLote);
    this.loteRepo = AppDataSource.getRepository(Lote);
  }

  async vincularInsumos(loteId: number, insumosDTO: InsumoVinculoDTO[]) {
    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) throw new Error("Lote não encontrado.");

    if (lote.status !== LoteStatus.em_producao) {
      throw new Error("Insumos só podem ser adicionados enquanto o lote está em produção.");
    }

    const novosInsumos = insumosDTO.map(dto => {
      return this.insumoLoteRepo.create({
        ...dto,
        lote: lote
      });
    });

    return await this.insumoLoteRepo.save(novosInsumos);
  }

  async removerInsumo(insumoId: number) {
    const insumo = await this.insumoLoteRepo.findOne({
      where: { id: insumoId },
      relations: ["lote"]
    });

    if (!insumo) throw new Error("Vínculo de insumo não encontrado.");

    if (insumo.lote.status !== LoteStatus.em_producao) {
      throw new Error("Não é possível remover insumos de um lote que já saiu de produção.");
    }

    return await this.insumoLoteRepo.remove(insumo);
  }

  async listarInsumosPorLote(loteId: number) {
    return await this.insumoLoteRepo.find({
      where: { lote: { id: loteId } },
      order: { nome_insumo: "ASC" }
    });
  }

  async getRastreabilidadeReversa(termo: string) {
    const vinculos = await this.insumoLoteRepo.find({
      where: [
        { codigo_insumo: termo },
        { lote_insumo: termo },
        { lote_origem: termo }
      ],
      relations: ["lote", "lote.produto"]
    });

    if (vinculos.length === 0) return [];

    const lotesAfetados = vinculos.map(v => ({
      numero_lote: v.lote.numero_lote,
      produto: v.lote.produto?.nome || "N/A",
      data_producao: v.lote.data_producao,
      status: v.lote.status
    }));

    return Array.from(new Map(lotesAfetados.map(l => [l.numero_lote, l])).values());
  }
}