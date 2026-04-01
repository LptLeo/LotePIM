import { AppDataSource } from "../config/AppDataSource.js";
import { type Repository, Like } from "typeorm";
import { Produto } from "../entities/Produto.js";
import type { CriarProdutoDTO, AtualizarProdutoDTO } from "../dto/ProdutoDTO.js";
import { PerfilUsuario } from "../entities/Usuario.js";
import { AppError } from "../errors/AppError.js";

export class ProdutoService {
  private produtoRepo: Repository<Produto>;

  private verificaPermissao(perfil: PerfilUsuario, permitidos: PerfilUsuario[]) {
    if (!permitidos.includes(perfil)) {
      throw new AppError(`Acesso negado: apenas usuários com perfil ${permitidos.join(", ")} podem realizar esta operação.`, 403);
    }
  }

  constructor() {
    this.produtoRepo = AppDataSource.getRepository(Produto);
  }

  // createProduto
  createProduto = async (produtoDTO: CriarProdutoDTO, requisitante: { id: number, perfil: PerfilUsuario }) => {
    this.verificaPermissao(requisitante.perfil, [PerfilUsuario.GESTOR]);

    const existeCodigo = await this.produtoRepo.findOneBy({ codigo: produtoDTO.codigo });
    if (existeCodigo) {
      throw new Error("Já existe um produto com este código.");
    }

    const novoProduto = this.produtoRepo.create({
      ...produtoDTO,
      ativo: produtoDTO.ativo ?? true,
      descricao: produtoDTO.descricao || ""
    });

    return await this.produtoRepo.save(novoProduto);
  }

  // getAllProdutos
  getAllProdutos = async (requisitante: { id: number, perfil: PerfilUsuario }, filtros?: { search?: string, ativo?: boolean }) => {
    this.verificaPermissao(requisitante.perfil, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

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
  getProdutoById = async (id: number, requisitante: { id: number, perfil: PerfilUsuario }) => {
    this.verificaPermissao(requisitante.perfil, [PerfilUsuario.OPERADOR, PerfilUsuario.GESTOR]);

    const produto = await this.produtoRepo.findOneBy({ id });

    if (!produto) throw new Error("Produto não encontrado.");

    return produto;
  }

  // updateProduto
  updateProduto = async (id: number, produtoDTO: AtualizarProdutoDTO, requisitante: { id: number, perfil: PerfilUsuario }) => {
    this.verificaPermissao(requisitante.perfil, [PerfilUsuario.GESTOR]);

    const produto = await this.getProdutoById(id, requisitante);

    if (produtoDTO.codigo && produtoDTO.codigo !== produto.codigo) {
      const existeCodigo = await this.produtoRepo.findOneBy({ codigo: produtoDTO.codigo });
      if (existeCodigo) throw new Error("Já existe um produto com este código.");
    }

    Object.assign(produto, produtoDTO);

    return await this.produtoRepo.save(produto);
  }

  // desativarProduto
  desativarProduto = async (id: number, requisitante: { id: number, perfil: PerfilUsuario }) => {
    this.verificaPermissao(requisitante.perfil, [PerfilUsuario.GESTOR]);

    const produto = await this.getProdutoById(id, requisitante);

    produto.ativo = false;
    return await this.produtoRepo.save(produto);
  }
}