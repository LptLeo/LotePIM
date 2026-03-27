import { AppDataSource } from "../config/AppDataSource.js";
import { Between, LessThanOrEqual, Like, MoreThanOrEqual, type Repository } from "typeorm";
import { Lote, LoteStatus } from "../entities/Lote.js";

interface IFiltros {
  produto_id?: string;
  status?: LoteStatus;
  dataInicio?: Date;
  dataFim?: Date;
}

export class LoteService {
  private loteRepo: Repository<Lote>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
  }

  // createLote

  // vincularInsumos

  // encerrarProducao

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

  async getLoteById(id: string) {
    return await this.loteRepo.findOneBy({ id });
  }
}