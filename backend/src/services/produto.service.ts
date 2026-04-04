import { AppDataSource } from "../config/AppDataSource.js";
import { type Repository, Like } from "typeorm";
import { Produto } from "../entities/Produto.js";
import type { CriarProdutoDTO, AtualizarProdutoDTO } from "../dto/Produto.dto.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { verificaPermissao, type Requisitante } from "../utils/auth.utils.js";
import { AppError } from "../errors/AppError.js";

export class ProdutoService {
  private produtoRepo: Repository<Produto>;

  constructor() {
    this.produtoRepo = AppDataSource.getRepository(Produto);
  }

  // createProduto
  createProduto = async (produtoDTO: CriarProdutoDTO, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const existeCodigo = await this.produtoRepo.findOneBy({ codigo: produtoDTO.codigo });
    if (existeCodigo) throw new AppError("Já existe um produto com este código.", 409);

    const novoProduto = this.produtoRepo.create({
      ...produtoDTO,
      ativo: produtoDTO.ativo ? produtoDTO.ativo : true,
      descricao: produtoDTO.descricao || ""
    });

    return await this.produtoRepo.save(novoProduto);
  }

  // getAllProdutos
  getAllProdutos = async (requisitante: Requisitante, filtros?: { search?: string, ativo?: boolean }) => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const where: any = [];

    if (filtros?.search) {
      const searchLike = Like(`%${filtros.search}%`);
      where.push(
        { nome: searchLike, ...(filtros.ativo !== undefined && { ativo: filtros.ativo }) },
        { codigo: searchLike, ...(filtros.ativo !== undefined && { ativo: filtros.ativo }) }
      );
    } else if (filtros?.ativo !== undefined) {
      where.push({ ativo: filtros.ativo });
    }

    return await this.produtoRepo.find({
      where: where.length > 0 ? where : {},
      order: { nome: "ASC" }
    });
  }

  // getProdutoById
  getProdutoById = async (id: number, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const produto = await this.produtoRepo.findOneBy({ id });

    if (!produto) throw new AppError("Produto não encontrado.", 404);

    return produto;
  }

  // updateProduto
  updateProduto = async (id: number, produtoDTO: AtualizarProdutoDTO, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const produto = await this.getProdutoById(id, requisitante);

    if (produtoDTO.codigo && produtoDTO.codigo !== produto.codigo) {
      const existeCodigo = await this.produtoRepo.findOneBy({ codigo: produtoDTO.codigo });
      if (existeCodigo) throw new AppError("Já existe um produto com este código.", 409);
    }

    Object.assign(produto, produtoDTO);

    return await this.produtoRepo.save(produto);
  }

  // desativarProduto
  desativarProduto = async (id: number, requisitante: Requisitante) => {
    verificaPermissao(requisitante, [PerfilUsuario.GESTOR]);

    const produto = await this.getProdutoById(id, requisitante);

    produto.ativo = false;

    return await this.produtoRepo.save(produto);
  }
}