import { AppDataSource } from "../config/AppDataSource.js";
import { Between, type DeepPartial, In, LessThanOrEqual, MoreThanOrEqual, type Repository } from "typeorm";
import { Lote, LoteStatus, Turno } from "../entities/Lote.js";
import type { LoteDTO, VincularInsumosDTO } from "../dto/lote.dto.js";
import { InsumoLote } from "../entities/InsumoLote.js";
import type { InsumoVinculoDTO } from "../dto/InsumoLoteDTO.js";
import { PerfilUsuario, Usuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import { Produto } from "../entities/Produto.js";

interface IFiltros {
  produto_id?: string;
  status?: LoteStatus;
  dataInicio?: Date | undefined;
  dataFim?: Date | undefined;
}

export class LoteService {
  private loteRepo: Repository<Lote>;
  private insumoLoteRepo: Repository<InsumoLote>;
  private produtoRepo: Repository<Produto>;
  private usuarioRepo: Repository<Usuario>;

  constructor() {
    this.loteRepo = AppDataSource.getRepository(Lote);
    this.insumoLoteRepo = AppDataSource.getRepository(InsumoLote);
    this.produtoRepo = AppDataSource.getRepository(Produto);
    this.usuarioRepo = AppDataSource.getRepository(Usuario);
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
  createLote = async (loteDTO: LoteDTO, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const numeroGerado = await this.gerarNumeroLote(loteDTO.data_producao);

    const produto = await this.produtoRepo.findOneBy({ id: Number(loteDTO.produto) });
    if (!produto) throw new AppError("Produto não encontrado.", 404);

    const operador = await this.usuarioRepo.findOneBy({ id: Number(loteDTO.operador) });
    if (!operador) throw new AppError("Operador não encontrado.", 404);

    const novoLote = this.loteRepo.create({
      ...loteDTO,
      numero_lote: numeroGerado,
      produto: produto,
      turno: loteDTO.turno as Turno,
      operador: operador,
      status: LoteStatus.EM_PRODUCAO,
      observacoes: loteDTO.observacoes ?? ""
    });

    return await this.loteRepo.save(novoLote);
  }

  // vincularInsumos
  vincularInsumos = async (loteId: number, insumos: VincularInsumosDTO, requisitante: Requisitante): Promise<InsumoLote[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) throw new AppError("Lote não encontrado.", 404);
    if (lote.status !== LoteStatus.EM_PRODUCAO) throw new AppError("Só é possível vincular insumos a lotes em produção.", 400);

    // Remove códigos vazios e cria um array com os códigos
    const codigosArray = insumos.map(i => i.codigo_insumo).filter((c): c is string => !!c); // !! remove valores falsos (null, undefined, "", 0, false)
    const temDuplicatas = new Set(codigosArray).size !== codigosArray.length;

    if (temDuplicatas) throw new AppError("O formulário contém códigos de insumos duplicados.", 400);

    const insumosUsados = await this.insumoLoteRepo.find({
      where: {
        codigo_insumo: In(codigosArray)
      }
    })

    if (insumosUsados.length > 0) {
      const codigosJaUsados = insumosUsados.map((i) => i.codigo_insumo).join(', ');

      throw new AppError(`Os seguintes insumos já foram utilizados ${codigosJaUsados}`, 409);
    }

    const novosInsumos = insumos.map((insumo) =>
      this.insumoLoteRepo.create({
        nome_insumo: insumo.nome_insumo,
        codigo_insumo: insumo.codigo_insumo,
        lote_insumo: insumo.lote_insumo,
        quantidade: insumo.quantidade,
        unidade: insumo.unidade,
        lote: { id: lote.id }
      } as DeepPartial<InsumoLote>)
    )

    return await this.insumoLoteRepo.save(novosInsumos);
  }

  // encerrarProducao
  encerrarProducao = async (loteId: number, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) {
      throw new AppError("Lote não encontrado.");
    }

    if (lote.status !== LoteStatus.EM_PRODUCAO) {
      throw new AppError(`Não é possível encerrar um lote com status: ${lote.status}`);
    }

    const contagemInsumos = await this.insumoLoteRepo.count({
      where: { lote: { id: loteId } }
    });

    if (contagemInsumos === 0) {
      throw new AppError("Não é possível encerrar um lote sem insumos vinculados.");
    }

    lote.status = LoteStatus.AGUARDANDO_INSPECAO;
    lote.encerrado_em = new Date();

    return await this.loteRepo.save(lote);
  }

  // updateStatus
  updateStatus = async (loteId: number, novoStatus: LoteStatus, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });
    if (!lote) throw new AppError("Lote não encontrado.");

    lote.status = novoStatus;

    return await this.loteRepo.save(lote);
  }

  // // // // //
  // Funções de Leitura
  // // // // //

  // getAllLotes
  getAllLotes = async (requisitante: Requisitante, filtros?: IFiltros): Promise<Lote[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    if (filtros?.dataInicio && filtros?.dataFim && filtros.dataInicio > filtros.dataFim) {
      throw new AppError("A data de início não pode ser posterior à data de fim.");
    }

    const where: any = {};

    if (filtros) {
      if (filtros.produto_id) {
        const idNumerico = Number(filtros.produto_id);

        if (isNaN(idNumerico)) throw new AppError("Produto inválido. ID deve ser um número.", 400);

        where.produto = { id: idNumerico };
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
      relations: ['operador', 'produto']
    });
  }

  // getLoteById
  getLoteById = async (loteId: number, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const lote = await this.loteRepo.findOne({
      where: { id: loteId },
      relations: ['operador', 'produto', 'insumos', 'inspecao', 'inspecao.inspetor']
    });

    if (!lote) throw new AppError("Lote não encontrado.");

    return lote;
  }
}