import { AppDataSource } from "../config/AppDataSource.js";
import { type Repository, Like } from "typeorm";
import { Produto } from "../entities/Produto.js";
import type { CriarProdutoDTO, AtualizarProdutoDTO } from "../dto/ProdutoDTO.js";

export class ProdutoService {
  private produtoRepo: Repository<Produto>;

  constructor() {
    this.produtoRepo = AppDataSource.getRepository(Produto);
  }

  // createProduto
  async createProduto(produtoDTO: CriarProdutoDTO) {
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
  async getAllProdutos(filtros?: { search?: string, ativo?: boolean }) {
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
  async getProdutoById(id: string) {
    const produto = await this.produtoRepo.findOneBy({ id });

    if (!produto) throw new Error("Produto não encontrado.");

    return produto;
  }

  // updateProduto
  async updateProduto(id: string, produtoDTO: AtualizarProdutoDTO) {
    const produto = await this.getProdutoById(id);

    if (produtoDTO.codigo && produtoDTO.codigo !== produto.codigo) {
      const existeCodigo = await this.produtoRepo.findOneBy({ codigo: produtoDTO.codigo });
      if (existeCodigo) throw new Error("Já existe um produto com este código.");
    }

    Object.assign(produto, produtoDTO);

    return await this.produtoRepo.save(produto);
  }

  // desativarProduto
  async desativarProduto(id: string) {
    const produto = await this.getProdutoById(id);

    produto.ativo = false;
    return await this.produtoRepo.save(produto);
  }
}