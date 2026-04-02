import { AppDataSource } from "../config/AppDataSource.js";
import { Between, LessThanOrEqual, Like, MoreThanOrEqual, type Repository } from "typeorm";
import { Lote, LoteStatus, Turno } from "../entities/Lote.js";
import type { LoteDTO } from "../dto/loteDTO.js";
import { InsumoLote } from "../entities/InsumoLote.js";
import type { InsumoVinculoDTO } from "../dto/InsumoLoteDTO.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";

interface IFiltros {
  produto_id?: string;
  status?: LoteStatus;
  dataInicio?: Date | undefined;
  dataFim?: Date | undefined;
}

export interface IDashboardMetrics {
  produzidosHoje: number;
  unidadesHoje: number;
  taxaAprovacaoMes: number;
  aguardandoInspecao: number;
  ultimosLotes: Lote[];
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

  // gerarNumeroLote
  private gerarNumeroLote = async (dataInput: Date | string = new Date()) => {
    const data = typeof dataInput === 'string' ? new Date(dataInput) : dataInput;

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

  // createLote
  createLote = async (loteDTO: LoteDTO, requisitante: Requisitante) => {
    verificaPermissao(requisitante.perfil, [PerfilUsuario.OPERADOR]);

    const numeroGerado = await this.gerarNumeroLote(loteDTO.data_producao);
    const { observacoes, ...restDTO } = loteDTO;

    const novoLote = this.loteRepo.create({
      ...restDTO,
      ...(observacoes != null && { observacoes }),
      operador_id: { id: loteDTO.operador_id } as any,
      produto_id: { id: loteDTO.produto_id } as any,
      turno: loteDTO.turno as Turno,
      numero_lote: numeroGerado,
      status: LoteStatus.EM_PRODUCAO,
    });

    return await this.loteRepo.save(novoLote);
  }

  // vincularInsumos
  vincularInsumos = async (loteId: number, insumos: InsumoVinculoDTO[], requisitante: Requisitante) => {
    verificaPermissao(requisitante.perfil, [PerfilUsuario.OPERADOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) throw new Error("Lote não encontrado.");
    if (lote.status !== LoteStatus.EM_PRODUCAO) throw new Error("Só é possível vincular insumos a lotes em produção.");

    const codigosArray = insumos.map(i => i.codigo_insumo);
    const temDuplicatas = new Set(codigosArray).size !== codigosArray.length;
    if (temDuplicatas) throw new AppError("O formulário contém códigos de insumos duplicados.", 400);

    const { In } = await import("typeorm");
    const insumosExistentes = await this.insumoLoteRepo.find({
      where: { codigo_insumo: In(codigosArray) },
      relations: ['lote']
    });

    if (insumosExistentes.length > 0) {
      const codigosJaUsados = insumosExistentes.map(i => i.codigo_insumo).join(', ');
      throw new AppError(`Os seguintes insumos já foram utilizados em outros lotes: ${codigosJaUsados}`, 409);
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
  encerrarProducao = async (loteId: number, requisitante: Requisitante) => {
    verificaPermissao(requisitante.perfil, [PerfilUsuario.OPERADOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    if (lote.status !== LoteStatus.EM_PRODUCAO) {
      throw new Error(`Não é possível encerrar um lote com status: ${lote.status}`);
    }

    const contagemInsumos = await this.insumoLoteRepo.count({
      where: { lote: { id: loteId } }
    });

    if (contagemInsumos === 0) {
      throw new Error("Não é possível encerrar um lote sem insumos vinculados.");
    }

    lote.status = LoteStatus.AGUARDANDO_INSPECAO;
    lote.encerrado_em = new Date();

    return await this.loteRepo.save(lote);
  }

  // updateStatus
  updateStatus = async (loteId: number, novoStatus: LoteStatus, requisitante: Requisitante) => {
    verificaPermissao(requisitante.perfil, [PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });
    if (!lote) throw new Error("Lote não encontrado.");

    lote.status = novoStatus;

    return await this.loteRepo.save(lote);
  }

  // // // // //
  // Funções de Leitura
  // // // // //

  // getAllLotes
  getAllLotes = async (requisitante: Requisitante, filtros?: IFiltros) => {
    verificaPermissao(requisitante.perfil, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    if (filtros?.dataInicio && filtros?.dataFim && filtros.dataInicio > filtros.dataFim) {
      throw new Error("A data de início não pode ser posterior à data de fim.");
    }

    const where: any = {};

    if (filtros) {
      if (filtros.produto_id) {
        where.produto_id = { id: Like(`%${filtros.produto_id}%`) };
      }

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
      relations: ['operador_id', 'produto_id']
    });
  }

  // getLoteById
  getLoteById = async (loteId: number, requisitante: Requisitante) => {
    verificaPermissao(requisitante.perfil, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const lote = await this.loteRepo.findOne({
      where: { id: loteId },
      relations: ['operador_id', 'produto_id', 'insumos', 'inspecao', 'inspecao.inspetor']
    });

    if (!lote) throw new Error("Lote não encontrado.");

    return lote;
  }
}