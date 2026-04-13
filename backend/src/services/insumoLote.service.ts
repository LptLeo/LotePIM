import { AppDataSource } from "../config/AppDataSource.js";
import { In, Repository, type DeepPartial } from "typeorm";
import { InsumoLote } from "../entities/InsumoLote.js";
import { Lote, LoteStatus } from "../entities/Lote.js";
import type { VincularInsumosDTO } from "../dto/insumoLote.dto.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";

export class InsumoLoteService {
  private insumoLoteRepo: Repository<InsumoLote>;
  private loteRepo: Repository<Lote>;

  constructor() {
    this.insumoLoteRepo = AppDataSource.getRepository(InsumoLote);
    this.loteRepo = AppDataSource.getRepository(Lote);
  }

  vincularInsumos = async (loteId: number, insumos: VincularInsumosDTO, requisitante: Requisitante): Promise<InsumoLote[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });
    if (!lote) throw new AppError("Lote não encontrado.", 404);
    if (lote.status !== LoteStatus.EM_PRODUCAO) {
      throw new AppError("Só é possível vincular insumos a lotes em produção.", 400);
    }

    const codigosArray = insumos.map(i => i.codigo_insumo).filter((c): c is string => !!c);
    const temDuplicatas = new Set(codigosArray).size !== codigosArray.length;
    if (temDuplicatas) throw new AppError("O formulário contém códigos de insumo duplicados.", 400);

    if (codigosArray.length > 0) {
      const insumosJaUsados = await this.insumoLoteRepo.find({
        where: { lote: { id: loteId }, codigo_insumo: In(codigosArray) },
      });

      if (insumosJaUsados.length > 0) {
        const codigos = insumosJaUsados.map(i => i.codigo_insumo).join(", ");
        throw new AppError(`Os seguintes insumos já estão vinculados a este lote: ${codigos}`, 409);
      }
    }

    const novosInsumos = insumos.map(insumo =>
      this.insumoLoteRepo.create({
        nome_insumo: insumo.nome_insumo,
        codigo_insumo: insumo.codigo_insumo,
        lote_insumo: insumo.lote_insumo,
        quantidade: Number(insumo.quantidade),
        unidade: insumo.unidade,
        lote: lote, // Usando a entidade completa em vez de apenas o ID
      } as DeepPartial<InsumoLote>)
    );

    return await this.insumoLoteRepo.save(novosInsumos);
  }

  removerInsumo = async (insumoId: number, requisitante: Requisitante): Promise<void> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const insumo = await this.insumoLoteRepo.findOne({
      where: { id: insumoId },
      relations: ["lote"],
    });

    if (!insumo) throw new AppError("Vínculo de insumo não encontrado.", 404);
    if (insumo.lote.status !== LoteStatus.EM_PRODUCAO) {
      throw new AppError("Não é possível remover insumos de um lote que já saiu de produção.", 400);
    }

    await this.insumoLoteRepo.remove(insumo);
  };

  listarInsumosPorLote = async (loteId: number, requisitante: Requisitante): Promise<InsumoLote[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    return await this.insumoLoteRepo.find({
      where: { lote: { id: loteId } },
      order: { nome_insumo: "ASC" },
    });
  };
}