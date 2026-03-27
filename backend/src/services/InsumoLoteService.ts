import { AppDataSource } from "../config/AppDataSource.js";
import { Repository } from "typeorm";
import { InsumoLote } from "../entities/InsumoLote.js";

export interface InsumoVinculoDTO {
  nome: string;
  codigo_insumo: string;
  lote_origem: string;
  quantidade: number;
  unidade_medida: string;
}

export class InsumoLoteService {
  private insumoLoteRepo: Repository<InsumoLote>;

  constructor() {
    this.insumoLoteRepo = AppDataSource.getRepository(InsumoLote);
  }
}