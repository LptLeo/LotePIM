import { AppDataSource } from "../config/AppDataSource.js";
import { Between, LessThanOrEqual, Like, MoreThanOrEqual, type Repository } from "typeorm";
import { Lote, LoteStatus } from "../entities/Lote.js";
import type { LoteDTO } from "../dto/loteDTO.js";
import { InsumoLote } from "../entities/InsumoLote.js";
import type { InsumoVinculoDTO } from "./InsumoLoteService.js";

interface IFiltros {
  produto_id?: string;
  status?: LoteStatus;
  dataInicio?: Date | undefined;
  dataFim?: Date | undefined;
}

export class LoteService {
  private loteRepo: Repository<Lote>;
  private insumoLoteRepo: Repository<InsumoLote>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.insumoLoteRepo = AppDataSource.getRepository(InsumoLote);
  }
  // // // // //
  // Funções de Escrita
  // // // // //

  // createLote
  async createLote(loteDTO: LoteDTO) {
    const numeroGerado = await this.gerarNumeroLote(loteDTO.data);

    const novoLote = this.loteRepo.create({
      ...loteDTO,
      numero_lote: numeroGerado,
      status: LoteStatus.em_producao,
    })

    return await this.loteRepo.save(novoLote);
  }

  // gerarNumeroLote
  private async gerarNumeroLote(data: Date = new Date()) {
    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);

    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 999);

    const totalHoje = await this.loteRepo.count({
      where: {
        aberto_em: Between(inicioDia, fimDia)
      }
    });

    const ano = data.getFullYear();
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const dia = data.getDate().toString().padStart(2, '0');

    const sequencial = (totalHoje + 1).toString().padStart(3, '0');

    const novoNumeroLote = `LOTE-${ano}${mes}${dia}-${sequencial}`;

    return novoNumeroLote;
  }

  // vincularInsumos
  async vincularInsumos(loteId: number, insumos: InsumoVinculoDTO[]) {
    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    if (lote.status !== LoteStatus.em_producao) {
      throw new Error("Só é possível vincular insumos a lotes em produção.");
    }

    const novosInsumos = insumos.map(insumo => {
      return this.insumoLoteRepo.create({
        ...insumo,
        lote: lote
      })
    });

    return await this.insumoLoteRepo.save(novosInsumos);
  }

  // encerrarProducao
  async encerrarProducao(loteId: number) {
    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    if (lote.status !== LoteStatus.em_producao) {
      throw new Error(`Não é possível encerrar um lote com status: ${lote.status}`);
    }

    const contagemInsumos = await this.insumoLoteRepo.count({
      where: { lote: { id: loteId } }
    });

    if (contagemInsumos === 0) {
      throw new Error("Não é possível encerrar um lote sem insumos vinculados.");
    }

    lote.status = LoteStatus.aguardando_inspecao;
    lote.encerrado_em = new Date();

    return await this.loteRepo.save(lote);
  }

  // // // // //
  // Funções de Leitura
  // // // // //

  // getAllLotes
  async getAllLotes(filtros?: IFiltros) {
    if (filtros?.dataInicio && filtros?.dataFim && filtros.dataInicio > filtros.dataFim) {
      throw new Error("A data de início não pode ser posterior à data de fim.");
    }

    const where: any = {};

    if (filtros) {
      if (filtros.produto_id) where.produto_id = Like(`%${filtros.produto_id}%`);

      if (filtros.status) where.status = filtros.status;

      if (filtros.dataInicio && filtros.dataFim) {
        where.aberto_em = Between(filtros.dataInicio, filtros.dataFim);
      } else if (filtros.dataInicio) {
        where.aberto_em = MoreThanOrEqual(filtros.dataInicio);
      } else if (filtros.dataFim) {
        where.aberto_em = LessThanOrEqual(filtros.dataFim);
      }
    }

    return await this.loteRepo.find({
      where,
      order: { aberto_em: "DESC" },
      relations: ['operador']
    });
  }

  // getLoteById
  async getLoteById(loteId: number) {
    const lote = await this.loteRepo.findOne({
      where: { id: loteId },
      relations: ['operador', 'insumos', 'inspecao', 'inspecao.inspetor_id']
    });

    if (!lote) throw new Error("Lote não encontrado.");

    return lote;
  }

  // getRastreabilidadeReversa
  async getRastreabilidadeReversa(loteOrigemInsumo: string) {
    const vinculos = await this.insumoLoteRepo.find({
      where: { lote_origem: loteOrigemInsumo },
      relations: ['lote']
    });

    return vinculos.map(v => v.lote);
  }
}