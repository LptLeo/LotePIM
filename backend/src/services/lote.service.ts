import { AppDataSource } from "../config/AppDataSource.js";
import { Between, ILike, LessThanOrEqual, MoreThanOrEqual, type Repository } from "typeorm";
import { Lote, LoteStatus, Turno } from "../entities/Lote.js";
import type { LoteDTO } from "../dto/lote.dto.js";
import { InsumoLote } from "../entities/InsumoLote.js";
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

export interface SugestaoItem {
  tipo: 'lote' | 'produto';
  id: number | null;
  label: string;
  sublabel: string;
  status?: string;
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

    // Usar UTC garante que '2026-04-12' não vire '2026-04-11' por causa do fuso horário
    const ano = data.getUTCFullYear().toString();
    const mes = (data.getUTCMonth() + 1).toString().padStart(2, '0');
    const dia = data.getUTCDate().toString().padStart(2, '0');
    
    const prefixo = `LOTE-${ano}${mes}${dia}-`;

    const totalMesmaData = await this.loteRepo.count({
      where: {
        numero_lote: ILike(`${prefixo}%`)
      }
    });

    const sequencial = (totalMesmaData + 1).toString().padStart(3, '0');
    const novoNumeroLote = `${prefixo}${sequencial}`;

    return novoNumeroLote;
  }

  // createLote
  createLote = async (loteDTO: LoteDTO, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const numeroGerado = await this.gerarNumeroLote(loteDTO.data_producao);

    const produto = await this.produtoRepo.findOneBy({ id: loteDTO.produto });
    if (!produto) throw new AppError("Produto não encontrado.", 404);

    const operador = await this.usuarioRepo.findOneBy({ id: loteDTO.operador });
    if (!operador) throw new AppError("Operador não encontrado.", 404);

    const novoLote = this.loteRepo.create({
      ...loteDTO,
      numero_lote: numeroGerado,
      produto,
      turno: loteDTO.turno as Turno,
      operador,
      status: LoteStatus.EM_PRODUCAO,
      observacoes: loteDTO.observacoes ?? "",
    });

    return await this.loteRepo.save(novoLote);
  }

  // encerrarProducao
  encerrarProducao = async (loteId: number, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });

    if (!lote) throw new AppError("Lote não encontrado.", 404);

    if (lote.status !== LoteStatus.EM_PRODUCAO) throw new AppError(`Não é possível encerrar um lote com status: ${lote.status}`, 400);

    const contagemInsumos = await this.insumoLoteRepo.count({
      where: { lote: { id: loteId } }
    });

    if (contagemInsumos === 0) throw new AppError("Não é possível encerrar um lote sem insumos vinculados.", 400);

    lote.status = LoteStatus.AGUARDANDO_INSPECAO;
    lote.encerrado_em = new Date();

    return await this.loteRepo.save(lote);
  }

  // updateStatus
  updateStatus = async (loteId: number, novoStatus: LoteStatus, requisitante: Requisitante): Promise<Lote> => {
    verificaPermissao(requisitante, [PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const lote = await this.loteRepo.findOneBy({ id: loteId });
    if (!lote) throw new AppError("Lote não encontrado.", 404);

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
      throw new AppError("A data de início não pode ser posterior à data de fim.", 400);
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

    if (!lote) throw new AppError("Lote não encontrado.", 404);

    return lote;
  }

  // buscarSugestoes — busca parcial para autocomplete do header
  buscarSugestoes = async (q: string, requisitante: Requisitante): Promise<SugestaoItem[]> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.INSPETOR, PerfilUsuario.GESTOR]);

    const termoTrimado = q?.trim();
    if (!termoTrimado || termoTrimado.length < 2) return [];

    const termo = `%${termoTrimado}%`;

    const lotes = await this.loteRepo.find({
      where: [
        { numero_lote: ILike(termo) },
        { produto: { nome: ILike(termo) } },
      ],
      relations: ['produto'],
      order: { aberto_em: 'DESC' },
      take: 15,
    });

    const sugestoes: SugestaoItem[] = [];
    const produtosAgrupados = new Map<string, number>();

    for (const lote of lotes) {
      const numeroBate = lote.numero_lote.toLowerCase().includes(termoTrimado.toLowerCase());

      if (numeroBate) {
        sugestoes.push({
          tipo: 'lote',
          id: lote.id,
          label: lote.numero_lote,
          sublabel: lote.produto.nome,
          status: lote.status,
        });
      } else {
        const nome = lote.produto.nome;
        produtosAgrupados.set(nome, (produtosAgrupados.get(nome) ?? 0) + 1);
      }
    }

    for (const [nome, count] of produtosAgrupados) {
      sugestoes.push({
        tipo: 'produto',
        id: null,
        label: nome,
        sublabel: `${count} lote${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`,
      });
    }

    return sugestoes;
  }
}