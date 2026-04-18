import { ILike, type Repository } from "typeorm";
import { AppDataSource } from "../config/AppDataSource.js";
import { InsumoEstoque, Turno } from "../entities/InsumoEstoque.js";
import { MateriaPrima } from "../entities/MateriaPrima.js";
import { PerfilUsuario, Usuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import type { CriarInsumoEstoqueDTO } from "../dto/insumoEstoque.dto.js";

export class InsumoEstoqueService {
  private repo: Repository<InsumoEstoque>;
  private mpRepo: Repository<MateriaPrima>;
  private usuarioRepo: Repository<Usuario>;

  constructor() {
    this.repo = AppDataSource.getRepository(InsumoEstoque);
    this.mpRepo = AppDataSource.getRepository(MateriaPrima);
    this.usuarioRepo = AppDataSource.getRepository(Usuario);
  }

  /** Gera número de lote interno sequencial (ex: INS-20260416-001) */
  private async gerarNumeroLote(): Promise<string> {
    const hoje = new Date();
    const ano = hoje.getUTCFullYear();
    const mes = (hoje.getUTCMonth() + 1).toString().padStart(2, "0");
    const dia = hoje.getUTCDate().toString().padStart(2, "0");

    const prefixo = `INS-${ano}${mes}${dia}-`;

    const contagem = await this.repo.count({
      where: { numero_lote_interno: ILike(`${prefixo}%`) },
    });

    const sequencial = (contagem + 1).toString().padStart(3, "0");
    return `${prefixo}${sequencial}`;
  }

  criar = async (dto: CriarInsumoEstoqueDTO, requisitante: Requisitante): Promise<InsumoEstoque> => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR]);

    const materiaPrima = await this.mpRepo.findOneBy({ id: dto.materia_prima_id });
    if (!materiaPrima) throw new AppError("Matéria-prima não encontrada.", 404);

    if (materiaPrima.unidade_medida === "UN" && !Number.isInteger(dto.quantidade_inicial)) {
      throw new AppError("A quantidade para unidade 'UN' não pode ser fracionada.", 400);
    }

    const operador = await this.usuarioRepo.findOneBy({ id: requisitante.id });
    if (!operador) throw new AppError("Operador não encontrado.", 404);

    const numeroLote = await this.gerarNumeroLote();

    const entidade = this.repo.create({
      materiaPrima,
      numero_lote_fornecedor: dto.numero_lote_fornecedor || "",
      numero_lote_interno: numeroLote,
      quantidade_inicial: dto.quantidade_inicial,
      quantidade_atual: dto.quantidade_inicial,
      fornecedor: dto.fornecedor,
      codigo_interno: dto.codigo_interno || "",
      turno: dto.turno as Turno,
      operador,
      data_validade: dto.data_validade ?? null,
      observacoes: dto.observacoes || "",
    });

    return this.repo.save(entidade);
  };

  listar = async (requisitante: Requisitante): Promise<InsumoEstoque[]> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    return this.repo.find({
      relations: ["materiaPrima", "operador"],
      order: { recebido_em: "DESC" },
    });
  };

  buscarPorId = async (id: number, requisitante: Requisitante): Promise<InsumoEstoque> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.INSPETOR,
      PerfilUsuario.GESTOR,
    ]);

    const insumo = await this.repo.findOne({
      where: { id },
      relations: ["materiaPrima", "operador"],
    });

    if (!insumo) throw new AppError("Lote de insumo não encontrado.", 404);
    return insumo;
  };

  /** Lista insumos em estoque (quantidade_atual > 0 e ativo) filtrados por matéria-prima */
  listarDisponiveis = async (
    materiaPrimaIds: number[],
    requisitante: Requisitante
  ): Promise<InsumoEstoque[]> => {
    verificaPermissao(requisitante, [
      PerfilUsuario.OPERADOR,
      PerfilUsuario.GESTOR,
    ]);

    if (materiaPrimaIds.length === 0) return [];

    return this.repo
      .createQueryBuilder("ie")
      .leftJoinAndSelect("ie.materiaPrima", "mp")
      .leftJoinAndSelect("ie.operador", "op")
      .where("mp.id IN (:...ids)", { ids: materiaPrimaIds })
      .andWhere("ie.quantidade_atual > 0")
      .andWhere("ie.ativo = true")
      .orderBy("mp.nome", "ASC")
      .addOrderBy("ie.recebido_em", "DESC")
      .getMany();
  };
}
